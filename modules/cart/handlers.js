const Data = require('../../lib/data')
const HandlerError = require('../../lib/handler-error')
const { ParamValidator } = require('../../lib/param-validator')
const { authenticate } = require('../user/security')

const Menus = new Data('menus')
const Carts = new Data('carts')
const Tokens = new Data('tokens')

const handlers = {}

handlers.replaceItems = async function ({ request, setStatusCode }) {
  const { headers, payload: cartItems } = request
  const authToken = headers['auth-token']

  const authenticated = await authenticate(authToken)
  if (!authenticated) {
    throw new HandlerError(403, 'Missing required `auth-token` in header, or `auth-token` is invalid')
  }

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new HandlerError(400, 'Payload must contain an array of menu items')
  }

  // Just as a security measure. Why should one add more than 100 items?!
  if (cartItems.length > 100) {
    throw new HandlerError(400, 'You may put at most 100 items on your cart')
  }

  let availableMenus

  try {
    availableMenus = await Menus.list()
  } catch (err) {
    throw new HandlerError(500)
  }

  const itemsAreValid = cartItems.every(item => {
    const validator = new ParamValidator(item)
    validator.validate('menuId', {
      type: 'string',
      required: true,
      // TODO Proper error message to the user would be useful
      validator: menuId => availableMenus.indexOf(menuId) > -1
    })
    validator.validate('quantity', {
      type: 'number',
      validator: quantity => quantity > 0
    })
    return validator.isValid()
  })

  if (!itemsAreValid) {
    throw new HandlerError(400, 'One or more cart items are malformed')
  }

  // Clean all items so they only contain valid keys
  const cleanedCartItems = cartItems.map(item => ({
    menuId: item.menuId,
    quantity: item.quantity || 1
  }))

  const cartObject = {
    items: cleanedCartItems
  }

  let userId

  try {
    const token = await Tokens.read(authToken)
    userId = token.email
  } catch (err) {
    throw new HandlerError(500)
  }

  let cartJustCreated = false

  try {
    await Carts.read(userId)
  } catch (err) {
    if (err.code === 'ENOENT') {
      try {
        await Carts.create(userId, cartObject)
        cartJustCreated = true
      } catch (err) {
        throw new HandlerError(500)
      }
    } else {
      throw new HandlerError(500)
    }
  }

  if (!cartJustCreated) {
    try {
      await Carts.update(userId, cartObject)
    } catch (err) {
      throw new HandlerError(500)
    }
  }
}

module.exports = handlers
