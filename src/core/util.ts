export function extend(ext: Object | undefined, base: Object) {
	let res = {};
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

