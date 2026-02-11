const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const errorLogPath = path.join(logsDir, 'error.log');

const logErrorToFile = (err, req, statusCode) => {
  const timestamp = new Date().toISOString();
  const route = req.originalUrl || req.url;
  const message = err && err.message ? err.message : 'Unknown error';
  const stack = err && err.stack ? err.stack : '';
  const entry = `${timestamp} | ${req.method} ${route} | ${statusCode} | ${message}\n${stack}\n`;

  fs.appendFile(errorLogPath, entry, () => {});
};

const notFoundHandler = (req, res, next) => {
  const err = new Error('Not Found');
  err.statusCode = 404;
  next(err);
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const publicMessage = err.publicMessage || (statusCode === 404 ? 'Not Found' : 'Server error');

  logErrorToFile(err, req, statusCode);
  res.status(statusCode).json({ success: false, error: publicMessage });
};

module.exports = { notFoundHandler, errorHandler };
