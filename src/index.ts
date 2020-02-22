import { ShardClientUtil as KurasutaShardClientUtil } from './Sharding/ShardClientUtil';

declare module 'discord.js' {
	interface ShardClientUtil extends KurasutaShardClientUtil {}
}

export { BaseCluster } from './Cluster/BaseCluster';
export { Cluster, ClusterOptions } from './Cluster/Cluster';
export { ClusterIPC } from './IPC/ClusterIPC';
export { MasterIPC } from './IPC/MasterIPC';
export { IPCResult, ShardClientUtil } from './Sharding/ShardClientUtil';
export { CloseEvent, SessionObject, SharderOptions, ShardingManager } from './Sharding/ShardingManager';
export { http, IPCEvents, SharderEvents, version } from './Util/Constants';
export * from './Util/Util';
