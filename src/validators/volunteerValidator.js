'use strict';

const { body, validationResult } = require('express-validator');

// ─── Allowed enum values (mirroring the HTML form exactly) ───────────────────
const SKILL_LEVELS        = ['none', 'weak', 'average', 'good', 'very-good', 'excellent'];
const LANGUAGE_LEVELS     = ['none', 'native', 'weak', 'average', 'good', 'very-good', 'excellent'];
const ACCOUNTING_KEYS     = ['ameen', 'mizan', 'khazen', 'hakim', 'suhli'];
const GRAPHIC_KEYS        = ['ps', 'ai', 'id', 'pr', 'ae', 'info', 'motion', 'corel', 'video'];
const OFFICE_KEYS         = ['word', 'excel', 'ppt', 'outlook', 'access', 'pdf', 'picman', 'kobo', 'search'];
const LANGUAGE_KEYS       = ['arabic', 'english', 'turkish', 'german', 'russian'];
const VOLUNTEER_FIELDS    = [
  'water_sanitation', 'education_child', 'food_livelihoods',
  'capacity_building', 'protection', 'shelter', 'media', 'other',
];
const PREFERRED_GROUPS    = ['children', 'orphans', 'elderly', 'women', 'youth'];
const AVAILABILITY_SLOTS  = ['on_call', 'daily', 'morning_part', 'evening_part', 'specific_days', 'not_available'];
const VALID_ATTRIBUTES    = [
  'organized', 'communication', 'humanitarian_standards', 'team_management',
  'multi_tasking', 'local_knowledge', 'pm_humanitarian', 'ngos_experience',
  'admin_experience', 'analytical', 'learning', 'flexibility', 'leadership',
  'planning', 'problem_solving', 'team_player', 'independent', 'marketing',
  'negotiation', 'strategic_planning',
];

// ─── Helper: optional radio field ────────────────────────────────────────────
function optionalEnum(fieldPath, values) {
  return body(fieldPath)
    .optional({ nullable: true, checkFalsy: true })
    .isIn(values)
    .withMessage(`${fieldPath} must be one of: ${values.join(', ')}`);
}

