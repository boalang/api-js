/**
 * Creates object for cookies manipulation on client side.
 * Allows to parse server's response in order to get cookies
 * and compose http request to transfer cookies to the server
 * @constructor
 */
function Cookies() {
  this.cookies = {};
}

Cookies.prototype = {
  /**
   * Sets cookie's value and optional options
   * @param {String} name cookie's name
   * @param {String} value value
   * @param {Object} options with the following fields:
   *  - {Boolean} secure - is cookie secure or not
   *                       (does not mean anything for now)
   *  - {Date} expires - cookie's expiration date. If specified then
   *                     cookie will disappear after that date
   */
  set: function(name, value, options) {
    const cookie = typeof options == 'object' ?
      {value: value,
        expires: options.expires,
        secure: options.secure || false, new: options.new || false} :
      {value: value};
    if (this.checkNotExpired(name, cookie)) {
      this.cookies[name] = cookie;
    }
  },

  // Internal function
  checkNotExpired: function(name, cookie) {
    if (typeof cookie === 'undefined') {
      cookie = this.cookies[name];
    }
    const now = new Date();
    if (cookie && cookie.expires && now > cookie.expires) {
      delete this.cookies[name];
      return false;
    }
    return true;
  },

  /**
   * Parses headers from server's response for 'set-cookie' header
   * and store cookie's values. Also parses expiration date
   * @param {*} headers the headers to parser
   */
  parseResponse: function(headers) {
    const cookies = headers['set-cookie'];
    if (cookies) {
      cookies.forEach(function(c) {
        const cookiesParams = c.split(';');
        const cookiePair = cookiesParams.shift().split('=');
        const options = {};
        cookiesParams.forEach(function(param) {
          param = param.trim();
          if (param.toLowerCase().indexOf('expires') == 0) {
            const date = param.split('=')[1].trim();
            options.expires = new Date(date);
          }
        });
        this.set(cookiePair[0].trim(), cookiePair[1].trim(), options);
      }.bind(this));
    }
  },

  /**
   * Adds cookies to the provided headers as array. Does nothing if
   * there are no cookies stored. This call checks expiration dates
   * and does not add expired cookies.
   * @param {*} headers the headers to add cookies to
   */
  composeRequest: function(headers) {
    if (Object.keys(this.cookies).length > 0) {
      headers['Cookie'] = this.toString();
    }
  },

  /**
   *
   * @return {String} cookies as 'name=value' pairs joined by semicolon
   */
  toString: function() {
    return Object.keys(this.cookies)
        .filter(this.checkNotExpired.bind(this))
        .map(function(name) {
          return name + '=' + this.cookies[name].value;
        }.bind(this)).join(';');
  },
};

module.exports = Cookies;
