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

module.exports.BOA_API_ENDPOINT = 'https://boa.cs.iastate.edu/boa/?q=boa/api';
module.exports.BOAC_API_ENDPOINT = 'https://boa.cs.iastate.edu/boac/?q=boa/api';

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
 * @param {String} endpoint the URL endpoint of the Boa API
 */
function BoaClient(endpoint) {
  if (typeof endpoint === 'undefined') {
    endpoint = BOA_API_ENDPOINT;
  }
  this.client = new XMLRPCClient(endpoint, true);
  this.csrf = new CSRF();
  this.client.headersProcessors.processors.unshift(this.csrf);
}

BoaClient.prototype.login = async function login(username, password) {
  return new Promise((resolve) =>
    this.client.methodCall('user.login', [username, password],
        function(error, value) {
          if (error) {
            return reject(error);
          }

          if (typeof value.token !== 'undefined') {
            this.csrf.set(value.token);
          }
          return resolve(value);
        }.bind(this)), (reason) => reject(reason));
};

BoaClient.prototype.close = async function close() {
  return new Promise((resolve) =>
    this.client.methodCall('user.logout', [], function(err, value) {
      if (err) {
        return reject(err);
      }

      return resolve(value);
    }), (reason) => reject(reason));
};

/**
 * A dataset filter to drop admin datasets.
 * @param {*} ds the dataset to test, might be a string name only
 * @return {*} the predicate function
 */
module.exports.adminFilter = (ds) => typeof ds.id !== 'undefined' ?
  !ds.name.includes('[admin]') :
  !ds.includes('[admin]');

BoaClient.prototype.datasets = async function datasets(filter = null) {
  return new Promise((resolve) =>
    this.client.methodCall('boa.datasets', [], function(error, value) {
      if (error) {
        return reject(err);
      }

      // we always drop dataset 1
      const names = value.filter((x) => x.id != 1);
      if (!filter) {
        return resolve(names);
      }

      if (Array.isArray(filter)) {
        return resolve(filter.reduce((d, f) => d.filter(f), names));
      }
      return resolve(names.filter(filter));
    }), (reason) => reject(reason));
};

BoaClient.prototype.datasetNames = async function datasetNames(filter = null) {
  return new Promise(
      (resolve) => {
        this.datasets(filter).then(
            (names) => resolve(names.map((x) => x.name)),
            (reason) => reject(reason),
        );
      },
      (reason) => reject(reason),
  );
};

BoaClient.prototype.getDataset = async function getDataset(name) {
  return new Promise(
      (resolve) => {
        this.datasets((ds) => typeof ds.id !== 'undefined' ?
          ds.name == name : ds == name).then(
            (names) => names.length != 1 ?
              resolve(undefined) : resolve(names[0]),
            (reason) => reject(reason),
        );
      },
      (reason) => reject(reason),
  );
};

BoaClient.prototype.jobCount = async function jobCount(pubonly = false) {
  return new Promise((resolve) =>
    this.client.methodCall('boa.count', [pubonly], function(error, value) {
      if (error) {
        return reject(err);
      }

      return resolve(parseInt(value));
    }), (reason) => reject(reason));
};

// ensure_logged_in() -> None
// query(query: str, dataset: Optional[Dict[str, str]]=None) -> JobHandle
// get_job(id: int) -> JobHandle

// job_list(pub_only=False, offset: int=0, length: int=1000): List[JobHandle]
// last_job() -> JobHandle

module.exports.BoaClient = BoaClient;
