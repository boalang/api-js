//
// Copyright 2022 Robert Dyer,
//                and University of Nebraska Board of Regents
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
const XMLRPCClient = require('./xmlrpc/client.js');
// eslint-disable-next-line no-unused-vars
const jh = require('./jobhandle.js');

module.exports.BOA_API_ENDPOINT = 'https://boa.cs.iastate.edu/boa/?q=boa/api';
module.exports.BOAC_API_ENDPOINT = 'https://boa.cs.iastate.edu/boac/?q=boa/api';
module.exports.KNOWN_ENDPOINTS = [
  module.exports.BOA_API_ENDPOINT,
  module.exports.BOAC_API_ENDPOINT,
];

module.exports.CompilerStatus = jh.CompilerStatus;
module.exports.ExecutionStatus = jh.ExecutionStatus;

/**
 * A header processor to handle CSRF tokens.
 */
function CSRF() {
  this.token = null;
}
CSRF.prototype = {
  set(t) {
    this.token = t;
  },

  parseResponse: function() { },

  composeRequest: function(headers) {
    if (this.token !== null) {
      headers['X-CSRF-Token'] = this.token;
    }
  },
};

/**
 * Creates a new Boa API client for a given endpoint.
 * @constructor
 * @param {string} [endpoint] - the URL endpoint of the Boa API
 */
function BoaClient(endpoint=module.exports.BOA_API_ENDPOINT) {
  this.client = new XMLRPCClient(endpoint, true);
  this.csrf = new CSRF();
  this.client.headersProcessors.processors.unshift(this.csrf);
}
module.exports.BoaClient = BoaClient;

/**
 * Log in to the Boa API.
 * @param {string} username - your Boa username
 * @param {string} password - your Boa password
 */
BoaClient.prototype.login = async function(username, password) {
  return new Promise((resolve, reject) =>
    this.client.methodCall('user.login', [username, password],
        function(error, value) {
          if (error) {
            error.message = error.message.replace(
                /user\.login\([^)]+\)/,
                'user.login()');
            return reject(error);
          }

          if (typeof value.token !== 'undefined') {
            this.csrf.set(value.token);
          }
          return resolve();
        }.bind(this)), (reason) => reject(reason));
};

/**
 * Logs you out of the Boa API.
 */
BoaClient.prototype.close = async function() {
  return new Promise((resolve, reject) =>
    this.client.methodCall('user.logout', [], function(error, value) {
      if (error) {
        return reject(error);
      }

      return resolve();
    }), (reason) => reject(reason));
};

/**
 * A Boa dataset.
 * @typedef {Object} Dataset
 * @property {number} id - unique identifier for the dataset
 * @property {string} name - the dataset's name
 */

/**
 * A function that filters datasets.
 * @name DatasetFilterFunction
 * @callback
 * @param {Dataset|string} ds - the dataset to test
 * @return {boolean} if the dataset should be filtered
*/

/**
 * A dataset filter to drop admin datasets.
 * @type {DatasetFilterFunction}
 * @param {Dataset|string} ds - the dataset to test
 * @return {boolean} if the dataset should be filtered
 */
module.exports.adminFilter = (ds) => typeof ds.id !== 'undefined' ?
  !ds.name.includes('[admin]') :
  !ds.includes('[admin]');

/**
 * Returns a list of all datasets in Boa.
 * Optionally, you can pass in a function to filter the datasets.
 * @param {DatasetFilterFunction|Array<DatasetFilterFunction>}
 *    [filter] - an optional filter or array of filters
 * @return {Promise<Array<Dataset>>} the list of datasets
 */
BoaClient.prototype.datasets = async function(filter = undefined) {
  return new Promise((resolve, reject) =>
    this.client.methodCall('boa.datasets', [], function(error, value) {
      if (error) {
        return reject(error);
      }

      // we always drop dataset 1
      const names = value.filter((x) => x.id != 1);
      if (typeof filter === 'undefined') {
        return resolve(names);
      }

      if (Array.isArray(filter)) {
        return resolve(filter.reduce((d, f) => d.filter(f), names));
      }
      return resolve(names.filter(filter));
    }), (reason) => reject(reason));
};

/**
 * Returns a list of all dataset names in Boa.
 * @param {DatasetFilterFunction|Array<DatasetFilterFunction>}
 *    [filter] - an optional filter or array of filters
 * @return {Promise<Array<string>>} the list of dataset names
 */
BoaClient.prototype.datasetNames = async function(filter = undefined) {
  return new Promise(
      (resolve, reject) => {
        this.datasets(filter).then(
            (names) => resolve(names.map((x) => x.name)),
            (reason) => reject(reason),
        );
      },
      (reason) => reject(reason),
  );
};

/**
 * Compares the names of two datasets.
 * Accepts either a string, or a dataset entry.
 * For admin datasets, matches with or without the admin prefix.
 * @param {Dataset|string} first - the first dataset to compare
 * @param {Dataset|string} second - the second dataset to compare
 * @return {boolean} if the datasets are the same
 */
