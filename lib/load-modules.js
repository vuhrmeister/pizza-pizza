const fs = require('fs')
const path = require('path')

const MODULES_DIR = path.join(__dirname, '/../modules/')

const registeredRoutes = {}

const registerRoutes = routes => {
  Object.entries(routes).forEach(([routeName, routeHandler]) => {
    if (!registeredRoutes.hasOwnProperty(routeName)) {
      registeredRoutes[routeName] = routeHandler
    }
  })
}

const modules = fs.readdirSync(MODULES_DIR)

modules.forEach(modName => {
  const modPath = path.join(MODULES_DIR, modName)
  try {
    const mod = require(modPath)
    if (mod.routes) {
      registerRoutes(mod.routes)
    }
  } catch (err) {}
})

module.exports = {
  registeredRoutes
}
