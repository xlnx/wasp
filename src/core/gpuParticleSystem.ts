import * as THREE from "three";
import { RenderTarget, SwappableRenderTarget } from "./renderTarget";
import { PostImagePass } from "../effects/postEffects";
import { PostPass } from "./postPass";
import { extend, substract } from "./util";

export interface GPUParticleMaterialParameters extends THREE.ShaderMaterialParameters {
	attributes?: {
		[key: string]: {
			components: number,
			update: string,
			init: string
		}
	}
}

export class GPUParticleMaterial extends THREE.ShaderMaterial {
	groups: any[] = [];

	constructor(parameters?: GPUParticleMaterialParameters) {
		super(GPUParticleMaterial.computeParameters(parameters));
		this.generateAttributes(parameters);
	}

	private static computeAttributes(parameters?: GPUParticleMaterialParameters) {
		let attrs = extend(
			{ 
			lifetime: {
				components: 1,
				update: `return lifetime + delta;`,
				init: `return 0.;`
			}
			}, 
			parameters.attributes
		);
		let res = [];
		let attrsVec = [null, [], [], []];
		for (let attribute in attrs) {
			switch (attrs[attribute].components) {
			case 4: res.push([ extend({ name: attribute }, attrs[attribute]) ]); break;
			case 1: case 2: case 3: attrsVec[attrs[attribute].components].push(extend({ name: attribute }, attrs[attribute])); break;
			default: throw "invalid components, should be [1,2,3,4].";
			}
		}
		while (attrsVec[3].length) {
			if (attrsVec[1].length) {
				res.push([ attrsVec[3].pop(), attrsVec[1].pop() ]);
			} else {
				res.push([ attrsVec[3].pop() ]);
			}
		}
		while (attrsVec[2].length > 1) {
			res.push([ attrsVec[2].pop(), attrsVec[2].pop() ]);
		}
		if (attrsVec[2].length) {
			switch (attrsVec[1].length) {
			case 0: res.push([ attrsVec[2].pop() ]); break;
			case 1: res.push([ attrsVec[2].pop(), attrsVec[1].pop() ]); break;
			default: res.push([ attrsVec[2].pop(), attrsVec[1].pop(), attrsVec[1].pop() ]); break;
			}
		}
		while (attrsVec[1].length) {
			let e = [];
			for (let i = 0; i != 4; ++i) {
				if (!attrsVec[1].length) break;
				e.push(attrsVec[1].pop());
			}
			res.push(e);
		}
		return res;
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
				vec2 uv = vec2(mod(vertex_id, 1024.)/1024., vertex_id/1024./nlines);`;
		let ff = "\nvoid main() { vec2 uv = gl_FragCoord.xy/vec2(1024, nlines); "
		for (let group in attrs) {
			for (let attr of attrs[group]) {
				header += [null,"float","vec2","vec3","vec4"][attr.components] + " " + attr.name + ";";
			}
			header += "uniform sampler2D attr" + group + "_map_impl_;\n";
			uniforms["attr" + group + "_map_impl_"] = { type: 'i' };
			let getter = "\nvec4 attr" + group + "_val = texture2D(attr" + group + "_map_impl_, uv);";
			let curr = 0;
			for (let attr of attrs[group]) {
				let comps = "xyzw".substr(curr, attr.components); curr += attr.components;
				getter += attr.name + " = attr" + group + "_val." + comps + ";";
			}
			fv += getter; ff += getter;
		}
		params.uniforms = extend(uniforms, params.uniforms);
		if (!params.vertexShader) params.vertexShader = "\nvoid main() { gl_PointSize = 100.; }\n";
		if (!params.fragmentShader) params.fragmentShader = "\nvoid main() { gl_FragColor = vec4(1,0,0,1); }\n";
		params.vertexShader = header + "\n#define main main_particles_impl_\n" + params.vertexShader + "\n#undef main\n" + fv + `
				vec4 wpos = modelMatrix * vec4(position, 1);
				wpos += vec4(pos.xyz, 0);
				gl_Position = projectionMatrix * viewMatrix * wpos;
				main_particles_impl_();
			}`;
		params.fragmentShader = header + "\n#define main main_particles_impl_\n" + params.fragmentShader + "\n#undef main\n" + ff + `
				main_particles_impl_(); 
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

