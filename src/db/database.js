'use strict';

const Database = require('sqlite3').Database;
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './data/volunteers.db';
const dbDir   = path.dirname(path.resolve(DB_PATH));

// Ensure the data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.resolve(DB_PATH), (err) => {
  if (err) {
    console.error('❌ Could not connect to SQLite database:', err.message);
    process.exit(1);
  }
  console.log(`✅ Connected to SQLite database at ${path.resolve(DB_PATH)}`);
});

// Enable WAL mode for better concurrent read performance
db.run('PRAGMA journal_mode=WAL;');
db.run('PRAGMA foreign_keys=ON;');

// ─── Schema ─────────────────────────────────────────────────────────────────

db.serialize(() => {

  // Main volunteers table
  db.run(`
    CREATE TABLE IF NOT EXISTS volunteers (
      id               TEXT PRIMARY KEY,
      submitted_at     DATETIME DEFAULT (datetime('now')),

      -- Personal
      full_name        TEXT NOT NULL,
      gender           TEXT NOT NULL CHECK(gender IN ('male','female')),
      nationality      TEXT NOT NULL,
      phone            TEXT NOT NULL,
      email_fb         TEXT,
      country          TEXT NOT NULL,
      city             TEXT NOT NULL,
      region           TEXT NOT NULL,
      dob              TEXT NOT NULL,
      marital_status   TEXT NOT NULL CHECK(marital_status IN ('single','married')),
      bio              TEXT NOT NULL,

      -- Education
      edu_level        TEXT NOT NULL CHECK(edu_level IN ('high_school','bachelor','master','phd','other')),
      edu_specialization TEXT NOT NULL,
      edu_study_city   TEXT NOT NULL,

      -- Employment
      has_job          TEXT NOT NULL CHECK(has_job IN ('yes','no')),
      employer         TEXT,

      -- Experience
      prev_volunteer   TEXT NOT NULL CHECK(prev_volunteer IN ('yes','no')),
      courses_taken    TEXT,
      courses_needed   TEXT,
      past_activities  TEXT,
      other_skills     TEXT NOT NULL,
      attributes_other TEXT,

      -- Preferences
      volunteer_type   TEXT NOT NULL CHECK(volunteer_type IN ('field','office','both')),
      references_text  TEXT NOT NULL,
      commitment_ack   TEXT NOT NULL CHECK(commitment_ack = 'ok'),
      photo_permission TEXT NOT NULL CHECK(photo_permission IN ('no_objection','objection','private_only')),

      -- Files (stored paths relative to uploads/)
      photo_path       TEXT,
      cv_path          TEXT
    );
  `);

  // Languages table (one row per volunteer per language)
  db.run(`
    CREATE TABLE IF NOT EXISTS volunteer_languages (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      volunteer_id TEXT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
      language     TEXT NOT NULL CHECK(language IN ('arabic','english','turkish','german','russian')),
      level        TEXT CHECK(level IN ('none','native','weak','average','good','very-good','excellent')),
      UNIQUE(volunteer_id, language)
    );
  `);

  // Computer skills – accounting software
  db.run(`
    CREATE TABLE IF NOT EXISTS volunteer_skills_accounting (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      volunteer_id TEXT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
      software     TEXT NOT NULL CHECK(software IN ('ameen','mizan','khazen','hakim','suhli')),
      level        TEXT CHECK(level IN ('none','weak','average','good','very-good','excellent')),
      UNIQUE(volunteer_id, software)
    );
  `);

  // Computer skills – graphic / video
  db.run(`
    CREATE TABLE IF NOT EXISTS volunteer_skills_graphic (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      volunteer_id TEXT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
      software     TEXT NOT NULL CHECK(software IN ('ps','ai','id','pr','ae','info','motion','corel','video')),
      level        TEXT CHECK(level IN ('none','weak','average','good','very-good','excellent')),
      UNIQUE(volunteer_id, software)
    );
  `);

  // Computer skills – office software
  db.run(`
    CREATE TABLE IF NOT EXISTS volunteer_skills_office (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      volunteer_id TEXT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
      software     TEXT NOT NULL CHECK(software IN ('word','excel','ppt','outlook','access','pdf','picman','kobo','search')),
      level        TEXT CHECK(level IN ('none','weak','average','good','very-good','excellent')),
      UNIQUE(volunteer_id, software)
    );
  `);

  // Personal attributes (checkboxes – multi-value)
  db.run(`
    CREATE TABLE IF NOT EXISTS volunteer_attributes (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      volunteer_id TEXT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
      attribute    TEXT NOT NULL,
      UNIQUE(volunteer_id, attribute)
    );
  `);

  // Preferred volunteer fields (multi-value checkboxes)
  db.run(`
    CREATE TABLE IF NOT EXISTS volunteer_preferred_fields (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      volunteer_id TEXT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
      field        TEXT NOT NULL,
      UNIQUE(volunteer_id, field)
    );
  `);

  // Preferred groups (multi-value checkboxes)
  db.run(`
    CREATE TABLE IF NOT EXISTS volunteer_preferred_groups (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      volunteer_id TEXT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
      grp          TEXT NOT NULL,
      UNIQUE(volunteer_id, grp)
    );
  `);

  // Availability (multi-value checkboxes)
  db.run(`
    CREATE TABLE IF NOT EXISTS volunteer_availability (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      volunteer_id TEXT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
      slot         TEXT NOT NULL,
      UNIQUE(volunteer_id, slot)
    );
  `);

  // Other languages free-text
  db.run(`
    CREATE TABLE IF NOT EXISTS volunteer_languages_other (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      volunteer_id TEXT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
      content      TEXT
    );
  `);

  console.log('✅ Database schema initialized.');
});

module.exports = db;
