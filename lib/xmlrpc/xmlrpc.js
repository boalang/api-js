var Client = require('./client')
  , dateFormatter = require('./date_formatter')

var xmlrpc = exports

/**
 * Creates an XML-RPC client.
 *
 * @param {Object} options - server options to make the HTTP request to
 *   - {String} host
 *   - {Number} port
 *   - {String} url
 *   - {Boolean} cookies
 * @return {Client}
 * @see Client
 */
xmlrpc.createClient = function(options) {
  return new Client(options, false)
}

/**
 * Creates an XML-RPC client that makes calls using HTTPS.
 *
 * @param {Object} options - server options to make the HTTP request to
 *   - {String} host
 *   - {Number} port
 *   - {String} url
 *   - {Boolean} cookies
 * @return {Client}
 * @see Client
 */
xmlrpc.createSecureClient = function(options) {
  return new Client(options, true)
}

xmlrpc.dateFormatter = dateFormatter
