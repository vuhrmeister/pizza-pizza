const handlers = require('./handlers')

const routes = {
  menus: {
    get: handlers.listMenus
  }
}

module.exports = routes
