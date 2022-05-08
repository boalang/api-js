var https        = require('https')
  , URL          = require('url').URL
  , Serializer   = require('./serializer')
  , Deserializer = require('./deserializer')
  , Cookies      = require('./cookies')

/**
 * Creates a Client object for making XML-RPC method calls.
 *
 * @constructor
 * @param {String} url - a URI string
 * @return {Client}
 */
function Client(url) {
  this.options = {
    headers: {},
    method: 'POST'
  }

  var parsedUrl = new URL(url);
  this.options.host = parsedUrl.hostname;
  this.options.path = parsedUrl.pathname + parsedUrl.search;
  this.options.port = parsedUrl.port;

  // Set the HTTP request headers
  var headers = {
    'User-Agent'     : 'NodeJS XML-RPC Client'
  , 'Content-Type'   : 'text/xml'
  , 'Accept'         : 'text/xml'
  , 'Accept-Charset' : 'UTF8'
  , 'Connection'     : 'Keep-Alive'
  }

  for (var attribute in headers) {
    this.options.headers[attribute] = headers[attribute]
  }

  this.cookies = new Cookies();
  this.headersProcessors = {
    processors: [this.cookies],
    composeRequest: function(headers) {
      this.processors.forEach(function(p) {p.composeRequest(headers);})
    },
    parseResponse: function(headers) {
      this.processors.forEach(function(p) {p.parseResponse(headers);})
    }
  };
}

/**
 * Makes an XML-RPC call to the server specified by the constructor's options.
 *
 * @param {String} method     - The method name.
 * @param {Array} params      - Params to send in the call.
 * @param {Function} callback - function(error, value) { ... }
 *   - {Object|null} error    - Any errors when making the call, otherwise null.
 *   - {mixed} value          - The value returned in the method response.
 */
Client.prototype.methodCall = function methodCall(method, params, callback) {
  var options = this.options
  var xml     = Serializer.serializeMethodCall(method, params)

  options.headers['Content-Length'] = Buffer.byteLength(xml, 'utf8')
  this.headersProcessors.composeRequest(options.headers)
  var request = https.request(options, function(response) {

    var body = []
    response.on('data', function (chunk) { body.push(chunk) })

    function __enrichError (err) {
      Object.defineProperty(err, 'req', { value: request })
      Object.defineProperty(err, 'res', { value: response })
      Object.defineProperty(err, 'body', { value: body.join('') })
      return err
    }

    if (response.statusCode == 404) {
      callback(__enrichError(new Error('Not Found')))
    }
    else {
      this.headersProcessors.parseResponse(response.headers)

      var deserializer = new Deserializer(options.responseEncoding)

      deserializer.deserializeMethodResponse(response, function(err, result) {
        if (err) {
          err = __enrichError(err)
        }
        callback(err, result, request.client)
      })
    }
  }.bind(this))

  request.on('error', callback)
  request.client = this
  request.write(xml, 'utf8')
  request.end()
}

module.exports = Client
