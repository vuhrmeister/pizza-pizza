const Data = require('../../lib/data')

const Users = new Data('users')
const Tokens = new Data('tokens')

const services = {}

services.getUserForAuthToken = async function (authToken) {
  let email

  try {
    const tokenData = await Tokens.read(authToken)
    email = tokenData.email
  } catch (err) {
    throw new Error('Invalid auth token')
  }

  try {
    return await Users.read(email)
  } catch (err) {
    throw new Error('Could not read user')
  }
}

module.exports = services
