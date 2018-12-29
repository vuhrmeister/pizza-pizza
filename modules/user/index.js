const routes = require('./routes')

function startup (registerRoutes) {
  registerRoutes(routes)
}

module.exports = {
  startup
}
