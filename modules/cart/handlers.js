const Data = require('../../lib/data')
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
    setStatusCode(403)
    return {
      error: 'Missing required `auth-token` in header, or `auth-token` is invalid'
    }
  }

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    setStatusCode(400)
    return {
      error: 'Payload must contain an array of menu items'
    }
  }

  // Just as a security measure. Why should one add more than 100 items?!
  if (cartItems.length > 100) {
    setStatusCode(400)
    return {
      error: 'You may put at most 100 items on your cart'
    }
  }

  let availableMenus

  try {
    availableMenus = await Menus.list()
  } catch (err) {
    console.error('Could not read menus')
    return setStatusCode(500)
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
      type: 'number'
    })
    return validator.isValid()
  })

  if (!itemsAreValid) {
    setStatusCode(400)
    return {
      error: 'One or more cart items are malformed'
    }
  }

  // Clean all items so they only contain valid keys
  const cleanedCartItems = cartItems.map(item => ({
    menuId: item.menuId,
    quantity: item.quantity || 1
  }))

  let userId

  try {
    const token = await Tokens.read(authToken)
    userId = token.email
  } catch (err) {
    return setStatusCode(500)
  }

  let cartJustCreated = false

  try {
    await Carts.read(userId)
  } catch (err) {
    if (err.code === 'ENOENT') {
      try {
        await Carts.create(userId, cleanedCartItems)
        cartJustCreated = true
      } catch (err) {
        console.error('Could not write cart')
        return setStatusCode(500)
      }
    } else {
      console.error('Could not read cart')
      return setStatusCode(500)
    }
  }

  if (!cartJustCreated) {
    try {
      await Carts.update(userId, cleanedCartItems)
    } catch (err) {
      console.error('Could not update cart')
      return setStatusCode(500)
    }
  }
}

module.exports = handlers
