const Data = require('../../lib/data')
const HandlerError = require('../../lib/handler-error')
const { authenticate } = require('../user/security')

const Menus = new Data('menus')

const handlers = {}

handlers.listMenus = async function ({ request, setStatusCode }) {
  const { headers } = request

  const authenticated = await authenticate(headers['auth-token'])
  if (!authenticated) {
    throw new HandlerError(403, 'Missing required `auth-token` in header, or `auth-token` is invalid')
  }

  let menuIds = []

  try {
    menuIds = await Menus.list()
  } catch (err) {
    throw new HandlerError(500, 'Could not get list of menus')
  }

  try {
    const menus = menuIds.map(id => Menus.read(id))
    return Promise.all(menus)
  } catch (err) {
    throw new HandlerError(500, 'Could not get list of menus')
  }
}

module.exports = handlers
