const {create} = require('xmlbuilder2');
const dateFormatter = require('./date_formatter');

/**
 * Creates the XML for an XML-RPC method call.
 *
 * @param {String} method  - The method name.
 * @param {Array}  p       - Params to pass in the call.
 * @return {String} the XML method call request
 */
exports.serializeMethodCall = function(method, p) {
  const params = p || [];

  const xml = create().ele('methodCall')
      .ele('methodName')
      .txt(method)
      .up()
      .ele('params');

  params.forEach(function(param) {
    serializeValue(param, xml.ele('param'));
  });

  // Includes the <?xml ...> declaration
  return xml.doc().toString();
};

/**
 * Serializes a value to the XML document.
 * @param {*} value the value to serialize
 * @param {*} xml the XML document
 */
function serializeValue(value, xml) {
  const stack = [{value: value, xml: xml}];
  let current = null;
  let valueNode = null;
  let next = null;

  while (stack.length > 0) {
    current = stack[stack.length - 1];

    if (current.index !== undefined) {
      // Iterating a compound
      next = getNextItemsFrame(current);
      if (next) {
        stack.push(next);
      } else {
        stack.pop();
      }
    } else {
      // we're about to add a new value (compound or simple)
      valueNode = current.xml.ele('value');
      switch (typeof current.value) {
        case 'boolean':
          appendBoolean(current.value, valueNode);
          stack.pop();
          break;
        case 'string':
          appendString(current.value, valueNode);
          stack.pop();
          break;
        case 'number':
          appendNumber(current.value, valueNode);
          stack.pop();
          break;
        case 'object':
          if (current.value === null) {
            valueNode.ele('nil');
            stack.pop();
          } else if (current.value instanceof Date) {
            appendDatetime(current.value, valueNode);
            stack.pop();
          } else if (Buffer.isBuffer(current.value)) {
            appendBuffer(current.value, valueNode);
            stack.pop();
          } else {
            if (Array.isArray(current.value)) {
              current.xml = valueNode.ele('array').ele('data');
            } else {
              current.xml = valueNode.ele('struct');
              current.keys = Object.keys(current.value);
            }
            current.index = 0;
            next = getNextItemsFrame(current);
            if (next) {
              stack.push(next);
            } else {
              stack.pop();
            }
          }
          break;
        default:
          stack.pop();
          break;
      }
    }
  }
}

/**
 * Gets the next frame from a given frame.
 * @param {*} frame the current frame
 * @return {*} the next frame
 */
function getNextItemsFrame(frame) {
  let nextFrame = null;

  if (frame.keys) {
    if (frame.index < frame.keys.length) {
      const key = frame.keys[frame.index++];
      const member = frame.xml.ele('member').ele('name').text(key).up();
      nextFrame = {
        value: frame.value[key],
        xml: member,
      };
    }
  } else if (frame.index < frame.value.length) {
    nextFrame = {
      value: frame.value[frame.index],
      xml: frame.xml,
    };
    frame.index++;
  }

  return nextFrame;
}

/**
 * Appends a bool value to the XML document.
 * @param {*} value the value to append
 * @param {*} xml the XML document
 */
function appendBoolean(value, xml) {
  xml.ele('boolean').txt(value ? 1 : 0);
}

const illegalChars = /^(?![^<&]*]]>[^<&]*)[^<&]*$/;
/**
 * Appends a string value to the XML document.
 * @param {*} value the value to append
 * @param {*} xml the XML document
 */
function appendString(value, xml) {
  if (value.length === 0) {
    xml.ele('string');
  } else if (!illegalChars.test(value)) {
    xml.ele('string').d(value);
  } else {
    xml.ele('string').txt(value);
  }
}

/**
 * Appends a number value to the XML document.
 * @param {*} value the value to append
 * @param {*} xml the XML document
 */
function appendNumber(value, xml) {
  if (value % 1 == 0) {
    xml.ele('int').txt(value);
  } else {
    xml.ele('double').txt(value);
  }
}

/**
 * Appends a datetime value to the XML document.
 * @param {*} value the value to append
 * @param {*} xml the XML document
 */
function appendDatetime(value, xml) {
  xml.ele('dateTime.iso8601').txt(dateFormatter.encodeIso8601(value));
}

/**
 * Appends a buffer value to the XML document.
 * @param {*} value the value to append
 * @param {*} xml the XML document
 */
function appendBuffer(value, xml) {
  xml.ele('base64').txt(value.toString('base64'));
}
