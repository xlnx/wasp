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
			this.shader = PostPass.createMaterial(typeof shader == "string" ? { fragmentShader: shader } : shader);
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
	
	protected static createMaterial(shader: PostPassShaderParameters): THREE.ShaderMaterial {
		let frag = `uniform vec2 iResolution;\n`;
		return new THREE.ShaderMaterial({
			defines: extend(shader.defines, {}),
			uniforms: extend(shader.uniforms, PostPass.uniforms),
			vertexShader: "void main() { gl_Position = vec4(position, 1); }",
			fragmentShader: frag + shader.fragmentShader
		});
	}
}

export interface ParticleOptions extends THREE.ShaderMaterialParameters {
	attributes?: {
		[key: string]: string
	}
}

export class ParticleSystem extends THREE.Points {
	private debug: RenderTarget;
	private debugImg: PostImagePass = new PostImagePass();
	private clock = new THREE.Clock();
	private count: number;
	private attributes: {
		name: string;
		value: SwappableRenderTarget;
		update: PostPass
	} [] = [];
	private needUpdate: boolean = true;

	public maxLifetime: number = 5;

	private static computeGeometry(geometry: THREE.BufferGeometry) {
		let geo = geometry.clone();
		let c = []; for (let i = 0; i != geo.attributes.position.count; ++i) c[i] = i;
		geo.addAttribute("vertex_id", new THREE.BufferAttribute(new Float32Array(c), 1).setDynamic(false));
		return geo;
	}
	private static computeMaterial(options: ParticleOptions, count: number) {
		options.attributes.lifetime = `
			vec4 update()
			{
				return vec4(lifetime.x + delta, 0, 0, 0);
			}
			vec4 init()
			{
				return vec4(0.);
			}
		`;
		let header = "";
		let uniforms = {};
		let fv = `\n
			attribute float vertex_id;
			void main()
			{
				vec2 uv = vec2(mod(vertex_id, 1024.)/1024., vertex_id/1024./float(N_LINES));
				vec4 wpos = modelMatrix * vec4(position, 1);
				wpos += vec4(texture2D(pos_map, uv).xyz, 0);
				gl_Position = projectionMatrix * viewMatrix * wpos;
			`;
		let ff = "\nvoid main() { vec2 uv = gl_FragCoord.xy/vec2(1024, N_LINES); "
		for (let attribute in options.attributes) {
			header += "uniform sampler2D " + attribute + "_map; vec4 " + attribute + ";\n";
			uniforms[attribute + "_map"] = { type: 'i' };
			fv += "\n" + attribute + " = texture2D(" + attribute + "_map, uv);";
			ff += "\n" + attribute + " = texture2D(" + attribute + "_map, uv);";
		}
		let newOpts: any = extend({ attributes: undefined }, options);
		if (!newOpts.defines) newOpts.defines = {}
		newOpts.defines.N_LINES = Math.ceil(count/1024);
		if (!newOpts.uniforms) newOpts.uniforms = {}
		newOpts.uniforms = extend(uniforms, newOpts.uniforms);
		if (!newOpts.vertexShader) newOpts.vertexShader = "\nvoid mainParticles() { gl_PointSize = 100.; }\n";
		if (!newOpts.fragmentShader) newOpts.fragmentShader = "\nvoid mainParticles() { gl_FragColor = vec4(1,0,0,1); }\n";
		newOpts.vertexShader = header + newOpts.vertexShader + fv + `
				mainParticles();
			}`;
		newOpts.fragmentShader = header + newOpts.fragmentShader + ff + `
				mainParticles(); 
			}`;
		return new THREE.ShaderMaterial(newOpts);
	}

