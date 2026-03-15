/**
 * Global error handler middleware.
 * Catches any error passed via next(err) in route handlers.
 */
function errorHandler(err, req, res, next) {
  console.error("[Unhandled Error]", err.stack || err.message);

  const statusCode = err.statusCode || err.status || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "An unexpected error occurred"
      : err.message || "Internal Server Error";

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}

/**
 * 404 handler for unknown routes.
 */
function notFound(req, res) {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = { errorHandler, notFound };
