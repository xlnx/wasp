import * as THREE from "three";

export module Wasp {

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
		renderTarget?: THREE.WebGLRenderTarget, 
		forceClear?: boolean) 
	{
		for (let p in renderSource) {
			if (renderSource.hasOwnProperty(p) && !PostPass.uniforms.hasOwnProperty(p)) {
				this.shader.uniforms[p].value = renderSource[p];
			}
		}
		let { width, height } = renderTarget ? renderTarget : renderer.getSize();
		this.shader.uniforms.iResolution.value.set(width, height);
		renderer.render(this.scene, PostPass.camera, renderTarget, forceClear);
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
	constructor(texture?: THREE.Texture) {
		super({
			uniforms: {
				image: { type: 't', value: texture }
			},
			fragmentShader: `uniform sampler2D image; 
				void main() { gl_FragColor = texture2D(image, gl_FragCoord.xy/iResolution.xy); }`
		});
	}
}

export class PostUniformBlurPass extends PostPass {
	constructor(texture?: THREE.Texture) {
		super({
			defines: {
				MAX_SAMPLES: "128"
			},
			uniforms: {
				image: { type: 't', value: texture },
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

	// render(renderer: THREE.WebGLRenderer, 
	// 	renderTarget?: THREE.WebGLRenderTarget, 
	// 	forceClear?: boolean)
	// {
	// 	renderer.render()
	// }
}

export class PostGaussianBlurPass extends PostPass {
	constructor(texture?: THREE.Texture) {
		super({
			uniforms: {
				image: { type: 't', value: texture }
			},
			fragmentShader: `uniform sampler2D image;
				void main() { 
					gl_FragColor = texture2D(); 
				}`
		});
	}
}

}
