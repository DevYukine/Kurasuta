import { EventEmitter } from 'events';
import { Node, NodeMessage, NodeSocket } from 'veza';
import { Client, Util } from 'discord.js';
import { IPCEvents } from '../util/Constants';

export class ClusterIPC extends EventEmitter {
	public nodeSocket?: NodeSocket;
	public client: Client;
	public node: Node;

	constructor(discordClient: Client, public id: number, public socket: string) {
		super();
		this.client = discordClient;
		this.node = new Node(`Cluster ${this.id}`)
			.on('error', error => this.emit('error', error))
			.on('client.disconnect', client => this.emit('warn', `[IPC] Disconnected from ${client.name}`))
			.on('client.ready', client => this.emit('debug', `[IPC] Connected to: ${client.name}`))
			.on('message', this._message.bind(this));
	}

	public async broadcast<T>(script: string | Function): Promise<T[]> {
		script = typeof script === 'function' ? `(${script})(this)` : script;
		const { success, d } = await this.server.send({ op: IPCEvents.BROADCAST, d: script });
		if (!success) throw Util.makeError(d);
		return d;
	}

	public async masterEval<T>(script: string | Function): Promise<T> {
		script = typeof script === 'function' ? `(${script})(this)` : script;
		const { success, d } = await this.server.send({ op: IPCEvents.MASTEREVAL, d: script });
		if (!success) throw Util.makeError(d);
		return d;
	}

	public async init() {
		this.nodeSocket = await this.node.connectTo('Master', this.socket);
	}

	public get server() {
		return this.nodeSocket!;
	}

	private _eval(script: string): string {
		const client: any = this.client;
		return client._eval(script);
	}

	private _message(message: NodeMessage) {
		const { op, d } = message.data;
		if (op === IPCEvents.EVAL) {
			try {
				message.reply({ success: true, d: this._eval(d) });
			} catch (error) {
				message.reply({ success: false, d: { name: error.name, message: error.message, stack: error.stack } });
			}
		}
	}
}
