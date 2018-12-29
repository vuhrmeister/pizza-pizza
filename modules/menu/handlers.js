const { authenticate } = require('../user/security')
const menus = require('./fixtures')

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

  return menus
}

module.exports = handlers
