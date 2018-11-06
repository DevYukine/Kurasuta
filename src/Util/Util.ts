// Copyright (c) 2017-2018 dirigeants. All rights reserved. MIT license.

import { Constructable } from 'discord.js';
import { promisify } from 'util';

export type AnyObj = {
	[key: string]: any
};

export abstract class Util {
	static PRIMITIVE_TYPES = ['string', 'bigint', 'number', 'boolean'];

	static chunk<T>(entries: T[], chunkSize: number) {
		const clone = entries.slice();
		const chunks = [];
		while (clone.length) chunks.push(clone.splice(0, chunkSize));
		return chunks;
	}

	static deepClone(source: any): any {
		// Check if it's a primitive (with exception of function and null, which is typeof object)
		if (source === null || Util.isPrimitive(source)) return source;
		if (Array.isArray(source)) {
			const output = [];
			for (const value of source) output.push(Util.deepClone(value));
			return output;
		}
		if (Util.isObject(source)) {
			const output: AnyObj = {};
			for (const [key, value] of Object.entries(source)) output[key] = Util.deepClone(value);
			return output;
		}
		if (source instanceof Map) {
			const output = new (source.constructor() as Constructable<Map<any, any>>);
			for (const [key, value] of source.entries()) output.set(key, Util.deepClone(value));
			return output;
		}
		if (source instanceof Set) {
			const output = new (source.constructor() as Constructable<Set<any>>);
			for (const value of source.values()) output.add(Util.deepClone(value));
			return output;
		}
		return source;
	}

	static isPrimitive(value: any) {
		return Util.PRIMITIVE_TYPES.includes(typeof value);
	}

	static mergeDefault<T>(def: AnyObj, given: AnyObj): T {
		if (!given) return Util.deepClone(def);
		for (const key in def) {
			if (typeof given[key] === 'undefined') given[key] = Util.deepClone(def[key]);
			else if (Util.isObject(given[key])) given[key] = Util.mergeDefault(def[key], given[key]);
		}

		return given as any;
	}

	static isObject(input: any) {
		return input && input.constructor === Object;
	}

	static sleep(duration: number) {
		return promisify(setTimeout)(duration);
	}
}
