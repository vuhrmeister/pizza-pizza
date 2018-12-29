const crypto = require('crypto')
const appConfig = require('../../app-config')
const Data = require('../../lib/data')
const helpers = require('../../lib/helpers')
const { ParamValidator, validations } = require('../../lib/param-validator')
const authenticate = require('./authenticate')

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
    setStatusCode(400)
    return {
      error: validator.getErrorMessage()
    }
  }

  let hashedPassword

  try {
    const user = await Users.read(email)
    hashedPassword = hashPassword(password)
    if (hashedPassword !== user.hashedPassword) {
      throw new Error()
    }
  } catch (err) {
    setStatusCode(400)
    return {
      error: 'Wrong email or password'
    }
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
    setStatusCode(500)
    return {
      error: 'Error creating authentication token'
    }
  }

  setStatusCode(201)
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
    setStatusCode(400)
    return {
      error: validator.getErrorMessage()
    }
  }

  try {
    await Tokens.read(tokenId)
  } catch (err) {
    setStatusCode(400)
    return {
      error: 'Invalid authentication token'
    }
  }

  try {
    await Tokens.delete(tokenId)
  } catch (err) {
    setStatusCode(500)
    return {
      error: 'Could not delete autentication token'
    }
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
    setStatusCode(400)
    return {
      error: validator.getErrorMessage()
    }
  }

  const authenticated = await authenticate(headers['auth-token'], email)
  if (!authenticated) {
    setStatusCode(403)
    return {
      error: 'Missing required `auth-token` in header, or `auth-token` is invalid'
    }
  }

  try {
    const userDoc = await Users.read(email)
    delete userDoc.hashedPassword
    return userDoc
  } catch (err) {
    setStatusCode(404)
    return {
      error: 'User does not exists'
    }
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
    setStatusCode(400)
    return {
      error: validator.getErrorMessage()
    }
  }

  try {
    await Users.read(email)
    // In case of success the user already exists and we must return an error
    setStatusCode(400)
    return {
      error: 'User already exists'
    }
  } catch (err) {
    // Only in case of an error we want to continue
    // So we can safely continue without handling it.
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
    setStatusCode(500)
    return {
      error: 'Could not create user'
    }
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
    setStatusCode(400)
    return {
      error: validator.getErrorMessage()
    }
  }

  const authenticated = await authenticate(headers['auth-token'], email)
  if (!authenticated) {
    setStatusCode(403)
    return {
      error: 'Missing required `auth-token` in header, or `auth-token` is invalid'
    }
  }

  try {
    await Users.read(email)
  } catch (err) {
    setStatusCode(400)
    return {
      error: 'User does not exists'
    }
  }

  const keysAllowedToUpdate = ['firstName', 'lastName', 'street', 'zip', 'city', 'password']

  const fieldsToUpdate = keysAllowedToUpdate.reduce((fields, key) => {
    if (payload[key]) {
      fields[key] = payload[key]
    }
    return fields
  }, {})

  if (Object.keys(fieldsToUpdate).length === 0) {
    setStatusCode(400)
    return {
      error: 'You must provide at least one value to be updated'
    }
  }

  if (fieldsToUpdate.password) {
    fieldsToUpdate.hashedPassword = hashPassword(fieldsToUpdate.password)
    delete fieldsToUpdate.password
  }

  try {
    await Users.update(email, fieldsToUpdate)
  } catch (err) {
    setStatusCode(500)
    return {
      error: 'Could not update user'
    }
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
    setStatusCode(400)
    return {
      error: validator.getErrorMessage()
    }
  }

  const authenticated = await authenticate(headers['auth-token'], email)
  if (!authenticated) {
    setStatusCode(403)
    return {
      error: 'Missing required `auth-token` in header, or `auth-token` is invalid'
    }
  }

  try {
    await Users.read(email)
  } catch (err) {
    setStatusCode(400)
    return {
      error: 'User does not exists'
    }
  }

  try {
    await Users.delete(email)
  } catch (err) {
    setStatusCode(500)
    return {
      error: 'Could not delete user'
    }
  }
}

function hashPassword (pw) {
  return crypto
    .createHmac('sha256', appConfig.hashingSecret)
    .update(pw)
    .digest('hex')
}

module.exports = handlers
