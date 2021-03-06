const Data = require('../../lib/data')
const HandlerError = require('../../lib/handler-error')
const { createRandomString } = require('../../lib/helpers')
const { Emitter, Events } = require('../events')
const { authenticate } = require('../user/security')
const { getUserForAuthToken } = require('../user')
const { charge } = require('./payment')

const Menus = new Data('menus')
const Carts = new Data('carts')
const Orders = new Data('orders')

const handlers = {}

handlers.placeOrder = async function ({ request, setStatusCode }) {
  const { headers } = request
  const authToken = headers['auth-token']

  const authenticated = await authenticate(authToken)
  if (!authenticated) {
    throw new HandlerError(403, 'Missing required `auth-token` in header, or `auth-token` is invalid')
  }

  let user
  try {
    user = await getUserForAuthToken(authToken)
  } catch (err) {
    throw new HandlerError(403, 'Could not authenticate')
  }

  let cartItems
  try {
    const { items } = await Carts.read(user.email)
    cartItems = items

    if (!cartItems.length) {
      throw new Error()
    }
  } catch (err) {
    throw new HandlerError(400, `There is nothing in your cart. Order can't be processed.`)
  }

  let orderValue = 0
  try {
    for (let i = 0; i < cartItems.length; i++) {
      const { menuId, quantity } = cartItems[i]
      const { price } = await Menus.read(menuId)
      orderValue += price * quantity
    }
  } catch (err) {
    // Validity of cart (items) should be already checked
    // when adding them to it. So here it's an unexpected error.
    throw new HandlerError(500)
  }

  const orderId = createRandomString(20)
  try {
    const orderData = {
      orderId,
      userId: user.email,
      shippingAddress: {
        street: user.street,
        zip: user.zip,
        city: user.city
      },
      cartItems,
      paymentStatus: 'outstanding'
    }
    await Orders.create(orderId, orderData)
  } catch (err) {
    throw new HandlerError(500)
  }

  try {
    // Dummy charge. In real life we would expect the user to pass a
    // token created on the client via stripe service.
    const token = 'tok_visa'
    const orderValueInCents = orderValue * 100
    const description = 'Pizza Pizza order'
    await charge(token, orderValueInCents, description)
  } catch (err) {
    console.log(err)
    throw new HandlerError(500, 'Payment failed')
  }

  try {
    await Orders.update(orderId, { paymentStatus: 'paid' })
  } catch (err) {
    // At this point we should refund the charged amount.
    // Since this is a demo case we leave it for now.
    // TODO maybe this should not be an error but a notice
    //      in the regular response
    throw new HandlerError(500)
  }

  try {
    // Clear cart
    await Carts.update(user.email, { items: [] })
  } catch (err) {
    // Don't throw an error. It's not nice that the cart was
    // not cleared, but the order itself was processed just fine.
  }

  Emitter.emit(Events.ORDER_PLACED, {
    orderId,
    user
  })

  return {
    orderId,
    orderValue
  }
}

module.exports = handlers
