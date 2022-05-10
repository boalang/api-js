const boaapi = require('../lib/boaclient.js');

/**
 *
 * @param {*} query
 * @return {*}
 */
function ask(query) {
  const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close();
    resolve(ans);
  }));
}

/**
 *
 */
async function main() {
  const username = await ask('Enter your Boa username: ');
  const password = await ask('Enter your Boa password: ');

  const client = new boaapi.BoaClient(boaapi.BOA_API_ENDPOINT);

  await client.login(username, password);

  await client.datasets().then((datasets) => console.log(datasets));
  await client.datasets([boaapi.adminFilter,
    (ds) => typeof ds.id !== 'undefined' ?
            ds.name.toLowerCase().includes('kotlin') :
            ds.toLowerCase().includes('kotlin')])
      .then((datasets) => console.log(datasets));

  await client.close();
}

main();
