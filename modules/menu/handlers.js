const Data = require('../../lib/data')
const { authenticate } = require('../user/security')

const Menus = new Data('menus')

const handlers = {}

handlers.listMenus = async function ({ request, setStatusCode }) {
  const { headers } = request

  const authenticated = await authenticate(headers['auth-token'])
  if (!authenticated) {
    setStatusCode(403)
    return {
      error: 'Missing required `auth-token` in header, or `auth-token` is invalid'
    }
  }

  let menuIds = []

  try {
    menuIds = await Menus.list()
  } catch (err) {
    console.log('Could not read list of menus')
    setStatusCode(500)
  }

  try {
    const menus = await menuIds.map(id => Menus.read(id))
    return Promise.all(menus)
  } catch (err) {
    console.log('Could not read menu')
    setStatusCode(500)
  }
}

module.exports = handlers