		let init = [], update = [], funcs = [];
		for (let group in attrs) {
			for (let attr of attrs[group]) {
				header += [null,"float","vec2","vec3","vec4"][attr.components] + " " + attr.name + ";";
			}
			header += "uniform sampler2D attr" + group + "_map_impl_;\n";
			uniforms["attr" + group + "_map_impl_"] = { type: 'i' };
			footer += "\nvec4 attr" + group + "_val = texture2D(attr" + group + "_map_impl_, uv);";
			let curr = 0;
			init[group] = update[group] = "return vec4("; funcs[group] = "\n";
			for (let attr of attrs[group]) {
				let comps = "xyzw".substr(curr, attr.components); curr += attr.components;
				footer += attr.name + " = attr" + group + "_val." + comps + ";";
				funcs[group] += [null,"float","vec2","vec3","vec4"][attr.components] + " init_impl_" + attr.name + "() {\n" + attr.init + 
					"\n}\n" + [null,"float","vec2","vec3","vec4"][attr.components] + " update_impl_" + attr.name + "() {\n" + attr.update + "\n}\n";
				init[group] += "init_impl_" + attr.name + "(),"; update[group] += "update_impl_" + attr.name + "(),";
			}
			if (curr == 4) {
				init[group] = init[group].substr(0, init[group].length - 1) + ");";
				update[group] = update[group].substr(0, update[group].length - 1) + ");";
			} else {
				let c = []; while (curr++ != 4) c.push(0);
				init[group] += c.join(",") + ");"; update[group] += c.join(",") + ");";
			}
		}
		footer += "\ngl_FragColor = lifetime > maxLifetime ? init() : update(); }";
		for (let group in attrs) {
			this.groups.push(new PostPass({ 
				uniforms: uniforms, 
				fragmentShader: header + funcs[group] + "\nvec4 init() {\n" + init[group] + "\n}\nvec4 update() {\n" + update[group] + "\n}\n" + footer
			}));
		}
	}
}

export class GPUParticleSystem extends THREE.Points {
	private clock = new THREE.Clock();
	private nlines: number;
	private groups: { value: SwappableRenderTarget; update: PostPass } [] = [];

	public maxLifetime: number = 5;

	private static computeGeometry(geometry: THREE.BufferGeometry) {
		let geo = geometry.clone();
		let c = []; for (let i = 0; i != geo.attributes.position.count; ++i) c[i] = i;
		geo.addAttribute("vertex_id", new THREE.BufferAttribute(new Float32Array(c), 1).setDynamic(false));
		return geo;
	}

	constructor(geometry: THREE.BufferGeometry, material: GPUParticleMaterial) {
		super(GPUParticleSystem.computeGeometry(geometry), material);
		this.nlines = Math.ceil(geometry.attributes.position.count/1024);
		for (let group of material.groups) {
			this.groups.push({ value: new SwappableRenderTarget(1024, this.nlines, true), update: group });
		}
	}
	update(renderer: THREE.WebGLRenderer) {
		let source = { 
			nlines: this.nlines,
			delta: this.clock.getDelta(),
			maxLifetime: this.maxLifetime
		};
		let mat = (<THREE.ShaderMaterial>this.material);
		for (let group in this.groups) {
			source["attr" + group + "_map_impl_"] = this.groups[group].value.pending.texture;
			mat.uniforms["attr" + group + "_map_impl_"].value = this.groups[group].value.pending.texture;
		}
		// renderer.setClearColor(new THREE.Color("blue"), 1);
		for (let group of this.groups) {
			group.update.render(source, renderer, group.value.current);
			group.value.swap();
		}
		// renderer.setClearColor(new THREE.Color("black"), 1);
		// this.debugImg.render({ image: this.pos.current.texture }, renderer);
	}
}