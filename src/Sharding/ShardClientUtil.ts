import { Client, Util } from 'discord.js';
import { SendOptions } from 'veza';
import { ClusterIPC } from '../IPC/ClusterIPC';
import { IPCEvents } from '../util/Constants';

export type IPCResult = {
	success: boolean;
	d: any;
};

export class ShardClientUtil {
	public readonly clusterCount = Number(process.env['CLUSTER_CLUSTER_COUNT']);
	public readonly shardCount = Number(process.env['CLUSTER_SHARD_COUNT']);
	public readonly id = Number(process.env['CLUSTER_ID']);
	public readonly ipc = new ClusterIPC(this.client, this.id, this.ipcSocket);

	constructor(public client: Client, public ipcSocket: string) {
	}

	public broadcastEval<T>(script: string | Function): Promise<T[]> {
		return this.ipc.broadcast<T>(script);
	}

	public masterEval<T>(script: string | Function): Promise<T> {
		return this.ipc.masterEval<T>(script);
	}

	public fetchClientValues(prop: string): Promise<any[]> {
		return this.ipc.broadcast(`this.${prop}`);
	}

	public async fetchGuild(id: string): Promise<Object> {
		const { success, d } = await this.send<IPCResult>({ op: IPCEvents.FETCHGUILD, d: id });
		if (!success) throw new Error('No guild with this id found!');
		return d;
	}

	public async fetchUser(id: string): Promise<Object> {
		const { success, d } = await this.send<IPCResult>({ op: IPCEvents.FETCHUSER, d: id });
		if (!success) throw new Error('No user with this id found!');
		return d;
	}

	public async fetchChannel(id: string): Promise<Object> {
		const { success, d } = await this.send<IPCResult>({ op: IPCEvents.FETCHCHANNEL, d: id });
		if (!success) throw new Error('No channel with this id found!');
		return d;
	}

	public restartAll(): Promise<void> {
		return this.ipc.server.send({ op: IPCEvents.RESTARTALL }, { receptive: false });
	}

	public async restart(clusterID: number): Promise<void> {
		const { success, d } = await this.ipc.server.send<IPCResult>({ op: IPCEvents.RESTART, d: clusterID });
		if (!success) throw Util.makeError(d);
	}

	public send<T>(data: any, options?: SendOptions): Promise<T> {
		if (typeof data === 'object') {
			if (data.op) return this.ipc.server.send(data, options);
		}
		return this.ipc.server.send({ op: IPCEvents.MESSAGE, d: data }, options);
	}

	public init(): Promise<void> {
		return this.ipc.init();
	}
}