function compareNames(first, second) {
  let firstname = first;
  if (typeof first.id !== 'undefined') {
    firstname = first.name;
  }

  let secondname = second;
  if (typeof second.id !== 'undefined') {
    secondname = second.name;
  }

  return firstname.replace('[admin] ', '') ===
    secondname.replace('[admin] ', '');
}

/**
 * Gets a dataset with the given name.
 * @param {string} name - the dataset to get
 * @return {Promise<Dataset>} the dataset
 */
BoaClient.prototype.getDataset = async function(name) {
  return new Promise(
      (resolve, reject) => {
        this.datasets((ds) => compareNames(ds, name)).then(
            (names) => names.length != 1 ?
              reject(Error('No dataset found with that name.')) :
              resolve(names[0]),
            (reason) => reject(reason),
        );
      },
      (reason) => reject(reason),
  );
};

/**
 * Returns a count of the user's jobs.
 * @param {boolean} [pubonly=false] - only return public jobs (default: false)
 * @return {Promise<number>} the number of jobs
 */
BoaClient.prototype.jobCount = async function(pubonly = false) {
  return new Promise((resolve, reject) =>
    this.client.methodCall('boa.count', [pubonly], function(error, value) {
      if (error) {
        return reject(error);
      }

      return resolve(parseInt(value));
    }), (reason) => reject(reason));
};

/**
 * Runs a Boa query on a dataset.
 * @param {string} query - the Boa query
 * @param {Dataset} [dataset] - the dataset to query (or most recent, if none)
 * @return {Promise<jh.JobHandle>} a handle to the new job
 */
BoaClient.prototype.query = async function(query, dataset=undefined) {
  if (typeof dataset === 'undefined') {
    dataset = await this.datasets();
    dataset = dataset[0];
  }

  return new Promise((resolve, reject) =>
    this.client.methodCall('boa.submit', [query, dataset.id],
        function(error, value) {
          if (error) {
            return reject(error);
          }

          return resolve(jh.parseJob(this, value));
        }.bind(this)), (reason) => reject(reason));
};

/**
 * Gets a handle to a specified job.
 * @param {number} id - the ID of the job to get
 * @return {Promise<jh.JobHandle>} a handle to the job
 */
BoaClient.prototype.getJob = async function(id) {
  return new Promise((resolve, reject) =>
    this.client.methodCall('boa.job', [id], function(error, value) {
      if (error) {
        return reject(error);
      }

      return resolve(jh.parseJob(this, value));
    }.bind(this)), (reason) => reject(reason));
};

/**
 * Returns a list of Boa jobs submitted by the user.
 * @param {boolean} [pubonly=false] - only return public jobs (default: false)
 * @param {number} [offset=0] - skip this many jobs
 * @param {number} [length=1000] - max number of jobs to return (default: 1000)
 * @return {Promise<Array<jh.JobHandle>>}
 */
BoaClient.prototype.jobList =
 async function(pubonly=false, offset=0, length=1000) {
   return new Promise((resolve, reject) =>
     this.client.methodCall('boa.range', [pubonly, offset, length],
         function(error, value) {
           if (error) {
             return reject(error);
           }

           return resolve(value.map((job) => jh.parseJob(this, job)));
         }.bind(this)), (reason) => reject(reason));
 };

/**
 * Returns the last job submitted by the user.
 * @return {Promise<jh.JobHandle>} a handle to the last job
 */
BoaClient.prototype.lastJob = async function() {
  return new Promise(async (resolve, reject) => {
    const jobs = await this.jobList(false, 0, 1);
    return resolve(jobs[0]);
  }, (reason) => reject(reason));
};

// //////////////////////////////////////////////
// These methods are meant to be private       //
// Call the methods from the JobHandle instead //
// //////////////////////////////////////////////

BoaClient.prototype._job_url = async function(job) {
  return new Promise((resolve, reject) =>
    this.client.methodCall('job.url', [job.id],
        function(error, value) {
          if (error) {
            return reject(error);
          }

          return resolve(value);
        }), (reason) => reject(reason));
};

BoaClient.prototype._get_public = async function(job) {
  return new Promise((resolve, reject) =>
    this.client.methodCall('job.public', [job.id],
        function(error, value) {
          if (error) {
            return reject(error);
          }

          return resolve(!!value);
        }), (reason) => reject(reason));
};

BoaClient.prototype._set_public = async function(job, pub) {
  return new Promise((resolve, reject) =>
    this.client.methodCall('job.setpublic', [job.id, + pub],
        function(error, value) {
          if (error) {
            return reject(error);
          }

          return resolve();
        }), (reason) => reject(reason));
};

BoaClient.prototype._get_public_url = async function(job) {
  return new Promise((resolve, reject) =>
    this.client.methodCall('job.publicurl', [job.id],
        function(error, value) {
          if (error) {
            return reject(error);
          }

          return resolve(value);
        }), (reason) => reject(reason));
};

BoaClient.prototype._get_source = async function(job) {
  return new Promise((resolve, reject) =>
    this.client.methodCall('job.source', [job.id],
        function(error, value) {
          if (error) {
            return reject(error);
          }

          return resolve(value);
        }), (reason) => reject(reason));
};