	constructor(geometry: THREE.BufferGeometry, options: ParticleOptions) {
		super(ParticleSystem.computeGeometry(geometry), 
			ParticleSystem.computeMaterial(
				options,
				geometry.attributes.position.count
			)
		);
		this.count = geometry.attributes.position.count;
		this.buildAttributes(options);
	}
	private buildAttributes(options: ParticleOptions) {
		let header = "uniform float delta; uniform float maxLifetime;\n";
		let uniforms = { delta: { type: 'f' }, maxLifetime: { value: this.maxLifetime } };

		let footer = "\nvoid main() { vec2 uv = gl_FragCoord.xy/vec2(1024, N_LINES);";
		for (let attribute in options.attributes) {
			header += "uniform sampler2D " + attribute + "_map; vec4 " + attribute + ";\n";
			uniforms[attribute + "_map"] = { type: 'i' };
			footer += "\n" + attribute + " = texture2D(" + attribute + "_map, uv);";
		}
		footer += "\ngl_FragColor = lifetime.x > maxLifetime ? init() : update(); }";
		let nl = Math.ceil(this.count/1024);
		for (let attribute in options.attributes) {
			this.attributes.push({
				name: attribute,
				value: new SwappableRenderTarget(1024, nl, true),
				update: new PostPass({ 
					defines: { N_LINES: nl },
					uniforms: uniforms,
					fragmentShader: header + options.attributes[attribute] + footer
				})
			});
		}
	}
	update(renderer: THREE.WebGLRenderer) {
		let source = { delta: this.clock.getDelta() };
		let mat = (<THREE.ShaderMaterial>this.material);
		for (let attribute of this.attributes) {
			source[attribute.name + "_map"] = attribute.value.pending.texture;
			mat.uniforms[attribute.name + "_map"].value = attribute.value.pending.texture;
		}
		// renderer.setClearColor(new THREE.Color("blue"), 1);
		for (let attribute of this.attributes) {
			attribute.update.render(source, renderer, attribute.value.current);
			attribute.value.swap();
		}
		// renderer.setClearColor(new THREE.Color("black"), 1);
		// this.debugImg.render({ image: this.pos.current.texture }, renderer);
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
	
	private phillipsTarget: Wasp.RenderTarget;
	private gaussianTarget: Wasp.RenderTarget;
	
	private fftHTarget: Wasp.SwappableRenderTarget;
	private fftDxyTarget: Wasp.SwappableRenderTarget;
	private displacementTarget: Wasp.RenderTarget;
			
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
		
		this.phillipsTarget = new Wasp.RenderTarget(width, width, true);
		this.gaussianTarget = new Wasp.RenderTarget(width, width, true);
		this.displacementTarget = new Wasp.RenderTarget(width, width);

		this.fftHTarget = new SwappableRenderTarget(width, width, true);
		this.fftDxyTarget = new SwappableRenderTarget(width, width, true);
	}

	render(renderSource: Object, renderer: THREE.WebGLRenderer, 
		renderTarget?: THREE.WebGLRenderTarget) {
		if (this.needUpdate) {
			PostFFTWavePass.phillips.render({}, renderer, this.phillipsTarget);
			PostFFTWavePass.gaussian.render({}, renderer, this.gaussianTarget);
		}

		this.fftsrcH.render({ spectrum: this.phillipsTarget.texture, gaussian: this.gaussianTarget.texture }, renderer, this.fftHTarget.current);
		this.fftsrcDxy.render({ H: this.fftHTarget.current.texture }, renderer, this.fftDxyTarget.current);
		this.fftHTarget.swap(); this.fftDxyTarget.swap();

		this.fftvr.render({ prev: this.fftHTarget.pending.texture }, renderer, this.fftHTarget.current);
		this.fftvr.render({ prev: this.fftDxyTarget.pending.texture }, renderer, this.fftDxyTarget.current);
		this.fftHTarget.swap(); this.fftDxyTarget.swap();

		for (let i = 1; i != this.width; i *= 2) {
			this.fftv.render({ prev: this.fftHTarget.pending.texture, unit: i }, renderer, this.fftHTarget.current);
			this.fftv.render({ prev: this.fftDxyTarget.pending.texture, unit: i }, renderer, this.fftDxyTarget.current);
			this.fftHTarget.swap(); this.fftDxyTarget.swap();
		}

		this.ffthr.render({ prev: this.fftHTarget.pending.texture }, renderer, this.fftHTarget.current);
		this.ffthr.render({ prev: this.fftDxyTarget.pending.texture }, renderer, this.fftDxyTarget.current);
		this.fftHTarget.swap(); this.fftDxyTarget.swap();

		for (let i = 1; i != this.width; i *= 2) {
			this.ffth.render({ prev: this.fftHTarget.pending.texture, unit: i }, renderer, this.fftHTarget.current);
			this.ffth.render({ prev: this.fftDxyTarget.pending.texture, unit: i }, renderer, this.fftDxyTarget.current);
			this.fftHTarget.swap(); this.fftDxyTarget.swap();
		}

		this.fftend.render({ prevH: this.fftHTarget.pending.texture, prevDxy: this.fftDxyTarget.pending.texture }, renderer, this.displacementTarget);
		super.render(extend({ image: this.displacementTarget.texture }, renderSource), renderer, renderTarget);
	}
}

export function quickRender(render: (renderer: THREE.WebGLRenderer) => void, 
		callback?: (renderer: THREE.WebGLRenderer) => void,
		params?: THREE.WebGLRendererParameters) {
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
callback?: (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) => void,
		params?: THREE.WebGLRendererParameters) {
	let scene = new THREE.Scene();
	let camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
	camera.position.z = 4;
	quickRender((renderer: THREE.WebGLRenderer) => {
		render(renderer, scene, camera);
	}, (renderer: THREE.WebGLRenderer) => {
		window.addEventListener('resize', () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
		});
		let orbit = new THREE.OrbitControls(camera, renderer.domElement);
		orbit.enableZoom = true;
		callback(renderer, scene, camera);
	}, params);
}

}
