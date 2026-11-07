/* Who is calling? (D9)
   After a login the server remembers the person in a session (a signed, httpOnly cookie; the session
   itself is stored in the database). Customer and staff logins are separate. */
const { ApiError } = require("./errors");

function requireCustomer(req, res, next) {
  if (!req.session.customerId) return next(new ApiError(401, "LOGIN_REQUIRED", "Please log in first."));
  next();
}

function requireStaff(req, res, next) {
  if (!req.session.staff) return next(new ApiError(401, "STAFF_ONLY", "Please log in to the Staff Portal first."));
  next();
}

/* new session id after a login, so an old cookie can't be reused (session fixation) */
const regenerate = (req) => new Promise((resolve, reject) => {
  const keep = { customerId: req.session.customerId, staff: req.session.staff };
  req.session.regenerate((err) => {
    if (err) return reject(err);
    Object.assign(req.session, keep);
    resolve();
  });
});

module.exports = { requireCustomer, requireStaff, regenerate };
