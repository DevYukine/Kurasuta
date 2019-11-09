import { Client, ClientOptions } from 'discord.js';
import { MasterIPC } from '../IPC/MasterIPC';
import { Cluster } from '../Cluster/Cluster';
import { http, SharderEvents } from '../Util/Constants';
import { EventEmitter } from 'events';
import { cpus } from 'os';
import { isMaster, setupMaster } from 'cluster';
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
	ipcSocket?: string | number;
	timeout?: number;
	retry?: boolean;
	nodeArgs?: Array<string>;
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

export interface CloseEvent {
	code: number;
	reason: string;
	wasClean: boolean;
}

export class ShardingManager extends EventEmitter {
	public clusters = new Map<number, Cluster>();
	public clientOptions: ClientOptions;
	public shardCount: number | 'auto';
	public guildsPerShard: number;
	public client: typeof Client;
	public clusterCount: number;
	public ipcSocket: string | number;
	public respawn: boolean;
	public timeout: number;
	public retry: boolean;
	public ipc: MasterIPC;
	public nodeArgs?: Array<string>;

	private readonly development: boolean;
	private readonly token?: string;

	constructor(public path: string, options: SharderOptions) {
		super();
		this.clusterCount = options.clusterCount || cpus().length;
		this.guildsPerShard = options.guildsPerShard || 1000;
		this.clientOptions = options.clientOptions || {};
		this.development = options.development || false;
		this.shardCount = options.shardCount || 'auto';
		this.client = options.client || Client;
		this.respawn = options.respawn || true;
		this.ipcSocket = options.ipcSocket || 9999;
		this.retry = options.retry || true;
		this.timeout = options.timeout || 30000;
		this.token = options.token;
		this.nodeArgs = options.nodeArgs;
		this.ipc = new MasterIPC(this);

		this.ipc.on('debug', msg => this._debug(`[IPC] ${msg}`));
		this.ipc.on('error', err => this.emit(SharderEvents.ERROR, err));

		if (!this.path) throw new Error('You need to supply a Path!');
	}

	public async spawn() {
		if (isMaster) {
			if (this.shardCount === 'auto') {
				this._debug('Fetching Session Endpoint');
				const { shards: recommendShards } = await this._fetchSessionEndpoint();

				this.shardCount = Util.calcShards(recommendShards, this.guildsPerShard);
				this._debug(`Using recommend shard count of ${this.shardCount} shards with ${this.guildsPerShard} guilds per shard`);
			}

			this._debug(`Starting ${this.shardCount} Shards in ${this.clusterCount} Clusters!`);

			if (this.shardCount < this.clusterCount) {
				this.clusterCount = this.shardCount;
			}

			const shardArray = [...Array(this.shardCount).keys()];
			const shardTuple = Util.chunk(shardArray, this.clusterCount);
			const failed: Cluster[] = [];

			if (this.nodeArgs) setupMaster({ execArgv: this.nodeArgs });

			for (let index = 0; index < this.clusterCount; index++) {
				const shards = shardTuple.shift()!;

				const cluster = new Cluster({ id: index, shards, manager: this });

				this.clusters.set(index, cluster);

				try {
					await cluster.spawn();
				} catch {
					this._debug(`Cluster ${cluster.id} failed to start`);
					this.emit(SharderEvents.ERROR, new Error(`Cluster ${cluster.id} failed to start`));
					if (this.retry) {
						this._debug(`Requeuing Cluster ${cluster.id} to be spawned`);
						failed.push(cluster);
					}
				}
			}

			if (this.retry) await this.retryFailed(failed);
		} else {
			return Util.startCluster(this);
		}
	}

	public async restartAll() {
		this._debug('Restarting all Clusters!');

		for (const cluster of this.clusters.values()) {
			await cluster.respawn();
		}
	}

	public async restart(clusterID: number) {
		const cluster = this.clusters.get(clusterID);
		if (!cluster) throw new Error('No Cluster with that ID found.');

		this._debug(`Restarting Cluster ${clusterID}`);

		await cluster.respawn();
	}

	public fetchClientValues(prop: string) {
		return this.ipc.broadcast(`this.${prop}`);
	}

	public eval(script: string) {
		return new Promise((resolve, reject) => {
			try {
				// tslint:disable-next-line:no-eval
				return resolve(eval(script));
			} catch (error) {
				reject(error);
			}
		});
	}

	public on(event: SharderEvents.DEBUG, listener: (message: string) => void): this;
	public on(event: SharderEvents.MESSAGE, listener: (message: unknown) => void): this;
	public on(event: SharderEvents.READY | SharderEvents.SPAWN, listener: (cluster: Cluster) => void): this;
	public on(event: SharderEvents.SHARD_READY | SharderEvents.SHARD_RECONNECT, listener: (shardID: number) => void): this;
	public on(event: SharderEvents.SHARD_RESUME, listener: (replayed: number, shardID: number) => void): this;
	public on(event: SharderEvents.SHARD_DISCONNECT, listener: (closeEvent: CloseEvent, shardID: number) => void): this;
	public on(event: any, listener: (...args: any[]) => void): this {
		return super.on(event, listener);
	}

	public once(event: SharderEvents.DEBUG, listener: (message: string) => void): this;
	public once(event: SharderEvents.MESSAGE, listener: (message: unknown) => void): this;
	public once(event: SharderEvents.READY | SharderEvents.SPAWN, listener: (cluster: Cluster) => void): this;
	public once(event: SharderEvents.SHARD_READY | SharderEvents.SHARD_RECONNECT, listener: (shardID: number) => void): this;
	public once(event: SharderEvents.SHARD_RESUME, listener: (replayed: number, shardID: number) => void): this;
	public once(event: SharderEvents.SHARD_DISCONNECT, listener: (closeEvent: CloseEvent, shardID: number) => void): this;
	public once(event: any, listener: (...args: any[]) => void): this {
		return super.once(event, listener);
	}

	private async retryFailed(clusters: Cluster[]): Promise<void> {
		const failed: Cluster[] = [];

		for (const cluster of clusters) {
			try {
				this._debug(`Respawning Cluster ${cluster.id}`);
				await cluster.respawn();
			} catch {
				this._debug(`Cluster ${cluster.id} failed, requeuing...`);
				failed.push(cluster);
			}
		}

		if (failed.length) {
			this._debug(`${failed.length} Clusters still failed, retry...`);
			return this.retryFailed(failed);
		}
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

	private _debug(message: string) {
		this.emit(SharderEvents.DEBUG, message);
	}
}
