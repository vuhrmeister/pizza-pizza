const { Emitter, Events } = require('../events')
const { sendMail } = require('./mailgun')

Emitter.on(Events.ORDER_PLACED, async ({ orderId, user }) => {
  const name = `${user.firstName} ${user.lastName}`
  try {
    sendMail({
      to: `${name} <${user.email}>`,
      subject: `Order ${orderId} sucessful`,
      text: `Hello ${name},

  your order was placed sucessfully and we received your payment.

  You will get your pizza in about 20 minutes.

  Best,
  Pizza Pizza`
    })
  } catch (err) {
    console.error(`Could not send confirmation mail for order ${orderId}`, err)
  }
})
