const helpers = {}

helpers.jsonStringToObject = function (str) {
  try {
    return JSON.parse(str)
  } catch (err) {
    return {}
  }
}

helpers.createRandomString = function (strLength = 0) {
  const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789'

  return Array(strLength).fill(1).reduce(finalString => {
    const randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length))
    return finalString + randomCharacter
  }, '')
}

module.exports = helpers
