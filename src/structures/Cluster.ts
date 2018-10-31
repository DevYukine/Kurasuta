import { ShardingManager } from '..';
import { Client, ClientOptions } from 'discord.js';
import { Util } from '../util/Util';
import { ShardClientUtil } from './ShardClientUtil';

export type CloseEvent = {
	code: number;
	reason: string;
	wasClean: boolean;
};

export abstract class Cluster {
	public readonly client: Client;
	public readonly id: number;

	constructor(public manager: ShardingManager) {
		const shards = process.env['CLUSTER_SHARDS']!.split(',').map(id => Number(id));
		const clientConfig: ClientOptions = Util.mergeDefault<ClientOptions>(manager.clientOptions, { shards, shardCount: shards.length, totalShardCount: Number(process.env['CLUSTER_SHARDCOUNT']) });
		this.client = new manager.client(clientConfig);
		const client: any = this.client;
		client.shard = new ShardClientUtil(client, manager.ipcPort);
		this.id = Number(process.env['CLUSTER_ID']);
	}

	public async init(): Promise<void> {
		const shardUtil = ((this.client.shard as any) as ShardClientUtil);
		await shardUtil.init();
		this.client.once('ready', () => shardUtil.send({ event: '_ready', id: this.id }, { receptive: false }));
		this.client.on('shardReady', (id: number) => shardUtil.send({ event: '_shardReady', id: this.id, shardID: id }, { receptive: false }));
		this.client.on('reconnecting', (id: number) => shardUtil.send({ event: '_shardReconnect', id: this.id, shardID: id }, { receptive: false }));
		this.client.on('resumed', (replayed: number, id: number ) => shardUtil.send({ event: '_shardResumed', id: this.id, shardID: id, replayed }, { receptive: false }));
		this.client.on('disconnect', (event: CloseEvent, id: number) => shardUtil.send({ event: '_shardDisconnect', id: this.id, shardID: id, closeEvent: event }, { receptive: false }));
		this.launch();
	}

	protected abstract launch(): void;
}
