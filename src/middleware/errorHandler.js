'use strict';

/**
 * Global Express error handler.
 * Must be registered LAST with app.use().
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Multer-specific errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error:   'File too large. Maximum allowed size is 5 MB.',
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error:   `Unexpected file field: "${err.field}". Only photo_upload and cv_upload are accepted.`,
    });
  }

  // Generic file filter rejection (thrown by our custom fileFilter)
  if (err.message && err.message.includes('Only')) {
    return res.status(415).json({
      success: false,
      error:   err.message,
    });
  }

  // Log server-side errors
  if (status >= 500) {
    console.error('❌ Unhandled error:', err);
  }

  res.status(status).json({
    success: false,
    error:   message,
  });
}

module.exports = errorHandler;
