'use strict';

const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024; // 5 MB

// ─── Helper: YYYY/MM/DD sub-directory inside a base folder ───────────────────
function datePath(baseDir) {
  const now  = new Date();
  const yyyy = String(now.getFullYear());
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const dd   = String(now.getDate()).padStart(2, '0');
  const dir  = path.join(baseDir, yyyy, mm, dd);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ─── Custom storage engine ────────────────────────────────────────────────────
// Routes each file to the correct dated sub-directory based on field name.
const customStorage = multer.diskStorage({
  destination(req, file, cb) {
    const base =
      file.fieldname === 'photo_upload'
        ? path.join(process.cwd(), 'uploads', 'photos')
        : path.join(process.cwd(), 'uploads', 'cvs');
    cb(null, datePath(base));
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

// ─── MIME whitelist per field ─────────────────────────────────────────────────
const PHOTO_MIMES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
]);
const CV_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function fileFilter(_req, file, cb) {
  if (file.fieldname === 'photo_upload') {
    if (!PHOTO_MIMES.has(file.mimetype)) {
      return cb(new Error('Photo must be JPEG, PNG, GIF, or WEBP.'));
    }
  } else if (file.fieldname === 'cv_upload') {
    if (!CV_MIMES.has(file.mimetype)) {
      return cb(new Error('CV must be a PDF, DOC, or DOCX file.'));
    }
  }
  cb(null, true);
}

// ─── Single multer instance — handles BOTH fields in one pass ─────────────────
const upload = multer({
  storage:    customStorage,
  limits:     { fileSize: MAX_FILE_SIZE },
  fileFilter,
}).fields([
  { name: 'photo_upload', maxCount: 1 },
  { name: 'cv_upload',    maxCount: 1 },
]);

/**
 * Express middleware wrapper.
 * After this runs:
 *   req.body          → all text fields (parsed by multer)
 *   req.uploadedFiles → { photo: <file|null>, cv: <file|null> }
 */
function uploadMiddleware(req, res, next) {
  upload(req, res, (err) => {
    if (err) return next(err);

    // Normalise the req.files map into a friendlier shape
    const files = req.files || {};
    req.uploadedFiles = {
      photo: (files.photo_upload && files.photo_upload[0]) || null,
      cv:    (files.cv_upload    && files.cv_upload[0])    || null,
    };

    next();
  });
}

module.exports = { uploadMiddleware };
