const https = require('https');
const URL = require('url').URL;
const Serializer = require('./serializer');
const Deserializer = require('./deserializer');
const Cookies = require('./cookies');

/**
 * Creates a Client object for making XML-RPC method calls.
 *
 * @constructor
 * @param {String} url - a URI string
 */
function Client(url) {
  this.options = {
    headers: {},
    method: 'POST',
  };

  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('URL protocol must be HTTPS');
  }
  this.options.host = parsedUrl.hostname;
  this.options.path = parsedUrl.pathname + parsedUrl.search;
  this.options.port = parsedUrl.port;

  // Set the HTTP request headers
  const headers = {
    'User-Agent': 'NodeJS XML-RPC Client',
    'Content-Type': 'text/xml',
    'Accept': 'text/xml',
    'Accept-Charset': 'UTF8',
    'Connection': 'Keep-Alive',
  };

  // eslint-disable-next-line guard-for-in
  for (const attribute in headers) {
    this.options.headers[attribute] = headers[attribute];
  }

  this.cookies = new Cookies();
  this.headersProcessors = {
    processors: [this.cookies],
    composeRequest: function(headers) {
      this.processors.forEach(function(p) {
        p.composeRequest(headers);
      });
    },
    parseResponse: function(headers) {
      this.processors.forEach(function(p) {
        p.parseResponse(headers);
      });
    },
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
Client.prototype.methodCall =
  async function methodCall(method, params, callback) {
    await this._methodCall(method, params, callback, 1);
  };

Client.prototype._methodCall =
    async function _methodCall(method, params, cb, retryCount) {
      const options = this.options;
      const xml = Serializer.serializeMethodCall(method, params);

      // const callback = cb;
      const callback = async function(err, value) {
        if (err && retryCount <= 5) {
          console.log(`failed(${method}), retrying(${retryCount}): ${err}`);
          await new Promise((r) => setTimeout(r, retryCount * 100));
          await this._methodCall(method, params, cb, retryCount + 1);
        } else {
          cb(err, value);
        }
      }.bind(this);

      options.headers['Content-Length'] = Buffer.byteLength(xml, 'utf8');
      this.headersProcessors.composeRequest(options.headers);
      const request = https.request(options, function(response) {
        const body = [];
        response.on('data', function(chunk) {
          body.push(chunk);
        });

        /**
         * Adds additional useful properties to error messages.
         *
         * @param {Error} err the error message
         * @return {Error} the error with additional properties
         */
        function __enrichError(err) {
          Object.defineProperty(err, 'req', {value: request});
          Object.defineProperty(err, 'res', {value: response});
          Object.defineProperty(err, 'body', {value: body.join('')});
          return err;
        }

        if (response.statusCode == 404) {
          callback(__enrichError(
              new Error('The specified path "' + options.path +
              '" in the given URL was not found.'),
          ));
        } else {
          this.headersProcessors.parseResponse(response.headers);

          const deserializer = new Deserializer();

          deserializer.deserializeMethodResponse(response,
              function(err, result) {
                if (err) {
                  err = __enrichError(err);
                }
                callback(err, result);
              });
        }
      }.bind(this));

      request.on('error', callback);
      request.write(xml, 'utf8');
      request.end();
    };

module.exports = Client;
