// Copyright (c) 2017-2018 dirigeants. All rights reserved. MIT license.

import { Constructable } from 'discord.js';
import { promisify } from 'util';
import { ShardingManager, BaseCluster } from '..';

export const PRIMITIVE_TYPES = ['string', 'bigint', 'number', 'boolean'];

export function chunk<T>(entries: T[], chunkSize: number) {
	const result = [];
	const amount = Math.floor(entries.length / chunkSize);
	const mod = entries.length % chunkSize;

	for (let i = 0; i < chunkSize; i++) {
		result[i] = entries.splice(0, i < mod ? amount + 1 : amount);
	}

	return result;
}

export function deepClone(source: any): any {
	// Check if it's a primitive (with exception of function and null, which is typeof object)
	if (source === null || isPrimitive(source)) return source;
	if (Array.isArray(source)) {
		const output = [];
		for (const value of source) output.push(deepClone(value));
		return output;
	}
	if (isObject(source)) {
		const output: Record<string, any> = {};
		for (const [key, value] of Object.entries(source)) output[key] = deepClone(value);
		return output;
	}
	if (source instanceof Map) {
		const output = new (source.constructor() as Constructable<Map<any, any>>)();
		for (const [key, value] of source.entries()) output.set(key, deepClone(value));
		return output;
	}
	if (source instanceof Set) {
		const output = new (source.constructor() as Constructable<Set<any>>)();
		for (const value of source.values()) output.add(deepClone(value));
		return output;
	}
	return source;
}

export function isPrimitive(value: any): value is string | bigint | number | boolean {
	return PRIMITIVE_TYPES.includes(typeof value);
}

export function mergeDefault<T>(def: Record<string, any>, given?: Record<string, any>): T {
	if (!given) return deepClone(def);
	for (const key in def) {
		if (given[key] === undefined) given[key] = deepClone(def[key]);
		else if (isObject(given[key])) given[key] = mergeDefault(def[key], given[key]);
	}

	return given as any;
}

export function isObject(input: any) {
	return input && input.constructor === Object;
}

export function sleep(duration: number) {
	return promisify(setTimeout)(duration);
}

export function calcShards(shards: number, guildsPerShard: number): number {
	return Math.ceil(shards * (1000 / guildsPerShard));
}

export async function startCluster(manager: ShardingManager) {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	const ClusterClassRequire = await import(manager.path);
	// eslint-disable-next-line @typescript-eslint/naming-convention
	const ClusterClass = ClusterClassRequire.default ? ClusterClassRequire.default : ClusterClassRequire;
	const cluster = new ClusterClass(manager) as BaseCluster;
	return cluster.init();
}
