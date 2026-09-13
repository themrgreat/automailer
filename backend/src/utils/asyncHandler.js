// Express 4 doesn't forward rejected promises from async handlers to the error
// middleware on its own — wrap every async route with this so failures still
// get a response instead of hanging the request.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
