import * as THREE from "three";
import { extend, time } from "../core/util";
import { PostPass } from "../core/postPass";

THREE.WebGLRenderTarget

export interface NoiseTextureOptions {
	wrapS?: THREE.Wrapping;
	wrapT?: THREE.Wrapping;
	magFilter?: THREE.TextureFilter;
	minFilter?: THREE.TextureFilter;
	format?: number; // RGBAFormat;
	type?: THREE.TextureDataType; // UnsignedByteType;
}

export class WhiteNoise {
	private target: THREE.WebGLRenderTarget;

	constructor(renderer: THREE.WebGLRenderer, width: number, height: number, filter?: NoiseTextureOptions) {
		this.target = new THREE.WebGLRenderTarget(width, height, extend({
			depthBuffer: false,
			stencilBuffer: false
		}, extend(filter, {
			wrapS: THREE.RepeatWrapping,
			wrapT: THREE.RepeatWrapping,
			type: THREE.FloatType
		})));
		new PostPass({ fragmentShader: require("./shaders/blue-noise.frag") }).render({}, renderer, this.target);
	}

	get texture(): THREE.Texture {
		return this.target.texture;
	}
}
