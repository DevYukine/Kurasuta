import { ShardingManager, SessionObject, SharderOptions, CloseEvent } from './Sharding/ShardingManager';
import { ShardClientUtil, IPCResult } from './Sharding/ShardClientUtil';
import { BaseCluster } from './Cluster/BaseCluster';
import { version, http, IPCEvents, SharderEvents } from './Util/Constants';
import { Cluster, ClusterOptions } from './Cluster/Cluster';
import { ClusterIPC } from './IPC/ClusterIPC';
import { MasterIPC } from './IPC/MasterIPC';
import * as Util from './Util/Util';
import { SendOptions } from 'veza';

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

export {
	BaseCluster,
	ShardingManager,
	Util,
	ShardClientUtil,
	SessionObject,
	SharderOptions,
	IPCResult,
	CloseEvent,
	http,
	IPCEvents,
	Cluster,
	ClusterOptions,
	ClusterIPC,
	MasterIPC,
	SharderEvents,
	version
};
