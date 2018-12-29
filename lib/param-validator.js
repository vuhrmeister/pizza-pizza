/**
 * Library for validating request parameter
 */
class ParamValidator {
  constructor (params) {
    this.params = params
    this.invalidParams = []
  }

  validate (name, options) {
    const value = this.params[name]
    const {
      type,
      required = false,
      modifier = _ => _,
      validator = () => true
    } = options

    if (typeof value === 'undefined') {
      if (required) {
        this.invalidParams.push(name)
      }
      return
    }

    if (typeof value === type) { // eslint-disable-line valid-typeof
      const modifiedValue = modifier(value)
      if (validator(modifiedValue)) {
        return modifiedValue
      }
    }

    this.invalidParams.push(name)
    return value
  }

  isValid () {
    return this.invalidParams.length === 0
  }

  getErrorMessage () {
    // TODO Differenciate between different causes
    return `One or more params are invalid: ${this.invalidParams.join(', ')}`
  }
}

// Copied from https://emailregex.com/
// eslint-disable-next-line
const EMAIL_REGX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

// E-Mail validation function used in ParamValidator
const emailValidation = _ => EMAIL_REGX.test(_)

module.exports = {
  ParamValidator,
  validations: {
    email: emailValidation
  }
}
