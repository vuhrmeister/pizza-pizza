const Data = require('../../lib/data')

const Tokens = new Data('tokens')

async function authenticate (tokenId, email) {
  if (!tokenId || !email) {
    return false
  }

  try {
    const tokenData = await Tokens.read(tokenId)
    if (tokenData.email !== email || tokenData.expires < Date.now()) {
      throw new Error()
    }
  } catch (err) {
    return false
  }

  return true
}

module.exports = authenticate
