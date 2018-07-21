import * as THREE from "three";
import * as Wasp from "../../src/wasp";

let img = new Wasp.PostImagePass();
// let p = new Wasp.GPUParticleSystem(new THREE.BoxBufferGeometry(1, 1, 1, 5, 5, 5), new Wasp.GPUParticleMaterial({
// 	attributes: {
// 		pos: {
// 			components: 4,
// 			update: "return pos + vec4(0, 0.2 * delta, 0, 0);",
// 			init: "return vec4(0, 0, 0, 0);"
// 		},
// 		color: {
// 			components: 3,
// 			update: "return color + vec3(.1, .05, -.1) * delta;",
// 			init: "return vec3(.2, .4, .5);"
// 		}
// 	},
// 	vertexShader: `
// 		void main()
// 		{
// 			gl_PointSize = 5.;
// 		}
// 	`,
// 	fragmentShader: `
// 		void main()
// 		{
// 			gl_FragColor = vec4(color, 1);
// 		}
// 	`
// }));
let p = new Wasp.GPUParticleSystem(new THREE.BoxBufferGeometry(3, 3, 3, 3, 3, 3), new Wasp.GPUParticleMaterial({
	attributes: {
		pos: {
			components: 4,
			update: "return pos + vec4(0, 0.2 * delta, 0, 0);",
			init: "return vec4(0, 0, 0, 0);"
		},
		color: {
			components: 3,
			update: "return color + vec3(.1, .05, -.1) * delta;",
			init: "return vec3(.2, .4, .5);"
		}
	},
	uniforms: {
		image: { value: THREE.ImageUtils.loadTexture("file:///C:\\Users\\Koishi\\Desktop\\wasp\\build\\gpuParticles\\Smoke-Element.png") }
	},
	vertexShader: `
		void main()
		{
			gl_PointSize = 200.;
		}
	`,
	transparent: true,
	fragmentShader: `
		uniform sampler2D image;
		void main()
		{
			gl_FragColor = texture2D(image, gl_PointCoord.xy); //vec4(color, 1);
		}
	`
}));
let targ = new Wasp.RenderTarget(window.innerWidth, window.innerHeight);

Wasp.quickSceneRender((renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => {
	// renderer.render(scene, camera);
	p.update(renderer);
	renderer.render(scene, camera);
	// img.render({ image: targ.texture }, renderer);
}, (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => {
	scene.add(p);
	let q = new THREE.PointLight(0xffffff, 1, 0); 
	q.position.set(0, 2, 0);
	scene.add(new THREE.PointLightHelper(q, 0.1));
	scene.add(q);
	scene.add(new THREE.AmbientLight(0xffffff, 0.3));
	// let box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), 
	// 	new THREE.MeshPhysicalMaterial({ color: 0x125132, side: THREE.DoubleSide }));
	// box.rotateX(-Math.PI/3);
	// scene.add(box);
}, {
	antialias: true
})
