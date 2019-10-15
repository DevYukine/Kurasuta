import { ShardingManager } from '..';
import { Client, ClientOptions } from 'discord.js';
import { ShardClientUtil } from '../Sharding/ShardClientUtil';
import { IPCEvents } from '../Util/Constants';
import * as Util from '../Util/Util';

export abstract class BaseCluster {
	public readonly client: Client;
	public readonly id: number;

	constructor(public manager: ShardingManager) {
		const env = process.env;
		const shards = env.CLUSTER_SHARDS!.split(',').map(Number);
		const clientConfig: ClientOptions = Util.mergeDefault<ClientOptions>(manager.clientOptions, {
			shards,
			shardCount: Number(env.CLUSTER_SHARD_COUNT)
		});
		this.client = new manager.client(clientConfig);
		const client = this.client as any;
		client.shard = new ShardClientUtil(client, manager.ipcSocket);
		this.id = Number(env.CLUSTER_ID);
	}

	public async init() {
		const shardUtil = this.client.shard!;
		await shardUtil.init();
		this.client.once('ready', () => shardUtil.send({ op: IPCEvents.READY, d: this.id }, { receptive: false }));
		this.client.on('shardReady', id => shardUtil.send({ op: IPCEvents.SHARDREADY, d: { id: this.id, shardID: id } }, { receptive: false }));
		this.client.on('shardReconnecting', id => shardUtil.send({ op: IPCEvents.SHARDRECONNECT, d: { id: this.id, shardID: id } }, { receptive: false }));
		this.client.on('shardResume', (id, replayed) => shardUtil.send({ op: IPCEvents.SHARDRESUME, d: { id: this.id, shardID: id, replayed } }, { receptive: false }));
		this.client.on('shardDisconnect', ({ code, reason, wasClean }, id) => shardUtil.send({ op: IPCEvents.SHARDDISCONNECT, d: { id: this.id, shardID: id, closeEvent: { code, reason, wasClean } } }, { receptive: false }));
		await this.launch();
	}

	protected abstract launch(): Promise<void> | void;
}
