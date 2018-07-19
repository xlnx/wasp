import * as THREE from "three";
import { RenderTarget, SwappableRenderTarget } from "./renderTarget";
import { PostImagePass } from "../effects/postEffects";
import { PostPass } from "./postPass";
import { extend, substract } from "./util";

export interface GPUParticleMaterialParameters extends THREE.ShaderMaterialParameters {
	attributes?: {
		[key: string]: string
	}
}

export class GPUParticleMaterial extends THREE.ShaderMaterial {
	attributes: { [key: string]: any } = {};

	constructor(parameters?: GPUParticleMaterialParameters) {
		super(GPUParticleMaterial.computeParameters(parameters));
		this.generateAttributes(parameters);
	}

	private static computeAttributes(parameters?: GPUParticleMaterialParameters) {
		return extend(
			{ 
			lifetime: `
				vec4 update()
				{ return vec4(lifetime.x + delta, 0, 0, 0); }
				vec4 init()
				{ return vec4(0.); }\n`
			}, 
			parameters.attributes
		);
	}
	
	private static computeParameters(parameters?: GPUParticleMaterialParameters): THREE.ShaderMaterialParameters {
		let attrs = GPUParticleMaterial.computeAttributes(parameters);
		let params = substract([ "attributes" ], parameters);
		let header = "uniform float nlines;\n";
		let uniforms = { 
			nlines: { type: 'f' } 
		};
		let fv = `\n
			attribute float vertex_id;
			void main()
			{
				vec2 uv = vec2(mod(vertex_id, 1024.)/1024., vertex_id/1024./nlines);
				vec4 wpos = modelMatrix * vec4(position, 1);
				wpos += vec4(texture2D(pos_map, uv).xyz, 0);
				gl_Position = projectionMatrix * viewMatrix * wpos;
			`;
		let ff = "\nvoid main() { vec2 uv = gl_FragCoord.xy/vec2(1024, nlines); "
		for (let attribute in attrs) {
			header += "uniform sampler2D " + attribute + "_map; vec4 " + attribute + ";\n";
			uniforms[attribute + "_map"] = { type: 'i' };
			fv += "\n" + attribute + " = texture2D(" + attribute + "_map, uv);";
			ff += "\n" + attribute + " = texture2D(" + attribute + "_map, uv);";
		}
		params.uniforms = extend(uniforms, params.uniforms);
		if (!params.vertexShader) params.vertexShader = "\nvoid mainParticles() { gl_PointSize = 100.; }\n";
		if (!params.fragmentShader) params.fragmentShader = "\nvoid mainParticles() { gl_FragColor = vec4(1,0,0,1); }\n";
		params.vertexShader = header + params.vertexShader + fv + `
				mainParticles();
			}`;
		params.fragmentShader = header + params.fragmentShader + ff + `
				mainParticles(); 
			}`;
		return params;
	}

	private generateAttributes(parameters?: GPUParticleMaterialParameters) {
		let attrs = GPUParticleMaterial.computeAttributes(parameters);
		let header = `uniform float nlines;\n
			uniform float delta;\n
			uniform float maxLifetime;\n`;
		let uniforms = { 
			nlines: { type: 'f' },
			delta: { type: 'f' }, 
			maxLifetime: { type: 'f' }
		};
		let footer = "\nvoid main() { vec2 uv = gl_FragCoord.xy/vec2(1024, nlines);";

		for (let attribute in attrs) {
			header += "uniform sampler2D " + attribute + "_map; vec4 " + attribute + ";\n";
			uniforms[attribute + "_map"] = { type: 'i' };
			footer += "\n" + attribute + " = texture2D(" + attribute + "_map, uv);";
		}
		footer += "\ngl_FragColor = lifetime.x > maxLifetime ? init() : update(); }";
		for (let attribute in attrs) {
			this.attributes[attribute] = new PostPass({ 
				uniforms: uniforms, 
				fragmentShader: header + attrs[attribute] + footer
			});
		}
	}
}

export class GPUParticleSystem extends THREE.Points {
	private clock = new THREE.Clock();
	private nlines: number;
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

	constructor(geometry: THREE.BufferGeometry, material?: GPUParticleMaterial) {
		super(GPUParticleSystem.computeGeometry(geometry), material ? material : new GPUParticleMaterial({}));
		this.nlines = Math.ceil(geometry.attributes.position.count/1024);
		this.buildAttributes(material);
	}
	private buildAttributes(material: GPUParticleMaterial) {
		for (let attribute in material.attributes) {
			this.attributes.push({
				name: attribute,
				value: new SwappableRenderTarget(1024, this.nlines, true),
				update: material.attributes[attribute]
			});
		}
	}
	update(renderer: THREE.WebGLRenderer) {
		let source = { 
			nlines: this.nlines,
			delta: this.clock.getDelta(),
			maxLifetime: this.maxLifetime
		};
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