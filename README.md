# Kurasuta

# About

Kurasuta is a powerful sharding manager for the discord.js library. It uses Node.js's cluster module to spread shards evenly among all cores.

# Installation and Usage
To download Kurasuta, run `npm install kurasuta`
If you use Yarn, run `yarn add kurasuta`

To use Kurasuta, you can take a look at [example](#example)

## ShardingManager
**Important Note** Your Sharder file is also executed by each cluster to access the client, client options and ipcsocket properties. You should make sure to wrap all the code what should only run on the Master process in a if statement checking if the current process is the Master process. This does **not include** ShardingManager#spawn.

Example:
```js
const { isMaster } = require('cluster');

if (isMaster) {
	// Code to run on the Master process here
}

```
| Name                     	| Description                                                                                                                                                     	|
|--------------------------	|-----------------------------------------------------------------------------------------------------------------------------------------------------------------	|
| `path`                   	| path to a file that exports a class extending `Cluster`. The class must contain a method called `launch`.                                                       	|
| `options.clientOptions`  	| An object of client options you want to pass to the Discord.js client constructor.                                                                              	|
| `options.clusterCount`   	| The number of how many clusters you want. Defaults to the amount of cores.                                                                                      	|
| `options.shardCount`     	| The number of how many shards you want. Defaults to the amount that the gateway recommends, taking `options.guildsPerShard`into account.                        	|
| `options.development`    	| Boolean to enable development mode.                                                                                                                             	|
| `options.client`         	| Class extending the Discord.js client you want to use for your clusters (useful for Frameworks like Commando, Klasa, or Akairo). Defaults to Discord.js client. 	|
| `options.guildsPerShard` 	| Number to calculate how many guilds per shard. Defaults to 1000. Ignored if you set shardCount.                                                                 	|
| `options.respawn`        	| Boolean indicating if exited Clusters should always get restarted. Defaults to `true` .                                                                         	|
| `options.ipcSocket`      	| Path to Socket or Port that should be used for IPC connections. Defaults to Port 9999.                                                                          	|
| `options.token`          	| Token that should be used to fetch the recommend Shard count if no Shard count was provided.                                                                    	|
| `options.timeout`        	| Time per shard to wait before assuming that a Cluster can't get ready in ms. Defaults to 30000                                                                  	|
| `option.retry`           	| Boolean indicating if Clusters which fail to start but not exit should be restarted. Defaults to true                                                         	|

### Events

| Name            	| Argument(s)                                 	| Description                                              	|
|-----------------	|---------------------------------------------	|----------------------------------------------------------	|
| debug           	| message: `string`                           	| Emitted for debug messages                               	|
| message         	| message: `unknown`                          	| Emitted for custom messages sent from Cluster to Manager 	|
| ready           	| cluster: `Cluster`                          	| Emitted when a Cluster becomes ready                     	|
| spawn           	| cluster: `Cluster`                          	| Emitted when a Cluster spawns                            	|
| shardReady      	| shardID: `number`                           	| Emitted when a Shard becomes ready                       	|
| shardReconnect  	| shardID: `number`                           	| Emitted when a Shard reconnects                          	|
| shardResume     	| replayed: `number`, shardID: `number`       	| Emitted when a Shard resumes                             	|
| shardDisconnect 	| closeEvent: `CloseEvent`, shardID: `number` 	| Emitted when a Shard disconnects                         	|


## Cluster

In every cluster when your code is loaded, you get access to `this.client` and `this.id`. `this.client` is an instance of the `Client` you provided with nearly no modifications besides the `shard` property, Discord.js' build-in `ShardClientUtil` is replaced by Kurasuta's.

### ShardClientUtil

| Method            	| Example                                 	| Description                                                               	| Returns             	|
|-------------------	|-----------------------------------------	|---------------------------------------------------------------------------	|---------------------	|
| broadcastEval     	| `client.shard.broadcastEval(script);`   	| Evals a script on all clusters in context of the `Client`.                	| `Promise<unkown[]>` 	|
| masterEval        	| `client.shard.masterEval(script);`      	| Evals a script on the master process in context of the `ShardingManager`. 	| `Promise<unkown>`   	|
| fetchClientValues 	| `client.shard.fetchClientValues(prop);` 	| Fetch a `Client` value on all clusters.                                   	| `Promise<unkown[]>` 	|
| restartAll        	| `client.shard.restartAll();`            	| Sends a message to the master process to kill & restart all clusters.     	| `Promise<void>`     	|
| restart           	| `client.shard.restart(clusterID);`      	| Restart a specific cluster by id.                                         	| `Promise<void>`     	|
| send              	| `client.shard.send(data, options);`     	| send a message to the master process.                                     	| `Promise<void>`     	|

# Example

## Directory Tree

In this example our setup looks like this:

```
Project/
├── node-modules/
│   └── kurasuta/
|
└── src/
    ├── main.js
    └── index.js
```

## Example of main.js
```javascript
const { BaseCluster } = require('kurasuta');

module.exports = class extends BaseCluster {
	launch() {
		this.client.login('YOUR_TOKEN_HERE');
	}
};
```

## Example of index.js
```javascript
const { ShardingManager } = require('kurasuta');
const { join } = require('path');
const sharder = new ShardingManager(join(__dirname, 'main'), {
	// your options here
});

sharder.spawn();
```
