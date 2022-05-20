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

/**
 * Asks a question on the console and returns their answer.
 * @param {String} question the question to ask
 * @return {*}
 */
async function ask(question) {
  const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => rl.question(question, (ans) => {
    rl.close();
    resolve(ans);
  }));
}

/**
 * The test client main function.
 */
async function main() {
  const boaapi = require('../lib/boaclient.js');

  const username = await ask('Enter your Boa username: ');
  const password = await ask('Enter your Boa password: ');

  const client = new boaapi.BoaClient(boaapi.BOA_API_ENDPOINT);

  client.login(username, password).then(
      async () => {
        await client.datasets().then(
            (datasets) => console.log(datasets),
        );

        await client.datasets([boaapi.adminFilter,
          (ds) => typeof ds.id !== 'undefined' ?
                  ds.name.toLowerCase().includes('kotlin') :
                  ds.toLowerCase().includes('kotlin')])
            .then(
                (datasets) => console.log(datasets),
            );

        await client.lastJob().then(
            async (job) => {
              console.log(await job.url);
              console.log(job.running);
            },
        );

        await client.query('test').then(
            async (job) => {
              console.log('before: ', job);
              console.log(await job.wait());
              console.log('after: ', job);
            },
        );

        await client.jobList(false, 0, 1).then(
            (jobs) => console.log(jobs),
        );
      },
  ).finally(
      () => client.close(),
  );
}

main();
