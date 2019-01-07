const crypto = require('crypto')
const appConfig = require('../../app-config')
const Data = require('../../lib/data')
const HandlerError = require('../../lib/handler-error')
const helpers = require('../../lib/helpers')
const { ParamValidator, validations } = require('../../lib/param-validator')
const { authorize } = require('./security')

const Users = new Data('users')
const Tokens = new Data('tokens')

const handlers = {}

handlers.login = async function ({ request, setStatusCode }) {
  const { payload } = request

  const validator = new ParamValidator(payload)
  const email = validator.validate('email', {
    type: 'string',
    required: true,
    modifier: _ => _.trim(),
    validator: validations.email
  })
  const password = validator.validate('password', {
    type: 'string',
    required: true
  })

  if (!validator.isValid()) {
    throw new HandlerError(400, validator.getErrorMessage())
  }

  let hashedPassword

  try {
    const user = await Users.read(email)
    hashedPassword = hashPassword(password)
    if (hashedPassword !== user.hashedPassword) {
      throw new Error()
    }
  } catch (err) {
    throw new HandlerError(400, 'Wrong email or password')
  }

  const tokenId = helpers.createRandomString(20)
  const tokenData = {
    email,
    tokenId,
    expires: Date.now() + 1000 * 60 * appConfig.authTokenValidityMinutes
  }

  try {
    await Tokens.create(tokenId, tokenData)
  } catch (err) {
    throw new HandlerError(500)
  }

  return tokenData
}

handlers.logout = async function ({ request, setStatusCode }) {
  const { headers } = request

  const validator = new ParamValidator({
    tokenId: headers['auth-token']
  })

  const tokenId = validator.validate('tokenId', {
    type: 'string',
    required: true,
    modifier: _ => _.trim(),
    validator: _ => _.length === 20
  })

  if (!validator.isValid()) {
    throw new HandlerError(400, validator.getErrorMessage())
  }

  try {
    await Tokens.read(tokenId)
  } catch (err) {
    throw new HandlerError(403, 'Missing required `auth-token` in header, or `auth-token` is invalid')
  }

  try {
    await Tokens.delete(tokenId)
  } catch (err) {
    throw new HandlerError(500, 'Could not delete autentication token')
  }
}

handlers.getUser = async function ({ request, setStatusCode }) {
  const { queryParams, headers } = request

  const validator = new ParamValidator(queryParams)
  const email = validator.validate('email', {
    type: 'string',
    required: true,
    modifier: _ => _.trim(),
    validator: validations.email
  })

  if (!validator.isValid()) {
    throw new HandlerError(400, validator.getErrorMessage())
  }

  const authorized = await authorize(headers['auth-token'], email)
  if (!authorized) {
    throw new HandlerError(403, 'Missing required `auth-token` in header, or `auth-token` is invalid')
  }

  try {
    const userDoc = await Users.read(email)
    delete userDoc.hashedPassword
    return userDoc
  } catch (err) {
    // If we come to that place a user with the given email should exist!
    // Therefore something really unexpected happened.
    throw new HandlerError(500)
  }
}

handlers.createUser = async function ({ request, setStatusCode }) {
  const { payload } = request

  const validator = new ParamValidator(payload)
  const email = validator.validate('email', {
    type: 'string',
    required: true,
    modifier: _ => _.trim(),
    validator: validations.email
  })
  const firstName = validator.validate('firstName', {
    type: 'string',
    required: true,
    modifier: _ => _.trim(),
    validator: _ => _.length > 0
  })
  const lastName = validator.validate('lastName', {
    type: 'string',
    required: true,
    modifier: _ => _.trim(),
    validator: _ => _.length > 0
  })
  const street = validator.validate('street', {
    type: 'string',
    required: true,
    modifier: _ => _.trim(),
    validator: _ => _.length > 0
  })
  const zip = validator.validate('zip', {
    type: 'string',
    required: true,
    modifier: _ => _.trim(),
    validator: _ => [4, 5].indexOf(_.length) > -1
  })
  const city = validator.validate('city', {
    type: 'string',
    required: true,
    modifier: _ => _.trim(),
    validator: _ => _.length > 0
  })
  const password = validator.validate('password', {
    type: 'string',
    required: true,
    validator: _ => _.length >= 6
  })
  const tosAgreement = validator.validate('tosAgreement', {
    type: 'boolean',
    required: true,
    validator: _ => _ // only valid if it's true
  })

  if (!validator.isValid()) {
    throw new HandlerError(400, validator.getErrorMessage())
  }

  try {
    await Users.read(email)
    // In case of success the user already exists and we must return an error
    throw new HandlerError(400, 'User already exists')
  } catch (err) {
    // Only in case of an error from Users.read()
    // we want to continue without throwing
    if (err instanceof HandlerError) {
      throw err
    }
  }

  const hashedPassword = hashPassword(password)

  const userDoc = {
    email,
    firstName,
    lastName,
    street,
    zip,
    city,
    hashedPassword,
    tosAgreement
  }

  try {
    await Users.create(email, userDoc)
  } catch (err) {
    throw new HandlerError(500, 'Could not create user')
  }

  setStatusCode(201)
}

