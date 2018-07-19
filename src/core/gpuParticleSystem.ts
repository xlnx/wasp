import * as THREE from "three";
import { RenderTarget, SwappableRenderTarget } from "./renderTarget";
import { PostImagePass } from "../effects/postEffects";
import { PostPass } from "./postPass";
import { extend } from "./util";

export interface GPUParticleOptions extends THREE.ShaderMaterialParameters {
	attributes?: {
		[key: string]: string
	}
}

export class GPUParticleSystem extends THREE.Points {
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
	private static computeMaterial(options: GPUParticleOptions, count: number) {
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

	constructor(geometry: THREE.BufferGeometry, options: GPUParticleOptions) {
		super(GPUParticleSystem.computeGeometry(geometry), 
			GPUParticleSystem.computeMaterial(
				options,
				geometry.attributes.position.count
			)
		);
		this.count = geometry.attributes.position.count;
		this.buildAttributes(options);
	}
	private buildAttributes(options: GPUParticleOptions) {
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