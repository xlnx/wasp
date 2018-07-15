import * as THREE from "three";
import * as threeOrbitControls from "three-orbit-controls";

export module Wasp {

(<any>THREE).OrbitControls = threeOrbitControls(THREE);

function extend(ext: Object | undefined, base: Object) {
	let res = {};
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

export class WebGLGBufferRenderTarget extends THREE.WebGLRenderTarget {
	constructor(width: number, height: number, pixel: boolean = false) {
		super(width, height, {
			wrapS: THREE.RepeatWrapping,
			wrapT: THREE.RepeatWrapping,
			magFilter: pixel ? THREE.NearestFilter : THREE.LinearFilter,
			minFilter: pixel ? THREE.NearestFilter : THREE.LinearFilter,
			type: THREE.FloatType,
			depthBuffer: false,
			stencilBuffer: false
		});
	}
}

// geometries
class PostGeometry extends THREE.PlaneGeometry {
	constructor() {
		super(2, 2, 0, 0);
	}
}

export interface PostPassShaderParameters {
	defines?: any;
	uniforms?: any;
	fragmentShader?: string;
}

export class PostPass {
	protected static geometry: PostGeometry = new PostGeometry();
	protected static camera: THREE.Camera = new THREE.Camera();
	private static uniforms: Object = {
		iResolution: { value: new THREE.Vector2() }
	};

	protected scene: THREE.Scene = new THREE.Scene();
	protected shader: THREE.ShaderMaterial;

	constructor(shader: PostPassShaderParameters | string | THREE.ShaderMaterial) {
		if (shader instanceof THREE.ShaderMaterial) {
			this.shader = shader;
		} else {
			this.shader = PostPass.createMaterial(shader);
		}
		this.scene.add(new THREE.Mesh(PostPass.geometry, this.shader));
	}

	render(renderSource: Object, renderer: THREE.WebGLRenderer, 
		renderTarget?: THREE.WebGLRenderTarget) 
	{
		for (let p in renderSource) {
			if (renderSource.hasOwnProperty(p) && !PostPass.uniforms.hasOwnProperty(p)) {
				this.shader.uniforms[p].value = renderSource[p];
			}
		}
		let { width, height } = renderTarget ? renderTarget : renderer.getSize();
		this.shader.uniforms.iResolution.value.set(width, height);
		renderer.render(this.scene, PostPass.camera, renderTarget);
	}

	protected static createMaterial(shader: PostPassShaderParameters | string): THREE.ShaderMaterial {
		let frag = `uniform vec2 iResolution;\n`;
		let vert = "void main() { gl_Position = vec4(position, 1); }";
		return new THREE.ShaderMaterial(typeof shader == "string" ? {
			uniforms: PostPass.uniforms,
			vertexShader: vert,
			fragmentShader: frag + shader
		} : {
			defines: extend(shader.defines, {}),
			uniforms: extend(shader.uniforms, PostPass.uniforms),
			vertexShader: vert,
			fragmentShader: frag + shader.fragmentShader
		});
	}
}

export class PostUVPass extends PostPass {
	constructor() {
		super({
			fragmentShader: `uniform sampler2D image; 
				void main() { gl_FragColor = vec4(gl_FragCoord.xy/iResolution.xy, 0, 1); }`
		});
	}
}

export class PostImagePass extends PostPass {
	constructor() {
		super({
			uniforms: {
				image: { type: 't' }
			},
			fragmentShader: `uniform sampler2D image; 
				void main() { gl_FragColor = texture2D(image, gl_FragCoord.xy/iResolution.xy); }`
		});
	}
}

export class PostUniformBlurPass extends PostPass {
	constructor() {
		super({
			defines: {
				MAX_SAMPLES: "128"
			},
			uniforms: {
				image: { type: 't' },
				radius: { type: 'f', value: 10 },
				samples: { type: 'i', value: 10 }
			},
			fragmentShader: `uniform sampler2D image;
				uniform float radius;
				uniform int samples;
				void main() {
					vec4 col = vec4(0);
					vec2 uv = gl_FragCoord.xy/iResolution.xy;
					float r = radius / float(samples) / iResolution.x;
					uv.x -= r;
					int i = 0;
					for (int i = 0; i != MAX_SAMPLES; i += 1) if (i < samples * 2) {
						col += texture2D(image, uv); uv.x += r;
					} else break;
					gl_FragColor = col * .5 / float(samples);
				}`
		});
	}
}

export class PostGaussianBlurPass extends PostPass {
	constructor() {
		super({
			uniforms: {
				image: { type: 't' }
			},
			fragmentShader: `uniform sampler2D image;
				void main() { 
					gl_FragColor = texture2D(); 
				}`
		});
	}
}

export class PostScalePass extends PostPass {
	constructor() {
		super({
			uniforms: {
				image: { type: 't' },
				c: { type: 'f' }
			},
			fragmentShader: `uniform sampler2D image;
				uniform float c;
				void main() {
					gl_FragColor = c*texture2D(image, gl_FragCoord.xy/iResolution.xy);
				}`
		});
	}
}

export class PostFFTWavePass extends Wasp.PostImagePass {
	private static phillips = new Wasp.PostPass(require("./shaders/phillips.frag"));
	private static gaussian = new Wasp.PostPass(require("./shaders/gaussian.frag"));
	
	private phillipsTarget: Wasp.WebGLGBufferRenderTarget;
	private gaussianTarget: Wasp.WebGLGBufferRenderTarget;
	
	private fftHTarget: Wasp.WebGLGBufferRenderTarget[];
	private fftDxyTarget: Wasp.WebGLGBufferRenderTarget[];
	private displacementTarget: Wasp.WebGLGBufferRenderTarget;
			
	private fftsrcH = new Wasp.PostPass({
		uniforms: { spectrum: { type: 't' }, gaussian: { type: 't' } },
		fragmentShader: require("./shaders/fftsrcH.frag")
	});
	private fftsrcDxy = new Wasp.PostPass({
		uniforms: { H: { type: 't' } },
		fragmentShader: require("./shaders/fftsrcDxy.frag")
	});
	private fftvr = new Wasp.PostPass({
		uniforms: { prev: { type: 't' }, N: { type: 'i', value: this.width } },
		fragmentShader: require("./shaders/fftvr.frag")
	});
	private fftv = new Wasp.PostPass({
		uniforms: { prev: { type: 't' }, unit: { type: 'f' }, N: { type: 'i', value: this.width } },
		fragmentShader: require("./shaders/fftv.frag")
	});
	private ffthr = new Wasp.PostPass({
		uniforms: { prev: { type: 't' }, N: { type: 'i', value: this.width } },
		fragmentShader: require("./shaders/ffthr.frag")
	});
	private ffth = new Wasp.PostPass({
		uniforms: { prev: { type: 't' }, unit: { type: 'f' }, N: { type: 'i', value: this.width } },
		fragmentShader: require("./shaders/ffth.frag")
	});
	private fftend = new Wasp.PostPass({
		uniforms: { prevH: { type: 't' }, prevDxy: { type: 't' }, N: { type: 'i', value: this.width } },
		fragmentShader: require("./shaders/fftend.frag")
	});
	
	private needUpdate: boolean = true;
	
	constructor(private width: number) {
		super();

		if ((1 << Math.log2(width)) != width) {
			throw ("FFT only works on 2^k size.");
		}
		
		let t0 = new Wasp.WebGLGBufferRenderTarget(width, width, true);
		this.phillipsTarget = t0;
		this.gaussianTarget = t0.clone();
		this.displacementTarget = new Wasp.WebGLGBufferRenderTarget(width, width);

		this.fftHTarget = [t0.clone(), t0.clone()];
		this.fftDxyTarget = [t0.clone(), t0.clone()];
	}

	set size(width: number) {
		if ((1 << Math.log2(width)) != width) {
			console.warn("FFT only works on 2^k size.");
		} else {
			this.phillipsTarget.width = this.phillipsTarget.height = width;
			this.gaussianTarget.width = this.gaussianTarget.height = width;

			this.fftHTarget[0].width = this.fftHTarget[0].height = width;
			this.fftHTarget[1].width = this.fftHTarget[1].height = width;
			this.fftDxyTarget[0].width = this.fftDxyTarget[0].height = width;
			this.fftDxyTarget[1].width = this.fftDxyTarget[1].height = width;
			this.displacementTarget.width = this.displacementTarget.height = width;

			this.needUpdate = true;			
			this.width = width;
		}
	}

	private swapfftTargets() {
		let fft = this.fftHTarget[0]; 
		this.fftHTarget[0] = this.fftHTarget[1];
		this.fftHTarget[1] = fft;
		fft = this.fftDxyTarget[0];
		this.fftDxyTarget[0] = this.fftDxyTarget[1];
		this.fftDxyTarget[1] = fft;
	}

	render(renderSource: Object, renderer: THREE.WebGLRenderer, 
		renderTarget?: THREE.WebGLRenderTarget) {
		if (this.needUpdate) {
			PostFFTWavePass.phillips.render({}, renderer, this.phillipsTarget);
			PostFFTWavePass.gaussian.render({}, renderer, this.gaussianTarget);
		}

		this.fftsrcH.render({ spectrum: this.phillipsTarget.texture, gaussian: this.gaussianTarget.texture }, renderer, this.fftHTarget[1]);
		this.fftsrcDxy.render({ H: this.fftHTarget[1].texture }, renderer, this.fftDxyTarget[1]);

		this.fftvr.render({ prev: this.fftHTarget[1].texture }, renderer, this.fftHTarget[0]);
		this.fftvr.render({ prev: this.fftDxyTarget[1].texture }, renderer, this.fftDxyTarget[0]);
		this.swapfftTargets();

		for (let i = 1; i != this.width; i *= 2) {
			this.fftv.render({ prev: this.fftHTarget[1].texture, unit: i }, renderer, this.fftHTarget[0]);
			this.fftv.render({ prev: this.fftDxyTarget[1].texture, unit: i }, renderer, this.fftDxyTarget[0]);
			this.swapfftTargets();
		}

		this.ffthr.render({ prev: this.fftHTarget[1].texture }, renderer, this.fftHTarget[0]);
		this.ffthr.render({ prev: this.fftDxyTarget[1].texture }, renderer, this.fftDxyTarget[0]);
		this.swapfftTargets();

		for (let i = 1; i != this.width; i *= 2) {
			this.ffth.render({ prev: this.fftHTarget[1].texture, unit: i }, renderer, this.fftHTarget[0]);
			this.ffth.render({ prev: this.fftDxyTarget[1].texture, unit: i }, renderer, this.fftDxyTarget[0]);
			this.swapfftTargets();
		}

		this.fftend.render({ prevH: this.fftHTarget[1].texture, prevDxy: this.fftDxyTarget[1].texture }, renderer, this.displacementTarget);
		super.render(extend({ image: this.displacementTarget.texture }, renderSource), renderer, renderTarget);
	}
}

export function quickRender(render: (renderer: THREE.WebGLRenderer) => void, 
		params?: THREE.WebGLRendererParameters, 
		callback?: (renderer: THREE.WebGLRenderer) => void) {
	let renderer = new THREE.WebGLRenderer(params);
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setClearColor(0x000000, 1);
	document.body.appendChild(renderer.domElement);
	const fn = () => {
		requestAnimationFrame(fn);
		render(renderer);
	};
	window.addEventListener('resize', () => {
		renderer.setSize(window.innerWidth, window.innerHeight);
	});
	!callback || callback(renderer);
	fn();
}

export function quickSceneRender(render: (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) => void,
		params?: THREE.WebGLRendererParameters, 
		callback?: (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) => void) {
	let scene = new THREE.Scene();
	let camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
	camera.position.z = 4;
	quickRender((renderer: THREE.WebGLRenderer) => {
		render(renderer, scene, camera);
	}, params, (renderer: THREE.WebGLRenderer) => {
		window.addEventListener('resize', () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
		});
		callback(renderer, scene, camera);
	});
}

}
