import { Cluster } from '../Cluster/Cluster';
import { CloseEvent } from '../Sharding/ShardingManager';

/* eslint-disable @typescript-eslint/naming-convention */
export const http = {
	version: 8,
	api: 'https://discordapp.com/api'
};

export const version = '2.2.3';

export enum IPCEvents {
	EVAL,
	MESSAGE,
	BROADCAST,
	READY,
	SHARDREADY,
	SHARDRECONNECT,
	SHARDRESUME,
	SHARDDISCONNECT,
	MASTEREVAL,
	RESTARTALL,
	RESTART,
	FETCHUSER,
	FETCHCHANNEL,
	FETCHGUILD
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SharderEvents = {
	debug: (message: string) => void;
	message: (message: unknown) => void;
	ready: (cluster: Cluster) => void;
	spawn: (cluster: Cluster) => void;
	shardReady: (replayed: number, shardID: number) => void;
	shardReconnect: (replayed: number, shardID: number) => void;
	shardResume: (replayed: number, shardID: number) => void;
	shardDisconnect: (closeEvent: CloseEvent, shardID: number) => void;
	error: (error: Error) => void;
};
