import * as THREE from "three";
import { PostPass } from "../core/postPass";
import { RenderTarget, SwappableRenderTarget } from "../core/renderTarget";
import { extend } from "../core/util";

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

export class PostFFTWavePass extends PostImagePass {
	private static phillips = new PostPass(require("./shaders/phillips.frag"));
	private static gaussian = new PostPass(require("./shaders/gaussian.frag"));
	
	private phillipsTarget: RenderTarget;
	private gaussianTarget: RenderTarget;
	
	private fftHTarget: SwappableRenderTarget;
	private fftDxyTarget: SwappableRenderTarget;
	private displacementTarget: RenderTarget;
			
	private fftsrcH = new PostPass({
		uniforms: { spectrum: { type: 't' }, gaussian: { type: 't' } },
		fragmentShader: require("./shaders/fftsrcH.frag")
	});
	private fftsrcDxy = new PostPass({
		uniforms: { H: { type: 't' } },
		fragmentShader: require("./shaders/fftsrcDxy.frag")
	});
	private fftvr = new PostPass({
		uniforms: { prev: { type: 't' }, N: { type: 'i', value: this.width } },
		fragmentShader: require("./shaders/fftvr.frag")
	});
	private fftv = new PostPass({
		uniforms: { prev: { type: 't' }, unit: { type: 'f' }, N: { type: 'i', value: this.width } },
		fragmentShader: require("./shaders/fftv.frag")
	});
	private ffthr = new PostPass({
		uniforms: { prev: { type: 't' }, N: { type: 'i', value: this.width } },
		fragmentShader: require("./shaders/ffthr.frag")
	});
	private ffth = new PostPass({
		uniforms: { prev: { type: 't' }, unit: { type: 'f' }, N: { type: 'i', value: this.width } },
		fragmentShader: require("./shaders/ffth.frag")
	});
	private fftend = new PostPass({
		uniforms: { prevH: { type: 't' }, prevDxy: { type: 't' }, N: { type: 'i', value: this.width } },
		fragmentShader: require("./shaders/fftend.frag")
	});
	
	private needUpdate: boolean = true;
	
	constructor(private width: number) {
		super();

		if ((1 << Math.log2(width)) != width) {
			throw ("FFT only works on 2^k size.");
		}
		
		this.phillipsTarget = new RenderTarget(width, width, true);
		this.gaussianTarget = new RenderTarget(width, width, true);
		this.displacementTarget = new RenderTarget(width, width);

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