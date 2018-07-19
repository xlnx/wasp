import * as THREE from "three";
import * as Wasp from "../../src/wasp";

let img = new Wasp.PostImagePass();
let p = new Wasp.GPUParticleSystem(new THREE.BoxBufferGeometry(1, 1, 1, 50, 50, 50), new Wasp.GPUParticleMaterial({
	attributes: {
		pos: `
			vec4 update()
			{
				return pos + vec4(0, 0.2 * delta, 0, 0);
			}
			vec4 init()
			{
				return vec4(0, 0, 0, 0);
			}
		`,
		color: `
			vec4 update()
			{
				return color + vec4(.1, .05, -.1, 0.) * delta;
			}
			vec4 init()
			{
				return vec4(.2, .4, .5, 1.);
			}
		`
	},
	vertexShader: `
		void mainParticles()
		{
			gl_PointSize = 1.;
		}
	`,
	fragmentShader: `
		void mainParticles()
		{
			gl_FragColor = color;
		}
	`
}));
let targ = new Wasp.RenderTarget(window.innerWidth, window.innerHeight);

Wasp.quickSceneRender((renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => {
	// renderer.render(scene, camera);
	p.update(renderer);
	renderer.render(scene, camera, targ);
	img.render({ image: targ.texture }, renderer);
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
