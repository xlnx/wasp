import * as THREE from "three";
import * as Wasp from "../../src/wasp";
// import * as Wasp from "../../src/";

let wave = new Wasp.PostFFTWavePass(256);
let g = new Wasp.RenderTarget(256, 256);

Wasp.quickSceneRender((renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
	wave.render({}, renderer, g);
	renderer.render(scene, camera);
}, (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
	let geometry = new THREE.PlaneGeometry(5, 5, 100, 100);
	let meshMaterial = new THREE.MeshPhongMaterial({
		color: 0x156289,
		emissive: 0x072534,
		side: THREE.DoubleSide,
		displacementMap: g.texture,
		displacementScale: 1e-4,
		flatShading: true		// hard edges
	});
	let plain = new THREE.Mesh(geometry, meshMaterial);
	scene.add(plain);
	// plain.rotateX(Math.PI/2);
	plain.rotateX(2*Math.PI/3);
	
	let light = new THREE.PointLight(0xffffff, 1, 0);
	light.position.set(0, .5, .5);
	scene.add(light);
	
	let lightHelper = new THREE.PointLightHelper(light, 0.1);
	scene.add(lightHelper);
}, {
	antialias: true
});

