const https = require('https')
const querystring = require('querystring')
const appConfig = require('../../app-config')

const {
  mailgun: {
    apiKey: API_KEY,
    domainName: DOMAIN_NAME
  },
  defaultSender: DEFAULT_SENDER
} = appConfig.notification

const HOSTNAME = 'api.mailgun.net'
const ENDPOINT = `/v3/${DOMAIN_NAME}/messages`

const createRequestOptions = content => ({
  hostname: HOSTNAME,
  path: ENDPOINT,
  method: 'POST',
  headers: {
    'Authorization': `Basic ${Buffer.from(`api:${API_KEY}`).toString('base64')}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(content)
  }
})

const sendMail = ({ from = DEFAULT_SENDER, to, subject, text }) => {
  const mailData = {
    from,
    to,
    subject,
    text
  }
  const mailDataString = querystring.stringify(mailData)

  const requestOptions = createRequestOptions(mailDataString)

  return new Promise((resolve, reject) => {
    const req = https.request(requestOptions, res => {
      res.on('data', data => {
        const readableData = data.toString('utf8')
        if (readableData) {
          const parsedData = JSON.parse(readableData)
          resolve(parsedData)
        } else {
          reject(readableData)
        }
      })
    })

    req.on('error', reject)
    req.write(mailDataString)
    req.end()
  })
}

module.exports = {
  sendMail
}
