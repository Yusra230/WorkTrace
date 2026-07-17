class AppError extends Error {
  constructor(status, message, category = 'application_error') {
    super(message);
    this.status = status;
    this.category = category;
  }
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  const isMalformedJson = error && error.type === 'entity.parse.failed';
  const isTooLarge = error && error.type === 'entity.too.large';
  const status = isMalformedJson || isTooLarge ? 400 : (Number.isInteger(error.status) ? error.status : 500);
  const message = isMalformedJson
    ? 'Request body must contain valid JSON.'
    : (isTooLarge ? 'Request body is too large.' : (error instanceof AppError ? error.message : 'Internal server error.'));
  const category = error.category || (status >= 500 ? 'internal_error' : 'request_error');
  console.error(`[worktrace] ${category}`);
  res.status(status).json({ error: true, message });
}

module.exports = { AppError, asyncHandler, errorHandler };
