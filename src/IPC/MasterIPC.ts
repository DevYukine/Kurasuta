import { EventEmitter } from 'events';
import { Node, NodeMessage } from 'veza';
import { Util } from 'discord.js';
import { ShardingManager } from '..';
import { isMaster } from 'cluster';
import { IPCEvents } from '../Util/Constants';

export class MasterIPC extends EventEmitter {
	[key: string]: any;
	public node: Node;

	constructor(public manager: ShardingManager) {
		super();
		this.node = new Node('Master')
			.on('client.identify', client => this.emit('debug', `[IPC] Client Connected: ${client.name}`))
			.on('client.disconnect', client => this.emit('debug', `[IPC] Client Disconnected: ${client.name}`))
			.on('client.destroy', client => this.emit('debug', `[IPC] Client Destroyed: ${client.name}`))
			.on('error', error => this.emit('error', error))
			.on('message', this._incommingMessage.bind(this));
		if (isMaster) this.node.serve(manager.ipcSocket);
	}

	public async broadcast<T>(code: string): Promise<T[]> {
		const data = await this.node.broadcast({ op: IPCEvents.EVAL, d: code });
		let errored = data.filter(res => !res.success);
		if (errored.length) {
			errored = errored.map(msg => msg.d);
			const error = errored[0];
			throw Util.makeError(error);
		}
		return data.map(res => res.d);
	}

	private _incommingMessage(message: NodeMessage) {
		if (isNaN(message.data.op)) return;
		const { op }: { op: number } = message.data;
		this[`_${IPCEvents[op].toLowerCase()}`](message);
	}

	private _message(message: NodeMessage) {
		const { d } = message.data;
		this.manager.emit('message', d);
	}

	private async _broadcast(message: NodeMessage) {
		const { d } = message.data;
		try {
			const data = await this.broadcast(d);
			message.reply({ success: true, d: data });
		} catch (error) {
			message.reply({ success: false, d: { name: error.name, message: error.message, stack: error.stack } });
		}
	}

	private _ready(message: NodeMessage) {
		const { d: id } = message.data;
		const cluster = this.manager.clusters.get(id);
		cluster!.emit('ready');
		this.manager.emit('debug', `Cluster ${id} became ready`);
		this.manager.emit('ready', cluster);
	}

	private _shardready(message: NodeMessage) {
		const { d: { shardID } } = message.data;
		this.manager.emit('debug', `Shard ${shardID} became ready`);
		this.manager.emit('shardReady', shardID);
	}

	private _shardreconnect(message: NodeMessage) {
		const { d: { shardID } } = message.data;
		this.manager.emit('debug', `Shard ${shardID} tries to reconnect`);
		this.manager.emit('shardReconnect', shardID);
	}

	private _shardresumed(message: NodeMessage) {
		const { d: { shardID, replayed } } = message.data;
		this.manager.emit('debug', `Shard ${shardID} resumed connection`);
		this.manager.emit('shardResumed', replayed, shardID);
	}

	private _sharddisconnect(message: NodeMessage) {
		const { d: { shardID, closeEvent } } = message.data;
		this.manager.emit('debug', `Shard ${shardID} disconnected!`);
		this.manager.emit('shardDisconnect', closeEvent, shardID);
	}

	private _restart(message: NodeMessage) {
		const { d: clusterID } = message.data;
		return this.manager.restart(clusterID)
			.then(() => message.reply({ success: true }))
			.catch(error => message.reply({ success: false, data: { name: error.name, message: error.message, stack: error.stack } }));
	}

	private async _mastereval(message: NodeMessage) {
		const { d } = message.data;
		try {
			const result = await this.manager.eval(d);
			return message.reply({ success: true, d: result });
		} catch (error) {
			return message.reply({ success: false, d: { name: error.name, message: error.message, stack: error.stack } });
		}
	}

	private _restartall() {
		this.manager.restartAll();
	}

	private async _fetchuser(message: NodeMessage) {
		return this._fetch(message, 'const user = this.users.get(\'{id}\'); user ? user.toJSON() : user;');
	}

	private async _fetchguild(message: NodeMessage) {
		return this._fetch(message, 'const guild = this.guilds.get(\'{id}\'); guild ? guild.toJSON() : guild;');
	}

	private _fetchchannel(message: NodeMessage) {
		return this._fetch(message, 'const channel = this.channels.get(\'{id}\'); channel ? channel.toJSON() : channel;');
	}

	private async _fetch(message: NodeMessage, code: string) {
		const { d: id } = message.data;
		const result = await this.broadcast<any>(code.replace('{id}', id));
		const realResult = result.filter(r => r);
		if (realResult.length) {
			return message.reply({ success: true, d: realResult[0] });
		}
		return message.reply({ success: false });
	}
}
