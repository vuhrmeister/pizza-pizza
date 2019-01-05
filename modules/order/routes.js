const handlers = require('./handlers')

const routes = {
  orders: {
    post: handlers.placeOrder
  }
}

module.exports = routes
