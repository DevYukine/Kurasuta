import { EventEmitter } from 'events';
import { Node, NodeMessage, NodeSocket } from 'veza';
import { Client, Util, MessageAttachment } from 'discord.js';
import { ShardingManager } from '..';
import { isMaster } from 'cluster';

export type IPCConfig = {
	manager?: ShardingManager;
	client?: Client;
	id?: number;
};

export class IPC extends EventEmitter {
	public node: Node;
	public nodeSocket?: NodeSocket;
	public manager?: ShardingManager;
	public client?: Client;
	public id?: number;

	constructor(config: IPCConfig) {
		super();
		this.manager = config.manager;
		this.client = config.client;
		this.id = config.id;
		if (isMaster) {
			this.node = new Node('Master')
				.on('client.identify', client => this.emit('debug', `[IPC] Client Connected: ${client.name}`))
				.on('client.disconnect', client => this.emit('debug', `[IPC] Client Disconnected: ${client.name}`))
				.on('client.destroy', client => this.emit('debug', `[IPC] Client Destroyed: ${client.name}`))
				.on('error', error => this.emit('error', error))
				.on('message', this._messageMaster.bind(this))
				.serve(9999);
		} else {
			this.node = new Node(`Cluster ${this.id}`)
				.on('error', error => this.emit('error', error))
				.on('client.disconnect', client => this.emit('warn', `[IPC] Disconnected from ${client.name}`))
				.on('client.ready', client => this.emit('debug', `[IPC] Connected to: ${client.name}`))
				.on('message', this._messageCluster.bind(this));
		}
	}

	public async broadcast(script: string | Function): Promise<any[]> {
		script = typeof script === 'function' ? `(${script})(this)` : script;
		const { success, data } = await this.server.send({ event: '_broadcast', code: script });
		if (!success) throw Util.makeError(data);
		return data;
	}

	public async init() {
		this.nodeSocket = await this.node.connectTo('Master', 9999);
	}

	public async getResultFromNodes(code: string) {
		const data = await this.node.broadcast({ event: '_eval', code });
		let errored = data.filter(res => !res.success);
		if (errored.length) {
			errored = errored.map(msg => msg.data);
			const error = errored[0];
			throw Util.makeError(error);
		}
		return data.map(res => res.data);
	}

	public get server() {
		return this.nodeSocket!;
	}

	private _eval(script: string): string {
		const client: any = this.client!;
		return client._eval(script);
	}

	private _messageCluster(message: NodeMessage) {
		const { event, code } = message.data;
		if (event === '_eval') {
			try {
				message.reply({ success: true, data: this._eval(code) });
			} catch (error) {
				message.reply({ success: false, data: { name: error.name, message: error.message, stack: error.stack } });
			}
		}
	}

	private _messageMaster(message: NodeMessage) {
		const { event } = message.data;
		switch (event) {
			case '_broadcast':
				this._broadcast(message);
				break;
			case '_ready':
				this._ready(message);
				break;
			case '_shardReady':
				this._shardReady(message);
				break;
			case '_shardReconnect':
				this._shardReconnect(message);
				break;
			case '_shardResumed':
				this._shardResumed(message);
				break;
			case '_shardDisconnect':
				this._shardDisconnect(message);
				break;
			case '_restart':
				this._restart(message);
				break;
			case '_restartAll':
				this._restartAll();
				break;
		}
	}

	private async _broadcast(message: NodeMessage) {
		const { code } = message.data;
		try {
			const data = await this.getResultFromNodes(code);
			message.reply({ success: true, data });
		} catch (error) {
			message.reply({ success: false, data: { name: error.name, message: error.message, stack: error.stack } });
		}
	}

	private _ready(message: NodeMessage) {
		const { id } = message.data;
		const cluster = this.manager!.clusters.get(id)!;
		cluster.ready = true;
		this.manager!.clusters.set(id, cluster);
		this.manager!.emit('debug', `Cluster ${id} became ready`);
		this.manager!.emit('ready', cluster);
	}

	private _shardReady(message: NodeMessage) {
		const { shardID } = message.data;
		this.manager!.emit('debug', `Shard ${shardID} became ready`);
		this.manager!.emit('shardReady', shardID);
	}

	private _shardReconnect(message: NodeMessage) {
		const { shardID } = message.data;
		this.manager!.emit('debug', `Shard ${shardID} tries to reconnect`);
		this.manager!.emit('shardReconnect', shardID);
	}

	private _shardResumed(message: NodeMessage) {
		const { shardID } = message.data;
		this.manager!.emit('debug', `Shard ${shardID} resumed connection`);
		this.manager!.emit('shardResumed', shardID);
	}

	private _shardDisconnect(message: NodeMessage) {
		const { shardID } = message.data;
		this.manager!.emit('debug', `Shard ${shardID} disconnected!`);
		this.manager!.emit('shardDisconnect', shardID);
	}

	private _restart(message: NodeMessage) {
		const { clusterID } = message.data;
		return this.manager!.restart(clusterID)
			.then(() => message.reply({ success: true }))
			.catch(error => message.reply({ success: false, data: { name: error.name, message: error.message, stack: error.stack } }));
	}

	private _restartAll() {
		this.manager!.restartAll();
	}
}
