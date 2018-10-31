import { Client, Util } from 'discord.js';
import { SendOptions } from 'veza';
import { ClusterIPC } from './ClusterIPC';

export type IPCResult = {
	success: boolean;
	data: any;
};

export class ShardClientUtil {
	public readonly id: number;
	public readonly shardCount: number;
	public readonly clusterCount: number;
	public readonly ipc = new ClusterIPC(this.client, this.id, this.ipcPort);

	constructor(public client: Client, public ipcPort: number) {
		this.id = Number(process.env['CLUSTER_ID']);
		this.shardCount = Number(process.env['CLUSTER_SHARDCOUNT']);
		this.clusterCount = Number(process.env['CLUSTER_CLUSTERCOUNT']);
	}

	public broadcastEval(script: string): Promise<any[]> {
		return this.ipc.broadcast(script);
	}

	public fetchClientValues(prop: string): Promise<any[]> {
		return this.ipc.broadcast(`this.${prop}`);
	}

	public restartAll(): Promise<void> {
		return this.ipc.server.send({ event: '_restartAll' }, { receptive: false });
	}

	public async restart(clusterID: number) {
		const { success, data } = await this.ipc.server.send<IPCResult>({ event: '_restart', id: clusterID });
		if (!success) throw Util.makeError(data);
	}

	public send<T>(data: any, options: SendOptions): Promise<T> {
		if (typeof data === 'object') {
			if (data.event) return this.ipc.server.send(data, options);
		}
		return this.ipc.server.send({ event: '_message', data }, options);
	}

	public init(): Promise<void> {
		return this.ipc.init();
	}
}
