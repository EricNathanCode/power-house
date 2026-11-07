/* Errors the API sends back on purpose. Every error has the same JSON shape:
   { "error": { "code": "OUT_OF_STOCK", "message": "Only 3 left of ...", ...extra } }
   The website shows `message` to the person; code is for the program. */
class ApiError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

const bad = (message, extra) => new ApiError(400, "BAD_INPUT", message, extra);
const notFound = (message = "Not found.") => new ApiError(404, "NOT_FOUND", message);
const conflict = (code, message, extra) => new ApiError(409, code, message, extra);

/* wraps an async route so its errors reach the error handler (no try/catch in every route) */
const route = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* last middleware: turns any error into the JSON shape above. Never shows stack traces to users. */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, ...err.extra } });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: { code: "BAD_JSON", message: "The request body is not valid JSON." } });
  }
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ error: { code: "SERVER_ERROR", message: "Something went wrong on our side. Please try again." } });
}

module.exports = { ApiError, bad, notFound, conflict, route, errorHandler };
