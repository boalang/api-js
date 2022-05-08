const BoaClient = require('../lib/boaclient.js').BoaClient;
const BOA_API_ENDPOINT = require('../lib/boaclient.js').BOA_API_ENDPOINT;

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter your Boa username: ', function(username) {
  rl.question('Enter your Boa password: ', function(password) {
    new BoaClient(BOA_API_ENDPOINT+'f').login(username, password, (client) => {
      client.datasets();
    }, (error) => {
      console.log(error);
    });
    rl.close();
  });
});
