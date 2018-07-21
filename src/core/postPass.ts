import * as THREE from "three";
import { extend, time } from "./util";

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
		iResolution: { value: new THREE.Vector2() },
		iTime: { type: 'f' }
	};
	
	protected scene: THREE.Scene = new THREE.Scene();
	protected shader: THREE.ShaderMaterial;
	
	constructor(shader: PostPassShaderParameters | string) {
		this.shader = PostPass.createMaterial(typeof shader == "string" ? { fragmentShader: shader } : shader);
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
		this.shader.uniforms.iTime.value = time();
		renderer.render(this.scene, PostPass.camera, renderTarget);
	}
	
	protected static createMaterial(shader: PostPassShaderParameters): THREE.ShaderMaterial {
		let frag = `uniform vec2 iResolution;
			uniform float iTime;\n`;
		// console.log(extend(shader.uniforms, PostPass.uniforms));
		return new THREE.ShaderMaterial({
			defines: extend(shader.defines, {}),
			uniforms: extend(shader.uniforms, PostPass.uniforms),
			vertexShader: "void main() { gl_Position = vec4(position, 1); }",
			fragmentShader: frag + shader.fragmentShader
		});
	}
}
