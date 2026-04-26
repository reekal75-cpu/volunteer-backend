'use strict';

const express = require('express');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');
const db      = require('../db/database');
const { uploadMiddleware }              = require('../config/multer');
const { volunteerValidationRules, handleValidationErrors } = require('../validators/volunteerValidator');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: ensure req.body is a proper nested object.
//
//  Multer v2 already parses bracket-notation field names
//  (e.g.  personal[fullName] → { personal: { fullName: '...' } })
//  so we just return the body as-is.  The helper is kept in place so
//  we can add pre-processing (sanitise, trim, etc.) here if needed later.
// ─────────────────────────────────────────────────────────────────────────────
function parseNestedBody(body) {
  return body || {};
}

// ─── Helper: relative path stored in DB (from project root) ──────────────────
function relativePath(absolutePath) {
  if (!absolutePath) return null;
  return path.relative(process.cwd(), absolutePath).replace(/\\/g, '/');
}

// ─── Helper: wrap sqlite3 run in a Promise ────────────────────────────────────
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// ─── Helper: normalise a checkbox/multi-select value to an array ──────────────
function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/submit-volunteer
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/submit-volunteer',
  uploadMiddleware,                   // 1. parse multipart & save files to disk
  // 2. Inflate bracket-notation keys BEFORE the validator runs
  (req, _res, next) => {
    req.body = parseNestedBody(req.body || {});
    next();
  },
  volunteerValidationRules,           // 3. express-validator rules (now sees nested body)
  handleValidationErrors,             // 4. short-circuit on validation failure
  async (req, res, next) => {
    try {
      const { body, uploadedFiles = {} } = req;
      const p    = body.personal    || {};
      const edu  = body.education   || {};
      const emp  = body.employment  || {};
      const exp  = body.experience  || {};
      const pref = body.preferences || {};
      const sk   = body.skills      || {};
      const lang = body.languages   || {};

      const volunteerId = uuidv4();
      const photoPath   = relativePath(uploadedFiles.photo?.path);
      const cvPath      = relativePath(uploadedFiles.cv?.path);

      // ── 1. Insert main volunteer record ─────────────────────────────────
      await dbRun(
        `INSERT INTO volunteers (
          id, full_name, gender, nationality, phone, email_fb,
          country, city, region, dob, marital_status, bio,
          edu_level, edu_specialization, edu_study_city,
          has_job, employer,
          prev_volunteer, courses_taken, courses_needed, past_activities,
          other_skills, attributes_other,
          volunteer_type, references_text, commitment_ack, photo_permission,
          photo_path, cv_path
        ) VALUES (
          ?,?,?,?,?,?,
          ?,?,?,?,?,?,
          ?,?,?,
          ?,?,
          ?,?,?,?,
          ?,?,
          ?,?,?,?,
          ?,?
        )`,
        [
          volunteerId,
          p.fullName?.trim(),
          p.gender,
          p.nationality?.trim(),
          p.phone?.trim(),
          p.email_fb?.trim()     || null,
          p.country?.trim(),
          p.city?.trim(),
          p.region?.trim(),
          p.dob,
          p.marital_status,
          p.bio?.trim(),
          edu.level,
          edu.specialization?.trim(),
          edu.study_city?.trim(),
          emp.has_job,
          emp.employer?.trim()   || null,
          exp.prev_volunteer,
          exp.courses_taken?.trim()    || null,
          exp.courses_needed?.trim()   || null,
          exp.past_activities?.trim()  || null,
          sk.other?.trim(),
          body.attributes_other?.trim() || null,
          pref.volunteer_type,
          pref.references?.trim(),
          pref.commitment_ack,
          pref.photo_permission,
          photoPath,
          cvPath,
        ]
      );

      // ── 2. Languages ─────────────────────────────────────────────────────
      const langKeys = ['arabic', 'english', 'turkish', 'german', 'russian'];
      for (const key of langKeys) {
        const level = lang[key];
        if (level) {
          await dbRun(
            `INSERT OR IGNORE INTO volunteer_languages (volunteer_id, language, level) VALUES (?,?,?)`,
            [volunteerId, key, level]
          );
        }
      }
      if (lang.other?.trim()) {
        await dbRun(
          `INSERT INTO volunteer_languages_other (volunteer_id, content) VALUES (?,?)`,
          [volunteerId, lang.other.trim()]
        );
      }

      // ── 3. Skills – accounting ───────────────────────────────────────────
      const accounting = sk.accounting || {};
      for (const [sw, level] of Object.entries(accounting)) {
        if (level) {
          await dbRun(
            `INSERT OR IGNORE INTO volunteer_skills_accounting (volunteer_id, software, level) VALUES (?,?,?)`,
            [volunteerId, sw, level]
          );
        }
      }

      // ── 4. Skills – graphic / video ──────────────────────────────────────
      const graphic = sk.graphic || {};
      for (const [sw, level] of Object.entries(graphic)) {
        if (level) {
          await dbRun(
            `INSERT OR IGNORE INTO volunteer_skills_graphic (volunteer_id, software, level) VALUES (?,?,?)`,
            [volunteerId, sw, level]
          );
        }
      }

      // ── 5. Skills – office ───────────────────────────────────────────────
      const office = sk.office || {};
      for (const [sw, level] of Object.entries(office)) {
        if (level) {
          await dbRun(
            `INSERT OR IGNORE INTO volunteer_skills_office (volunteer_id, software, level) VALUES (?,?,?)`,
            [volunteerId, sw, level]
          );
        }
      }

      // ── 6. Personal attributes (checkboxes) ──────────────────────────────
      for (const attr of toArray(body.attributes)) {
        await dbRun(
          `INSERT OR IGNORE INTO volunteer_attributes (volunteer_id, attribute) VALUES (?,?)`,
          [volunteerId, attr]
        );
      }

      // ── 7. Preferred volunteer fields ────────────────────────────────────
      for (const field of toArray(pref.volunteer_field)) {
        await dbRun(
          `INSERT OR IGNORE INTO volunteer_preferred_fields (volunteer_id, field) VALUES (?,?)`,
          [volunteerId, field]
        );
      }

      // ── 8. Preferred groups ──────────────────────────────────────────────
      for (const grp of toArray(pref.preferred_groups)) {
        await dbRun(
          `INSERT OR IGNORE INTO volunteer_preferred_groups (volunteer_id, grp) VALUES (?,?)`,
          [volunteerId, grp]
        );
      }

      // ── 9. Availability ──────────────────────────────────────────────────
      for (const slot of toArray(pref.availability)) {
        await dbRun(
          `INSERT OR IGNORE INTO volunteer_availability (volunteer_id, slot) VALUES (?,?)`,
          [volunteerId, slot]
        );
      }

      // ── Done ─────────────────────────────────────────────────────────────
      console.log(`✅ New volunteer registered: ${volunteerId} — ${p.fullName}`);

      return res.status(201).json({
        success: true,
        message: 'Volunteer registered successfully.',
        id:      volunteerId,
      });

    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/volunteers — list submissions ───────────────────────────────────
router.get('/volunteers', (_req, res, next) => {
  db.all(
    `SELECT id, full_name, gender, nationality, phone, country, city,
            edu_level, volunteer_type, submitted_at
     FROM volunteers ORDER BY submitted_at DESC LIMIT 100`,
    [],
    (err, rows) => {
      if (err) return next(err);
      res.json({ success: true, count: rows.length, data: rows });
    }
  );
});

// ─── GET /api/volunteers/:id — fetch one record with all sub-tables ───────────
router.get('/volunteers/:id', (req, res, next) => {
  const { id } = req.params;
  db.get(`SELECT * FROM volunteers WHERE id = ?`, [id], (err, row) => {
    if (err)  return next(err);
    if (!row) return res.status(404).json({ success: false, error: 'Volunteer not found.' });

    const sub = (table, key) =>
      new Promise((resolve, reject) => {
        db.all(`SELECT * FROM ${table} WHERE volunteer_id = ?`, [id], (e, rows) => {
          if (e) reject(e);
          else resolve({ [key]: rows });
        });
      });

    Promise.all([
      sub('volunteer_languages',         'languages'),
      sub('volunteer_languages_other',   'languages_other'),
      sub('volunteer_skills_accounting', 'skills_accounting'),
      sub('volunteer_skills_graphic',    'skills_graphic'),
      sub('volunteer_skills_office',     'skills_office'),
      sub('volunteer_attributes',        'attributes'),
      sub('volunteer_preferred_fields',  'preferred_fields'),
      sub('volunteer_preferred_groups',  'preferred_groups'),
      sub('volunteer_availability',      'availability'),
    ])
      .then((results) => {
        const merged = Object.assign({}, row, ...results);
        res.json({ success: true, data: merged });
      })
      .catch(next);
  });
});

module.exports = router;
