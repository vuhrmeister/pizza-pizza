/**
 * Error class to be used in request handlers to return
 * an error containing the http status code and a message.
 */
class HandlerError extends Error {
  constructor (statusCode, message) {
    super(message)
    this.statusCode = statusCode
    Error.captureStackTrace(this, HandlerError)
  }
}

module.exports = HandlerError
