import { EventEmitter } from 'events';
import { Server, NodeMessage } from 'veza';
import { Util } from 'discord.js';
import { ShardingManager } from '..';
import { isMaster } from 'cluster';
import { IPCEvents, SharderEvents } from '../Util/Constants';
import { IPCRequest } from './ClusterIPC';

export class MasterIPC extends EventEmitter {
	[key: string]: any;
	public server: Server;

	constructor(public manager: ShardingManager) {
		super();
		this.server = new Server('Master')
			.on('connect', client => this.emit('debug', `Client Connected: ${client.name}`))
			.on('disconnect', client => this.emit('debug', `Client Disconnected: ${client.name}`))
			.on('error', error => this.emit('error', error))
			.on('message', this._incommingMessage.bind(this));
		if (isMaster) this.server.listen(manager.ipcSocket);
	}

	public async broadcast(code: string) {
		const data = await this.server.broadcast({ op: IPCEvents.EVAL, d: code });
		let errored = data.filter(res => !res.success);
		if (errored.length) {
			errored = errored.map(msg => msg.d);
			const error = errored[0];
			throw Util.makeError(error);
		}
		return data.map(res => res.d) as unknown[];
	}

	private _incommingMessage(message: NodeMessage) {
		if (isNaN(message.data.op)) return;
		const { op } = message.data as IPCRequest;
		this[`_${IPCEvents[op].toLowerCase()}`](message);
	}

	private _message(message: NodeMessage) {
		this.manager.emit(SharderEvents.MESSAGE, message);
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
		this._debug(`Cluster ${id} became ready`);
		this.manager.emit(SharderEvents.READY, cluster);
	}

	private _shardready(message: NodeMessage) {
		const { d: { shardID } } = message.data;
		this._debug(`Shard ${shardID} became ready`);
		this.manager.emit(SharderEvents.SHARD_READY, shardID);
	}

	private _shardreconnect(message: NodeMessage) {
		const { d: { shardID } } = message.data;
		this._debug(`Shard ${shardID} tries to reconnect`);
		this.manager.emit(SharderEvents.SHARD_RECONNECT, shardID);
	}

	private _shardresume(message: NodeMessage) {
		const { d: { shardID, replayed } } = message.data;
		this._debug(`Shard ${shardID} resumed connection`);
		this.manager.emit(SharderEvents.SHARD_RESUME, replayed, shardID);
	}

	private _sharddisconnect(message: NodeMessage) {
		const { d: { shardID, closeEvent } } = message.data;
		this._debug(`Shard ${shardID} disconnected!`);
		this.manager.emit(SharderEvents.SHARD_DISCONNECT, closeEvent, shardID);
	}

	private _restart(message: NodeMessage) {
		const { d: clusterID } = message.data;
		return this.manager.restart(clusterID)
			.then(() => message.reply({ success: true }))
			.catch(error => message.reply({ success: false, d: { name: error.name, message: error.message, stack: error.stack } }));
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

	private async _restartall() {
		await this.manager.restartAll();
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
		const result = await this.broadcast(code.replace('{id}', id));
		const realResult = result.filter(r => r);
		if (realResult.length) {
			return message.reply({ success: true, d: realResult[0] });
		}
		return message.reply({ success: false });
	}

	private _debug(message: string): void {
		this.emit(SharderEvents.DEBUG, message);
	}
}
