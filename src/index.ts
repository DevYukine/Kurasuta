import { SendOptions } from 'veza';
import { ClusterIPC } from './IPC/ClusterIPC';

declare module 'discord.js' {
	interface ShardClientUtil {
		ipcSocket: string | number;
		readonly clusterCount: number;
		readonly shardCount: number;
		readonly id: number;
		readonly ipc: ClusterIPC;
		broadcastEval(script: string | Function): Promise<unknown[]>;
		masterEval(script: string | Function): Promise<unknown>;
		fetchClientValues(prop: string): Promise<unknown[]>;
		fetchGuild(id: string): Promise<object>;
		fetchUser(id: string): Promise<object>;
		fetchChannel(id: string): Promise<object>;
		restartAll(): Promise<void>;
		restart(clusterID: number): Promise<void>;
		respawnAll(): Promise<void>;
		send(data: any, options?: SendOptions): Promise<unknown>;
		init(): Promise<void>;
	}
}

export { BaseCluster } from './Cluster/BaseCluster';
export { Cluster, ClusterOptions } from './Cluster/Cluster';
export { ClusterIPC } from './IPC/ClusterIPC';
export { MasterIPC } from './IPC/MasterIPC';
export { IPCResult, ShardClientUtil } from './Sharding/ShardClientUtil';
export { CloseEvent, SessionObject, SharderOptions, ShardingManager } from './Sharding/ShardingManager';
export { http, IPCEvents, SharderEvents, version } from './Util/Constants';
export * from './Util/Util';
