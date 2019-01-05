const https = require('https')
const querystring = require('querystring')
const appConfig = require('../../app-config')

const HOSTNAME = 'api.stripe.com'
const ENDPOINT = '/v1/charges'
const DEFAULT_DESCRIPTION = 'Pizza Pizza'
const DEFAULT_CURRENCY = 'eur'

const { apiKey: API_KEY } = appConfig.stripe

const createRequestOptions = content => ({
  hostname: HOSTNAME,
  path: ENDPOINT,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(content)
  }
})

/**
 * @param {string} token https://stripe.com/docs/api/tokens
 * @param {number} amount A positive integer representing how much to charge, in the smallest currency unit (cents in $ or €)
 * @param {string} description
 * @param {string} currency Default will be `eur`
 */
const charge = (token, amount, description = DEFAULT_DESCRIPTION, currency = DEFAULT_CURRENCY) => {
  if (amount <= 0) {
    throw new Error(`Can't charge a negative amount or an amount of 0`)
  }

  const chargeData = {
    amount: amount,
    description,
    currency,
    source: token
  }
  const chargeDataString = querystring.stringify(chargeData)

  const requestOptions = createRequestOptions(chargeDataString)

  return new Promise((resolve, reject) => {
    const req = https.request(requestOptions, res => {
      res.on('data', data => {
        const parsedData = JSON.parse(data.toString('utf8'))

        if (parsedData.error) {
          reject(parsedData.error)
        } else {
          resolve()
        }
      })
    })

    req.on('error', reject)
    req.write(chargeDataString)
    req.end()
  })
}

module.exports = {
  charge
}
