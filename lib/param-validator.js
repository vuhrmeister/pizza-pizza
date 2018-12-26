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

module.exports = ParamValidator
