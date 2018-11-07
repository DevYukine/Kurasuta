import { Worker, fork } from 'cluster';
import { ShardingManager, BaseCluster } from '..';
import { IPCEvents } from '../Util/Constants';
import { IPCResult } from '../Sharding/ShardClientUtil';
import { Util as DjsUtil } from 'discord.js';
import { Util } from '../Util/Util';
import { EventEmitter } from 'events';

export type ClusterOptions = {
	id: number;
	shards: number[];
	manager: ShardingManager;
};

export class Cluster extends EventEmitter {

	constructor(options: ClusterOptions) {
		super();
		this.id = options.id;
		this.shards = options.shards;
		this.manager = options.manager;

		this.once('ready', () => { this.ready = true; });
	}
	public ready = false;
	public id: number;
	public shards: number[];
	public worker?: Worker;
	public manager: ShardingManager;

	public async eval(script: string | Function) {
		script = typeof script === 'function' ? `(${script})(this)` : script;
		const { success, d } = await this.manager.ipc.node.sendTo<IPCResult>(`Cluster ${this.id}`, { op: IPCEvents.EVAL, d: script });
		if (!success) throw DjsUtil.makeError(d);
		return d;
	}

	public async fetchClientValue(prop: string) {
		const { success, d } = await this.manager.ipc.node.sendTo<IPCResult>(`Cluster ${this.id}`, { op: IPCEvents.EVAL, d: `this.${prop}` });
		if (!success) throw DjsUtil.makeError(d);
		return d;
	}

	public kill() {
		if (this.worker) {
			this.manager.emit('debug', `Killing Cluster ${this.id}`);
			this.worker.removeListener('exit', this._exitListener);
			this.worker.kill();
		}
	}

	public async respawn(delay = 500) {
		this.kill();
		if (delay) await DjsUtil.delayFor(delay);
		this.spawn();
	}

	public send(data: Object) {
		return this.manager.ipc.node.sendTo(`Cluster ${this.id}`, data);
	}

	public async spawn() {
		this.worker = fork({ CLUSTER_SHARDS: this.shards.join(','), CLUSTER_ID: this.id, CLUSTER_SHARD_COUNT: this.manager.shardCount, CLUSTER_CLUSTER_COUNT: this.manager.clusterCount });

		this.worker.on('exit', this._exitListener.bind(this));

		this.manager.emit('debug', `Worker spawned with id ${this.worker.id}`);

		this.manager.emit('spawn', this);

		await this._waitReady(this.shards.length);
		await Util.sleep(5000);
	}

	private _exitListener(code: number, signal: string) {
		this.ready = false;
		this.worker = undefined;

		if (this.manager.respawn) this.respawn();

		this.manager.emit('debug', `Worker exited with code ${code} and signal ${signal}, restarting ...`);
	}

	private _waitReady(shardCount: number): Promise<void> {
		return new Promise((resolve, reject) => {
			this.once('ready', resolve);
			setTimeout(() => reject(new Error(`Cluster ${this.id} took too long to get ready`)), (7500 * shardCount) * (this.manager.guildsPerShard / 1000));
		});
	}

	public static _run(manager: ShardingManager) {
		const ClusterClass = require(manager.path);
		const cluster: BaseCluster = new ClusterClass(manager);
		cluster.init();
	}
}
