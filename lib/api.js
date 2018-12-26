const crypto = require('crypto')
const appConfig = require('../app-config')
const ParamValidator = require('./param-validator')
const Data = require('./data')

// Copied from https://emailregex.com/
// eslint-disable-next-line
const EMAIL_REGX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

// E-Mail validation function used in ParamValidator
const EmailValidator = _ => EMAIL_REGX.test(_)

// Representation of a users collection
const Users = new Data('users')

const api = {}

api.user = {
  /**
   * Get user
   */
  async get ({ request, setStatusCode }) {
    const { queryParams } = request

    const validator = new ParamValidator(queryParams)
    const email = validator.validate('email', {
      type: 'string',
      required: true,
      modifier: _ => _.trim(),
      validator: EmailValidator
    })

    if (!validator.isValid()) {
      setStatusCode(400)
      return {
        error: validator.getErrorMessage()
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
  },

  /**
   * Create user
   */
  async post ({ request, setStatusCode }) {
    const { payload } = request

    const validator = new ParamValidator(payload)
    const email = validator.validate('email', {
      type: 'string',
      required: true,
      modifier: _ => _.trim(),
      validator: EmailValidator
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
      modifier: _ => _.trim(),
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
  },

  /**
   * Update user
   */
  async put ({ request, setStatusCode }) {
    const { payload } = request

    const validator = new ParamValidator({
      ...payload,
      email: request.queryParams.email
    })

    const email = validator.validate('email', {
      type: 'string',
      required: true,
      modifier: _ => _.trim(),
      validator: EmailValidator
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
      modifier: _ => _.trim(),
      validator: _ => _.length >= 6
    })

    if (!validator.isValid()) {
      setStatusCode(400)
      return {
        error: validator.getErrorMessage()
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
  },

  /**
   * Delete user
   */
  async delete ({ request, setStatusCode }) {
    const { queryParams } = request

    const validator = new ParamValidator(queryParams)
    const email = validator.validate('email', {
      type: 'string',
      required: true,
      modifier: _ => _.trim(),
      validator: EmailValidator
    })

    if (!validator.isValid()) {
      setStatusCode(400)
      return {
        error: validator.getErrorMessage()
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
}

function hashPassword (pw) {
  return crypto
    .createHmac('sha256', appConfig.hashingSecret)
    .update(pw)
    .digest('hex')
}

module.exports = api