// ─── Validation chain ─────────────────────────────────────────────────────────
const volunteerValidationRules = [

  // ── Personal ──────────────────────────────────────────────────────────────
  body('personal.fullName')
    .trim()
    .notEmpty().withMessage('Full name is required.')
    .isLength({ min: 2, max: 200 }).withMessage('Full name must be between 2 and 200 characters.'),

  body('personal.gender')
    .notEmpty().withMessage('Gender is required.')
    .isIn(['male', 'female']).withMessage('Gender must be "male" or "female".'),

  body('personal.nationality')
    .trim()
    .notEmpty().withMessage('Nationality is required.')
    .isLength({ max: 100 }).withMessage('Nationality must be under 100 characters.'),

  body('personal.phone')
    .trim()
    .notEmpty().withMessage('Phone number is required.')
    .matches(/^\+?[\d\s\-().]{7,25}$/).withMessage('Phone number format is invalid.'),

  body('personal.email_fb')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 300 }).withMessage('Email/Facebook field must be under 300 characters.'),

  body('personal.country')
    .trim()
    .notEmpty().withMessage('Country of residence is required.')
    .isLength({ max: 100 }).withMessage('Country must be under 100 characters.'),

  body('personal.city')
    .trim()
    .notEmpty().withMessage('City is required.')
    .isLength({ max: 100 }).withMessage('City must be under 100 characters.'),

  body('personal.region')
    .trim()
    .notEmpty().withMessage('Region is required.')
    .isLength({ max: 100 }).withMessage('Region must be under 100 characters.'),

  body('personal.dob')
    .notEmpty().withMessage('Date of birth is required.')
    .isDate({ format: 'YYYY-MM-DD' }).withMessage('Date of birth must be a valid date (YYYY-MM-DD).')
    .custom((value) => {
      const dob  = new Date(value);
      const now  = new Date();
      const age  = now.getFullYear() - dob.getFullYear();
      if (dob >= now) throw new Error('Date of birth must be in the past.');
      if (age < 15)   throw new Error('Volunteer must be at least 15 years old.');
      if (age > 100)  throw new Error('Please enter a valid date of birth.');
      return true;
    }),

  body('personal.marital_status')
    .notEmpty().withMessage('Marital status is required.')
    .isIn(['single', 'married']).withMessage('Marital status must be "single" or "married".'),

  body('personal.bio')
    .trim()
    .notEmpty().withMessage('A short bio is required.')
    .isLength({ min: 10, max: 2000 }).withMessage('Bio must be between 10 and 2000 characters.'),

  // ── Education ─────────────────────────────────────────────────────────────
  body('education.level')
    .notEmpty().withMessage('Education level is required.')
    .isIn(['high_school', 'bachelor', 'master', 'phd', 'other'])
    .withMessage('Invalid education level.'),

  body('education.specialization')
    .trim()
    .notEmpty().withMessage('Study specialization is required.')
    .isLength({ max: 200 }).withMessage('Specialization must be under 200 characters.'),

  body('education.study_city')
    .trim()
    .notEmpty().withMessage('Study city is required.')
    .isLength({ max: 100 }).withMessage('Study city must be under 100 characters.'),

  // ── Languages – radio table ────────────────────────────────────────────────
  ...LANGUAGE_KEYS.map((lang) =>
    optionalEnum(`languages.${lang}`, LANGUAGE_LEVELS)
  ),

  body('languages.other')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Other languages text must be under 500 characters.'),

  // ── Skills – accounting ───────────────────────────────────────────────────
  ...ACCOUNTING_KEYS.map((key) =>
    optionalEnum(`skills.accounting.${key}`, SKILL_LEVELS)
  ),

  // ── Skills – graphic / video ──────────────────────────────────────────────
  ...GRAPHIC_KEYS.map((key) =>
    optionalEnum(`skills.graphic.${key}`, SKILL_LEVELS)
  ),

  // ── Skills – office ───────────────────────────────────────────────────────
  ...OFFICE_KEYS.map((key) =>
    optionalEnum(`skills.office.${key}`, SKILL_LEVELS)
  ),

  body('skills.other')
    .trim()
    .notEmpty().withMessage('Other skills field is required (write "N/A" if none).')
    .isLength({ max: 1000 }).withMessage('Other skills must be under 1000 characters.'),

  // ── Employment ────────────────────────────────────────────────────────────
  body('employment.has_job')
    .notEmpty().withMessage('Please indicate whether you currently have a job.')
    .isIn(['yes', 'no']).withMessage('has_job must be "yes" or "no".'),

  body('employment.employer')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 }).withMessage('Employer name must be under 200 characters.')
    .custom((value, { req }) => {
      if (req.body?.employment?.has_job === 'yes' && !value) {
        throw new Error('Employer name is required when you have a job.');
      }
      return true;
    }),

  // ── Experience ────────────────────────────────────────────────────────────
  body('experience.prev_volunteer')
    .notEmpty().withMessage('Please indicate whether you have previous volunteering experience.')
    .isIn(['yes', 'no']).withMessage('prev_volunteer must be "yes" or "no".'),

  body('experience.courses_taken')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }),

  body('experience.courses_needed')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }),

  body('experience.past_activities')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }),

  // ── Attributes (checkboxes) ───────────────────────────────────────────────
  body('attributes')
    .optional()
    .custom((value) => {
      const arr = Array.isArray(value) ? value : [value];
      const invalid = arr.filter((v) => !VALID_ATTRIBUTES.includes(v));
      if (invalid.length) {
        throw new Error(`Invalid attribute(s): ${invalid.join(', ')}`);
      }
      return true;
    }),

  body('attributes_other')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }),

  // ── Preferences ───────────────────────────────────────────────────────────
  body('preferences.volunteer_type')
    .notEmpty().withMessage('Please choose office or field volunteering.')
    .isIn(['field', 'office', 'both']).withMessage('volunteer_type must be "field", "office", or "both".'),

  body('preferences.volunteer_field')
    .notEmpty().withMessage('Please select at least one volunteer field.')
    .custom((value) => {
      const arr = Array.isArray(value) ? value : [value];
      if (arr.length === 0) throw new Error('Please select at least one volunteer field.');
      const invalid = arr.filter((v) => !VOLUNTEER_FIELDS.includes(v));
      if (invalid.length) throw new Error(`Invalid volunteer field(s): ${invalid.join(', ')}`);
      return true;
    }),

  body('preferences.references')
    .trim()
    .notEmpty().withMessage('Please provide at least two references.')
    .isLength({ min: 5, max: 500 }).withMessage('References field must be between 5 and 500 characters.'),

  body('preferences.preferred_groups')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const arr = Array.isArray(value) ? value : [value];
      const invalid = arr.filter((v) => !PREFERRED_GROUPS.includes(v));
      if (invalid.length) throw new Error(`Invalid preferred group(s): ${invalid.join(', ')}`);
      return true;
    }),

  body('preferences.availability')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const arr = Array.isArray(value) ? value : [value];
      const invalid = arr.filter((v) => !AVAILABILITY_SLOTS.includes(v));
      if (invalid.length) throw new Error(`Invalid availability slot(s): ${invalid.join(', ')}`);
      return true;
    }),

  body('preferences.commitment_ack')
    .notEmpty().withMessage('You must acknowledge the commitment.')
    .equals('ok').withMessage('commitment_ack must be "ok".'),

  body('preferences.photo_permission')
    .notEmpty().withMessage('Please specify your photo permission preference.')
    .isIn(['no_objection', 'objection', 'private_only'])
    .withMessage('Invalid photo permission value.'),
];

// ─── Middleware that collects errors and returns 422 if any ──────────────────
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      errors: errors.array().map((e) => ({
        field:   e.param,
        message: e.msg,
      })),
    });
  }
  next();
}

module.exports = { volunteerValidationRules, handleValidationErrors };