const truncateWarning = '\n\n' +
  'NOTE: Output too big, only the first {0} is shown...\n';

/**
 * Gets the size as a readable string.
 * @param {number} size - the size to convert
 * @return {number} the size as a readable string
 */
function getSize(size) {
  let remaining = size;
  let power = 0;
  while (remaining >= 1024) {
    power++;
    remaining = remaining / 1024;
  }
  switch (power) {
    case 0:
      return Math.floor(remaining) + 'b';
    case 1:
      return Math.floor(remaining) + 'k';
    case 2:
      return Math.floor(remaining) + 'M';
    case 3:
      return Math.floor(remaining) + 'G';
    case 4:
      return Math.floor(remaining) + 'T';
    default:
      return size;
  }
}

BoaClient.prototype._get_output =
  async function(job, start=0, maxOutputSize=undefined) {
    return new Promise((resolve, reject) =>
      this.client.methodCall('job.output', [job.id],
          function(error, value) {
            if (error) {
              return reject(error);
            }

            const headers = {};
            if (!maxOutputSize) {
              headers['Accept-Encoding'] = 'gzip';
            } else {
              headers['Accept-Encoding'] = 'identity';
              headers['Range'] = `bytes=${start}-${maxOutputSize - 1}`;
            }

            let buff = Buffer.alloc(0);
            require('https').get(value, {
              'headers': headers,
            }, function(res) {
              const header = res.headers;
              const encoding = header['content-encoding'];
              if (encoding && encoding == 'gzip') {
                const gz = require('zlib').createGunzip();
                res.pipe(gz);
                res = gz;
              }

              res.on('data', function(chunk) {
                buff = Buffer.concat([buff, chunk]);
              });

              res.on('end', function() {
                if (maxOutputSize) {
                  if (header['content-range'].split('/')[1] > maxOutputSize) {
                    const maxSize = getSize(maxOutputSize);
                    const warning = truncateWarning.replace('{0}', maxSize);
                    buff = Buffer.concat([buff, Buffer.from(warning)]);
                  }
                }
                return resolve(buff.toString('utf8'));
              });
            });
          }), (reason) => reject(reason));
  };

BoaClient.prototype._download_output =
  async function(job, filename, start, maxOutputSize=undefined) {
    return new Promise((resolve, reject) =>
      this.client.methodCall('job.output', [job.id],
          async function(error, value) {
            if (error) {
              return reject(error);
            }

            const headers = {};
            if (!maxOutputSize && start == 0) {
              headers['Accept-Encoding'] = 'gzip';
            } else {
              if (!maxOutputSize) {
                maxOutputSize = 5000000000000000;
              }
              headers['Accept-Encoding'] = 'identity';
              headers['Range'] = `bytes=${start}-${maxOutputSize - 1}`;
            }

            let buff = Buffer.alloc(0);
            require('https').get(value, {
              'headers': headers,
            }, function(res) {
              const header = res.headers;
              if (res.statusCode == 416) {
                throw new Error(`job output starting byte '${start}' ` +
                  'must be less than the length of the output');
              }
              const encoding = header['content-encoding'];
              if (encoding && encoding == 'gzip') {
                const gz = require('zlib').createGunzip();
                res.pipe(gz);
                res = gz;
              }

              res.on('data', function(chunk) {
                buff = Buffer.concat([buff, chunk]);
              });

              res.on('end', function() {
                require('fs').createWriteStream(filename, 'utf8').write(buff);
                return resolve(true);
              });
            });
          }), (reason) => reject(reason));
  };

BoaClient.prototype._get_errors = async function(job) {
  return new Promise((resolve, reject) =>
    this.client.methodCall('job.compilerErrors', [job.id],
        function(error, value) {
          if (error) {
            return reject(error);
          }

          return resolve(value);
        }), (reason) => reject(reason));
};

BoaClient.prototype._get_output_size = async function(job) {
  return new Promise((resolve, reject) =>
    this.client.methodCall('job.outputsize', [job.id],
        function(error, value) {
          if (error) {
            return reject(error);
          }

          return resolve(parseInt(value));
        }), (reason) => reject(reason));
};

BoaClient.prototype._delete = async function(job) {
  return new Promise((resolve, reject) =>
    this.client.methodCall('job.delete', [job.id],
        function(error, value) {
          if (error) {
            return reject(error);
          }

          return resolve();
        }), (reason) => reject(reason));
};

BoaClient.prototype._resubmit = async function(job) {
  return new Promise((resolve, reject) =>
    this.client.methodCall('job.resubmit', [job.id],
        function(error, value) {
          if (error) {
            return reject(error);
          }

          return resolve();
        }), (reason) => reject(reason));
};

BoaClient.prototype._stop = async function(job) {
  return new Promise((resolve, reject) =>
    this.client.methodCall('job.stop', [job.id],
        function(error, value) {
          if (error) {
            return reject(error);
          }

          return resolve();
        }), (reason) => reject(reason));
};
