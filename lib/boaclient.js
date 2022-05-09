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
  this.client.csrf = new CSRF();
  this.client.headersProcessors.processors.unshift(this.client.csrf);
}

BoaClient.prototype.login = function login(username, password, func, err) {
  const boa = this;
  this.client.methodCall('user.login', [username, password],
      function(error, value, client) {
        if (error) {
          err(error);
        } else {
          if (typeof value.token !== 'undefined') {
            client.csrf.set(value.token);
          }
          func(boa);
          boa.close();
        }
      });
};

BoaClient.prototype.close = function close() {
  this.client.methodCall('user.logout', [], function(error, value) {
    if (error) {
      console.log(error);
    }
    // console.log(value)
  });
};

BoaClient.prototype.datasets = function datasets() {
  this.client.methodCall('boa.datasets', [], (error, value) => {
    if (error) {
      console.log(error);
    }
    console.log(value);
  });
};

// ensure_logged_in() -> None
// dataset_names() -> List[str]
// get_dataset(name: str) -> Optional[Dict[str, str]]
// last_job() -> JobHandle
// job_count(pub_only: bool=False) -> int
// query(query: str, dataset: Optional[Dict[str, str]]=None) -> JobHandle
// get_job(id: int) -> JobHandle
// job_list(pub_only=False, offset: int=0, length: int=1000): List[JobHandle]

module.exports.BoaClient = BoaClient;
