const helpers = {}

helpers.jsonStringToObject = function (str) {
  try {
    return JSON.parse(str)
  } catch (err) {
    return {}
  }
}

module.exports = helpers
