# About Boa JavaScript Client API

The Boa JavaScript Client API provides programmatic access to the Boa language and infrastructure from JavaScript.

## About Boa

For more information about Boa, please see the main website: http://boa.cs.iastate.edu/

## Creating a client

The main entry point for the API is a `BoaClient` object.  You use this to log in, submit queries, find datasets, log out, etc.  To instantiate this object, you must provide the API endpoint's URL.  The API has several constants for common endpoints:

- `BOA_API_ENDPOINT` - for the Boa MSR endpoint
- `BOAC_API_ENDPOINT` - for the Boa CORD-19 endpoint

For example if you want a client for the CORD-19 endpoint, you do the following:

```js
const client = new boaapi.BoaClient(boaapi.BOAC_API_ENDPOINT);
```

If you don't specify an endpoint, it will default to the MSR endpoint.

## Example Use (using MSR endpoint)

```js
const boaapi = require('@boa/boa-api/lib/boaclient');

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

async function main() {
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

        await client.jobList(true, 0, 5).then(
            async (jobs) => jobs.forEach((job) => console.log(job)),
        );
      },
  ).catch(
      (err) => console.log(err),
  ).finally(
      () => client.close(),
  );
}

main();
```
