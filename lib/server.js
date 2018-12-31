const http = require('http')
const url = require('url')
const StringDecoder = require('string_decoder').StringDecoder
const appConfig = require('../app-config')
const helpers = require('./helpers')

const PORT = appConfig.server.port

/**
 * If no status code is set by the handler
 * this one will be set on the response.
 */
const DEFAULT_STATUS_CODE = 200

const registeredRoutes = {}

const registerRoutes = routes => {
  Object.entries(routes).forEach(([routeName, routeHandler]) => {
    if (!registeredRoutes.hasOwnProperty(routeName)) {
      registeredRoutes[routeName] = routeHandler
    }
  })
}

// TODO extract to separate file, does not belong into the server logic
;[
  require('../modules/user'),
  require('../modules/menu'),
  require('../modules/cart')
].forEach(mod => {
  registerRoutes(mod.routes)
})

const server = http.createServer((req, res) => {
  const decoder = new StringDecoder('utf-8')
  let buffer = ''

  req.on('data', (data) => {
    buffer += decoder.write(data)
  })

  req.on('end', () => {
    buffer += decoder.end()
    const parsedData = helpers.jsonStringToObject(buffer)
    handleRequest(req, res, parsedData)
  })
})

async function handleRequest (req, res, payload) {
  const parsedUrl = url.parse(req.url, true)
  const endpoint = normalizePathname(parsedUrl.pathname)
  const method = req.method.toLowerCase()

  // Might get overridden by the handler
  let statusCode = DEFAULT_STATUS_CODE

  // The bag will be passed as a single argument to the handler
  // We could put more stuff into it that might be relevant for handlers.
  const bag = {
    request: {
      endpoint,
      payload,
      queryParams: parsedUrl.query || {},
      headers: req.headers
    },
    setStatusCode (code) {
      if (typeof code === 'number') {
        statusCode = code
      } else {
        console.warn(`Wrong status code: ${code} - ${DEFAULT_STATUS_CODE} will be used.`)
      }
    }
  }

  const handler = getHandler(endpoint, method)

  try {
    let result = await handler(bag)

    // Ensure we send a proper JSON object in the response
    if (typeof result !== 'object') {
      if (typeof result !== 'undefined') {
        console.warn('Return value of the handler must be an object. Will return an empty object now.')
      }
      result = {}
    }

    if (statusCode === 200 && Object.keys(result).length === 0) {
      statusCode = 204
    }

    const resultString = JSON.stringify(result)

    res.setHeader('Content-Type', 'application/json')
    res.writeHead(statusCode)
    res.end(resultString)
  } catch (error) {
    console.error(error)
    res.writeHead(500)
    res.end()
  }
}

// Strip of leading and trailing slashes
function normalizePathname (pathname) {
  return pathname.replace(/^\/+|\/+$/g, '')
}

function getHandler (path, method) {
  const endpoint = registeredRoutes[path]

  if (endpoint) {
    if (typeof endpoint[method] === 'function') {
      return endpoint[method]
    } else {
      return methodNotAllowedHandler
    }
  }

  return notFoundHandler
}

function notFoundHandler ({ setStatusCode }) {
  setStatusCode(404)
}

function methodNotAllowedHandler ({ setStatusCode }) {
  setStatusCode(405)
}

const lib = {
  start () {
    server.listen(PORT, () => {
      console.log(`The server is up and running now on port ${PORT}`)
    })
  }
}

module.exports = lib
