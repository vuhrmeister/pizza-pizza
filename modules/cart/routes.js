const handlers = require('./handlers')

const routes = {
  cart: {
    put: handlers.replaceItems
  }
}

module.exports = routes
