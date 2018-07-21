import * as THREE from "three";

let clock = new THREE.Clock();
clock.start();

export function extend(ext: {[k: string]: any} | undefined, base: {[k: string]: any} | undefined) {
	let res: {[k: string]: any} = {};
	if (base == null) {
		base = {}
	}
	if (ext == null) {
		ext = {}
	}
	for (let p in base) {
		if (base.hasOwnProperty(p))
		res[p] = base[p];
	}
	if (ext) {
		for (let p in ext) {
			if (ext.hasOwnProperty(p))
			res[p] = ext[p];
		}
	}
	return res;
}

export function substract(sub: string[], base: {[k: string]: any} | undefined) {
	let res: {[k: string]: any} = {};
	if (base == null) {
		base = {}
	}
	for (let p in base) {
		if (base.hasOwnProperty(p) && sub.indexOf(p) < 0)
		res[p] = base[p];
	}
	return res;
}

export function restartClock() {
	clock.stop();
	clock.start();
}

export function time(): number {
	return clock.getElapsedTime();
}
