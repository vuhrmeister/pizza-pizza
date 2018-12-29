const handlers = require('./handlers')

const routes = {
  login: {
    post: handlers.login
  },
  logout: {
    post: handlers.logout
  },
  users: {
    get: handlers.getUser,
    post: handlers.createUser,
    patch: handlers.updateUser,
    delete: handlers.deleteUser
  }
}

module.exports = routes
