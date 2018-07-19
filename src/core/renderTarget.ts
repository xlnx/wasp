import * as THREE from "three";

// render-target
function isPowerofTwo(x: number) {
	return (1 << Math.log2(x)) == x;
}

export class RenderTarget extends THREE.WebGLRenderTarget {
	constructor(width: number, height: number, pixel: boolean = false) {
		super(width, height, {
			wrapS: isPowerofTwo(width) && isPowerofTwo(height) ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping,
			wrapT: isPowerofTwo(width) && isPowerofTwo(height) ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping,
			magFilter: pixel ? THREE.NearestFilter : THREE.LinearFilter,
			minFilter: pixel ? THREE.NearestFilter : THREE.LinearFilter,
			type: THREE.FloatType,
			depthBuffer: false,
			stencilBuffer: false
		});
	}
}

export class SwappableRenderTarget {
	private targets: RenderTarget[] = [];
	constructor(width: number, height: number, pixel: boolean = false) {
		this.targets[0] = new RenderTarget(width, height, pixel);
		this.targets[1] = this.targets[0].clone();
	}
	get pending(): RenderTarget {
		return this.targets[1];
	}
	get current(): RenderTarget {
		return this.targets[0];
	}
	swap() {
		this.targets = this.targets.reverse();
	}
}
