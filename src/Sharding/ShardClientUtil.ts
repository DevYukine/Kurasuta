import { Client, Util } from 'discord.js';
import { ClusterIPC } from '../IPC/ClusterIPC';
import { IPCEvents } from '../Util/Constants';
import { SendOptions } from 'veza';

export interface IPCResult {
	success: boolean;
	d: unknown;
}

export interface IPCError {
	name: string;
	message: string;
	stack: string;
}

export class ShardClientUtil {
	public readonly clusterCount = Number(process.env.CLUSTER_CLUSTER_COUNT);
	public readonly shardCount = Number(process.env.CLUSTER_SHARD_COUNT);
	public readonly id = Number(process.env.CLUSTER_ID);
	public readonly ipc = new ClusterIPC(this.client, this.id, this.ipcSocket);
	public readonly shards = String(process.env.CLUSTER_SHARDS).split(',');

	public constructor(public client: Client, public ipcSocket: string | number) {
	}

	public broadcastEval(script: string | Function): Promise<unknown[]> {
		return this.ipc.broadcast(script);
	}

	public masterEval(script: string | Function): Promise<unknown> {
		return this.ipc.masterEval(script);
	}

	public fetchClientValues(prop: string): Promise<unknown[]> {
		return this.ipc.broadcast(`this.${prop}`);
	}

	public async fetchGuild(id: string) {
		const { success, d } = await this.send({ op: IPCEvents.FETCHGUILD, d: id }) as IPCResult;
		if (!success) throw new Error('No guild with this id found!');
		return d as object;
	}

	public async fetchUser(id: string) {
		const { success, d } = await this.send({ op: IPCEvents.FETCHUSER, d: id }) as IPCResult;
		if (!success) throw new Error('No user with this id found!');
		return d as object;
	}

	public async fetchChannel(id: string) {
		const { success, d } = await this.send({ op: IPCEvents.FETCHCHANNEL, d: id }) as IPCResult;
		if (!success) throw new Error('No channel with this id found!');
		return d as object;
	}

	public async restartAll() {
		await this.ipc.server.send({ op: IPCEvents.RESTARTALL }, { receptive: false });
	}

	public async restart(clusterID: number) {
		const { success, d } = await this.ipc.server.send({ op: IPCEvents.RESTART, d: clusterID }) as IPCResult;
		if (!success) throw Util.makeError(d as IPCError);
	}

	public respawnAll() {
		return this.restartAll();
	}

	public send(data: any, options?: SendOptions) {
		if (typeof data === 'object' && data.op !== undefined) return this.ipc.server.send(data, options);
		return this.ipc.server.send({ op: IPCEvents.MESSAGE, d: data }, options);
	}

	public init() {
		return this.ipc.init();
	}
}
