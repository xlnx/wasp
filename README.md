# wasp

wasp is a webgl framework based on **three.js**.
used for practice and quick rendering / demoing.

previous webgl2.0 framework is located [here](https://github.com/xlnx/bee)

## PostPass

use `Wasp.PostPass` for post effects. 

```typescript
interface PostPassShaderParameters {
	defines?: any;
	uniforms?: any;
	fragmentShader?: string;
}

class PostPass {
	constructor(shader: PostPassShaderParameters | string | THREE.ShaderMaterial);
}
```

usage:

```typescript
let phillipsTarget = new WebGLRenderTarget(256, 256);

let phillips = new Wasp.PostPass(require("./shaders/phillips.frag"));

phillips.render({}, renderer, phillipsTarget);
```

```typescript
let displacementTarget = new THREE.WebGLRenderTarget(256, 256, {
	wrapS: THREE.RepeatWrapping,
	wrapT: THREE.RepeatWrapping,
	magFilter: THREE.LinearFilter,
	minFilter: THREE.LinearFilter,
	type: THREE.FloatType,
	depthBuffer: false,
	stencilBuffer: false
});

let fftend = new Wasp.PostPass({
	defines: {
		N: 256
	},
	uniforms: {
		prevH: { type: 't' },
		prevDxy: { type: 't' }
	},
	fragmentShader: require("./shaders/fftend.frag")
});

fftend.render({
	prevH: fftHTarget[1],
	prevDxy: fftDxyTarget[1]
}, renderer, displacementTarget);
```

## PostPass Intergration 

under construction, see `wasp.ts`.