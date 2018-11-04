# [No Final Name]

# About

[No Final Name] is a powerful sharding manager for the discord.js library. It uses Node.js's cluster module to spread shards evenly among all cores.

# Installation and Usage
To download [No Final Name], run `npm install [No Final Name]`
If you use Yarn, run `yarn add [No Final Name]`

To use [No Final Name], you can take a look at [example](https://github.com/Dev-Yukine/Custom-Sharder#example)

## ShardingManager
| Name                     | Description                                                                                                                                             |
|--------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| `token`                  | Your bot token. It will be used to query the Session endpoint and calculate how many shards to spawn.                                                   |
| `path`                   | path to a file that exports a class extending `Cluster`. The class must containt a method called "launch".                                              |
| `options.clientOptions`  | A object of client options you want to pass to the d.js client constructor.                                                                             |
| `options.clusterCount`   | The number of how many clusters you want. Defaults to the amount of cores                                                                               |
| `options.shardCount`     | The number of how many shards you want. Defaults to the amount that the gateway reccommends, taking into account `options.guildsPerShard`               |
| `options.development`    | Boolean to enable development mode.                                                                                                                     |
| `options.client`         | Class extending the d.js client you want to use for your clusters (usefull for Frameworks like `Commando`, `Klasa` or `Akario`). Default to d.js Client |
| `options.guildsPerShard` | Number to calculate how many guilds per shard. Defaults to 1000. Ignored if you set shardCount.                                                         |
| `options.respawn`        | Boolean indicating if exited Clusters should always get restarted. Default to true                                                                      |
| `options.ipcPort`        | Port that should be used for IPC connections. Default to 9999                                                                                           |

## Cluster

In every cluster when your code is loaded, you get access to `this.client` and `this.id`. `this.client` is an instance of the Client you provided with nearly no modifications beside the `shard` property, d.js build-in ShardClientUtil is replaced by [No Final Name]'s one.

### ShardClientUtil

| Method            | Example                                 | Description                                                           | Returns        |
|-------------------|-----------------------------------------|-----------------------------------------------------------------------|----------------|
| broadcastEval     | `client.shard.broadcastEval(script);`   | Eval's a script on all Clusters in context of the Client              | Promise<any[]> |
| masterEval        | `client.shard.masterEval(script);`      | Eval a script on the master process in context of the ShardingManager | Promise<any>   |
| fetchClientValues | `client.shard.fetchClientValues(prop);` | Fetch a Client value on all Clusters                                  | Promise<any[]> |
| restartAll        | `client.shard.restartAll()`             | Sends a message to the master process to kill & restart all Clusters  | Promise<void>  |
| restart           | `client.shard.restart(cluserID)`        | restart a specific cluster by id                                      | Promise<void>  |
| send              | `client.shard.send(data, options)`      | send a message to the master process                                  | Promise<void>  |

# Example

## Directory Tree

In this example our setup look like this:

```
Project/
├── node-modules/
│   ├── [No Final Name]
|
├── src/
│   ├── main.js
|   ├── index.js
```

## Example of main.js
```javascript
const { Cluster } = require('[No Final Name]');

module.exports = class extends Cluster {
	launch() {
		
	}
}
```

## Example of index.js
```javascript
const { ShardingManager } = require('[No Final Name]');
const { join } = require('path');
const sharder = new ShardingManager('YOUR_TOKEN', join(__dirname, 'main'), {
	// your options here
});
```