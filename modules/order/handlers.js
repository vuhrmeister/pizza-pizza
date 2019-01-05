const Data = require('../../lib/data')
const { createRandomString } = require('../../lib/helpers')
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
    setStatusCode(403)
    return {
      error: 'Missing required `auth-token` in header, or `auth-token` is invalid'
    }
  }

  let user
  try {
    user = await getUserForAuthToken(authToken)
  } catch (err) {
    setStatusCode(500)
  }

  let cartItems
  try {
    const { items } = await Carts.read(user.email)
    cartItems = items

    if (!cartItems.length) {
      throw new Error()
    }
  } catch (err) {
    setStatusCode(400)
    return {
      error: `There is nothing in your cart. Order can't be processed.`
    }
  }

  let orderValue = 0
  try {
    for (let i = 0; i < cartItems.length; i++) {
      const { menuId, quantity } = cartItems[i]
      const { price } = await Menus.read(menuId)
      orderValue += price * quantity
    }
  } catch (err) {
    setStatusCode(400)
    return {
      error: 'Invalid item(s) on cart!'
    }
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
      paymentStatus: 'outstanding'
    }
    await Orders.create(orderId, orderData)
  } catch (err) {
    setStatusCode(500)
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
    setStatusCode(500)
    return {
      orderId,
      error: 'Payment failed'
    }
  }

  try {
    await Orders.update(orderId, { paymentStatus: 'paid' })
  } catch (err) {
    // At this point we should refund the charged amount.
    // Since this is a demo case we leave it for now.
    setStatusCode(500)
  }

  try {
    // Clear cart
    await Carts.update(user.email, { items: [] })
  } catch (err) {
    // Don't throw an error. It's not nice that the cart was
    // not cleared, but the order itself was processed just fine.
  }

  return {
    orderId,
    orderValue
  }
}

module.exports = handlers
