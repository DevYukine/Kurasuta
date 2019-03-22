import { BroadcastOptions } from 'veza';

export const http = {
	version: 7,
	api: 'https://discordapp.com/api'
};

export const version = '0.2.16';

export enum IPCEvents {
	EVAL,
	MESSAGE,
	BROADCAST,
	READY,
	SHARDREADY,
	SHARDRECONNECT,
	SHARDRESUMED,
	SHARDDISCONNECT,
	MASTEREVAL,
	RESTARTALL,
	RESTART,
	FETCHUSER,
	FETCHCHANNEL,
	FETCHGUILD
}

export const BROADCAST_OPTIONS: BroadcastOptions = {
	filter: /^K-C-\d+$/
};
