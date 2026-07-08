// Central error handler: log server-side, return a plain message the
// client can show to the user.
export function errorHandler(err, _req, res, _next) {
  console.error('[server]', err.message);
  res.status(err.status || 500).json({ error: err.message });
}