handlers.updateUser = async function ({ request, setStatusCode }) {
  const { payload, headers } = request

  const validator = new ParamValidator({
    ...payload,
    email: request.queryParams.email
  })

  const email = validator.validate('email', {
    type: 'string',
    required: true,
    modifier: _ => _.trim(),
    validator: validations.email
  })
  validator.validate('firstName', {
    type: 'string',
    modifier: _ => _.trim(),
    validator: _ => _.length > 0
  })
  validator.validate('lastName', {
    type: 'string',
    modifier: _ => _.trim(),
    validator: _ => _.length > 0
  })
  validator.validate('street', {
    type: 'string',
    modifier: _ => _.trim(),
    validator: _ => _.length > 0
  })
  validator.validate('zip', {
    type: 'string',
    modifier: _ => _.trim(),
    validator: _ => [4, 5].indexOf(_.length) > -1
  })
  validator.validate('city', {
    type: 'string',
    modifier: _ => _.trim(),
    validator: _ => _.length > 0
  })
  validator.validate('password', {
    type: 'string',
    validator: _ => _.length >= 6
  })

  if (!validator.isValid()) {
    throw new HandlerError(400, validator.getErrorMessage())
  }

  const authenticated = await authorize(headers['auth-token'], email)
  if (!authenticated) {
    throw new HandlerError(403, 'Missing required `auth-token` in header, or `auth-token` is invalid')
  }

  try {
    await Users.read(email)
  } catch (err) {
    throw new HandlerError(400, 'User does not exists')
  }

  const keysAllowedToUpdate = ['firstName', 'lastName', 'street', 'zip', 'city', 'password']

  const fieldsToUpdate = keysAllowedToUpdate.reduce((fields, key) => {
    if (payload[key]) {
      fields[key] = payload[key]
    }
    return fields
  }, {})

  if (Object.keys(fieldsToUpdate).length === 0) {
    throw new HandlerError(400, 'You must provide at least one value to be updated')
  }

  if (fieldsToUpdate.password) {
    fieldsToUpdate.hashedPassword = hashPassword(fieldsToUpdate.password)
    delete fieldsToUpdate.password
  }

  try {
    await Users.update(email, fieldsToUpdate)
  } catch (err) {
    throw new HandlerError(500, 'Could not update user')
  }
}

// TODO delete all user tokens!
handlers.deleteUser = async function ({ request, setStatusCode }) {
  const { queryParams, headers } = request

  const validator = new ParamValidator(queryParams)
  const email = validator.validate('email', {
    type: 'string',
    required: true,
    modifier: _ => _.trim(),
    validator: validations.email
  })

  if (!validator.isValid()) {
    throw new HandlerError(400, validator.getErrorMessage())
  }

  const authenticated = await authorize(headers['auth-token'], email)
  if (!authenticated) {
    throw new HandlerError(403, 'Missing required `auth-token` in header, or `auth-token` is invalid')
  }

  try {
    await Users.read(email)
  } catch (err) {
    throw new HandlerError(400, 'User does not exists')
  }

  try {
    await Users.delete(email)
  } catch (err) {
    throw new HandlerError(500, 'Could not delete user')
  }
}

function hashPassword (pw) {
  return crypto
    .createHmac('sha256', appConfig.hashingSecret)
    .update(pw)
    .digest('hex')
}

module.exports = handlers
