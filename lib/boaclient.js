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
var XMLRPCClient = require('./xmlrpc/client.js')

var BOA_API_ENDPOINT = 'https://boa.cs.iastate.edu/boa/?q=boa/api'
module.exports.BOA_API_ENDPOINT = BOA_API_ENDPOINT
var BOAC_API_ENDPOINT = 'https://boa.cs.iastate.edu/boac/?q=boa/api'
module.exports.BOAC_API_ENDPOINT = BOAC_API_ENDPOINT

function CSRF() {
    this.token = null;
}
CSRF.prototype = {
    set(t) {
        this.token = t
    },

    parseResponse: function () { },

    composeRequest: function (headers) {
        if (this.token !== null)
            headers['X-CSRF-Token'] = this.token
    }
}

function BoaClient(endpoint) {
    this.client = new XMLRPCClient(typeof endpoint !== 'undefined' ? endpoint : BOA_API_ENDPOINT, true)
    this.client.csrf = new CSRF()
    this.client.headersProcessors.processors.unshift(this.client.csrf)
}

BoaClient.prototype.login = function login(username, password, func, err) {
    var boa = this
    this.client.methodCall('user.login', [username, password], function (error, value, client) {
        if (error) {
            err(error)
        } else {
            if (typeof value.token !== 'undefined')
                client.csrf.set(value.token)
            // console.log(value)
            func(boa)
            boa.close()
        }
    })
}

BoaClient.prototype.close = function close() {
    this.client.methodCall('user.logout', [], function (error, value) {
        if (error)
            console.log(error)
        // console.log(value)
    })
}

BoaClient.prototype.datasets = function datasets() {
    this.client.methodCall('boa.datasets', [], function (error, value) {
        if (error)
            console.log(error)
        console.log(value)
    })
}

// 35     def ensure_logged_in(self) -> None: ...                                                                             
// 37     def dataset_names(self) -> List[str]: ...                                                                           
// 38     def get_dataset(self, name: str) -> Optional[Dict[str, str]]: ...                                                   
// 39     def last_job(self) -> JobHandle: ...                                                                                
// 40     def job_count(self, pub_only: bool = ...) -> int: ...                                                               
// 41     def query(self, query: str, dataset: Optional[Dict[str, str]] = ...) -> JobHandle: ...                              
// 42     def get_job(self, id: int) -> JobHandle: ...                                                                        
// 43     def job_list(self, pub_only: bool = ..., offset: int = ..., length: int = ...) -> List[JobHandle]: ...              

module.exports.BoaClient = BoaClient
