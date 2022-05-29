/* eslint-disable @typescript-eslint/naming-convention */
export const http = {
	version: 9,
	api: 'https://discordapp.com/api'
};

export const version = '3.1.0';

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

export enum SharderEvents {
	DEBUG = 'debug',
	MESSAGE = 'message',
	READY = 'ready',
	SPAWN = 'spawn',
	SHARD_READY = 'shardReady',
	SHARD_RECONNECT = 'shardReconnect',
	SHARD_RESUME = 'shardResume',
	SHARD_DISCONNECT = 'shardDisconnect',
	ERROR = 'error'
}
