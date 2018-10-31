import { EventEmitter } from 'events';
import { Node, NodeMessage, NodeSocket } from 'veza';
import { Client, Util } from 'discord.js';

export class ClusterIPC extends EventEmitter {
	public nodeSocket?: NodeSocket;
	public client: Client;
	public node: Node;

	constructor(discordClient: Client, public id: number, public port: number) {
		super();
		this.client = discordClient;
		this.node = new Node(`Cluster ${this.id}`)
			.on('error', error => this.emit('error', error))
			.on('client.disconnect', client => this.emit('warn', `[IPC] Disconnected from ${client.name}`))
			.on('client.ready', client => this.emit('debug', `[IPC] Connected to: ${client.name}`))
			.on('message', this._messageCluster.bind(this));
	}

	public async broadcast<T>(script: string | Function): Promise<T[]> {
		script = typeof script === 'function' ? `(${script})(this)` : script;
		const { success, data } = await this.server.send({ event: '_broadcast', code: script });
		if (!success) throw Util.makeError(data);
		return data;
	}

	public async masterEval<T>(script: string | Function): Promise<T> {
		script = typeof script === 'function' ? `(${script})(this)` : script;
		const { success, data } = await this.server.send({ event: '_masterEval', code: script });
		if (!success) throw Util.makeError(data);
		return data;
	}

	public async init() {
		this.nodeSocket = await this.node.connectTo('Master', 9999);
	}

	public get server() {
		return this.nodeSocket!;
	}

	private _eval(script: string): string {
		const client: any = this.client;
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
}
