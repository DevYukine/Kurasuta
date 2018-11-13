import { CloseEvent } from '../Cluster/BaseCluster';
import { Client, ClientOptions } from 'discord.js';
import { MasterIPC } from '../IPC/MasterIPC';
import { Cluster } from '../Cluster/Cluster';
import { http } from '../Util/Constants';
import { EventEmitter } from 'events';
import { cpus, platform } from 'os';
import { isMaster } from 'cluster';
import * as Util from '../Util/Util';
import fetch from 'node-fetch';

export interface SharderOptions {
	token?: string;
	shardCount?: number | 'auto';
	clusterCount?: number;
	name?: string;
	development?: boolean;
	client?: typeof Client;
	clientOptions?: ClientOptions;
	guildsPerShard?: number;
	respawn?: boolean;
	ipcSocket?: string;
	timeout: number;
}

export interface SessionObject {
	url: string;
	shards: number;
	session_start_limit: {
		total: number;
		remaining: number;
		reset_after: number;
	};
}

export class ShardingManager extends EventEmitter {
	public clusters = new Map<number, Cluster>();
	public clientOptions: ClientOptions;
	public shardCount: number | 'auto';
	public guildsPerShard: number;
	public client: typeof Client;
	public clusterCount: number;
	public ipcSocket: string;
	public respawn: boolean;
	public timeout: number;
	public ipc: MasterIPC;

	private development: boolean;
	private token?: string;

	constructor(public path: string, options: SharderOptions) {
		super();
		this.clusterCount = options.clusterCount || cpus().length;
		this.guildsPerShard = options.guildsPerShard || 1000;
		this.clientOptions = options.clientOptions || {};
		this.development = options.development || false;
		this.shardCount = options.shardCount || 'auto';
		this.client = options.client || Client;
		this.respawn = options.respawn || true;
		this.ipcSocket = options.ipcSocket || (platform() === 'win32' ? '//./pipe/tmp/DiscordBot.sock' : '/tmp/DiscordBot.sock');
		this.token = options.token;
		this.timeout = options.timeout || 30000;
		this.ipc = new MasterIPC(this);

		this.ipc.on('debug', msg => this.emit('debug', msg));
		this.ipc.on('error', err => this.emit('error', err));

		if (!this.path) throw new Error('You need to supply a Path!');
	}

	public async spawn(): Promise<void> {
		if (isMaster) {
			if (this.shardCount === 'auto') {
				this.emit('debug', 'Fetching Session Endpoint');
				const { shards: recommendShards } = await this._fetchSessionEndpoint();

				this.shardCount = Util.calcShards(recommendShards, this.guildsPerShard);
				this.emit('debug', `Using recommend shard count of ${this.shardCount} shards with ${this.guildsPerShard} guilds per shard`);
			}

			this.emit('debug', `Starting ${this.shardCount} Shards in ${this.clusterCount} Clusters!`);

			if (this.shardCount < this.clusterCount) {
				this.clusterCount = this.shardCount;
			}

			const shardArray = [...Array(this.shardCount).keys()];
			const shardTuple = Util.chunk(shardArray, this.clusterCount);
			for (let index = 0; index < this.clusterCount; index++) {
				const shards = shardTuple.shift()!;

				const cluster = new Cluster({ id: index, shards, manager: this });

				this.clusters.set(index, cluster);

				await cluster.spawn();
			}
		} else {
			Util.startCluster(this);
		}
	}

	public async restartAll(): Promise<void> {
		this.emit('debug', 'Restarting all Clusters!');

		for (const cluster of this.clusters.values()) {
			await cluster.respawn();
		}
	}

	public async restart(clusterID: number): Promise<void> {
		const cluster = this.clusters.get(clusterID);
		if (!cluster) throw new Error('No Cluster with that ID found.');

		this.emit('debug', `Restarting Cluster ${clusterID}`);

		await cluster.respawn();
	}

	public fetchClientValues<T>(prop: string): Promise<T[]> {
		return this.ipc.broadcast<T>(`this.${prop}`);
	}

	public eval<T>(script: string): Promise<T> {
		return new Promise((resolve, reject) => {
			try {
				// tslint:disable-next-line:no-eval
				return resolve(eval(script));
			} catch (error) {
				reject(error);
			}
		});
	}

	public on(event: 'debug', listener: (message: string) => void): this;
	public on(event: 'message', listener: (message: any) => void): this;
	public on(event: 'ready' | 'spawn', listener: (cluster: Cluster) => void): this;
	public on(event: 'shardReady' | 'shardReconnect', listener: (shardID: number) => void): this;
	public on(event: 'shardResumed', listener: (replayed: number, shardID: number) => void): this;
	public on(event: 'shardDisconnect', listener: (closeEvent: CloseEvent, shardID: number) => void): this;
	public on(event: any, listener: (...args: any[]) => void): this {
		return super.on(event, listener);
	}

	public once(event: 'debug', listener: (message: string) => void): this;
	public once(event: 'message', listener: (message: any) => void): this;
	public once(event: 'ready' | 'spawn', listener: (cluster: Cluster) => void): this;
	public once(event: 'shardReady' | 'shardReconnect', listener: (shardID: number) => void): this;
	public once(event: 'shardResumed', listener: (replayed: number, shardID: number) => void): this;
	public once(event: 'shardDisconnect', listener: (closeEvent: CloseEvent, shardID: number) => void): this;
	public once(event: any, listener: (...args: any[]) => void): this {
		return super.once(event, listener);
	}

	private async _fetchSessionEndpoint(): Promise<SessionObject> {
		if (!this.token) throw new Error('No token was provided!');
		const res = await fetch(`${http.api}/v${http.version}/gateway/bot`, {
			method: 'GET',
			headers: { Authorization: `Bot ${this.token.replace(/^Bot\s*/i, '')}` },
		});
		if (res.ok) return res.json();
		throw res;
	}
}
