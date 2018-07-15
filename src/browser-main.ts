import * as THREE from "three";
import { Wasp } from "./wasp";

let wave = new Wasp.PostFFTWavePass(256);
let g = new Wasp.WebGLGBufferRenderTarget(256, 256);

Wasp.quickSceneRender((renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
	wave.render({}, renderer, g);
	renderer.render(scene, camera);
}, {
	antialias: true
}, (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
	let orbit = new THREE.OrbitControls(camera, renderer.domElement);
	orbit.enableZoom = true;

	let geometry = new THREE.PlaneGeometry(5, 5, 40, 40);
	let meshMaterial = new THREE.MeshStandardMaterial({
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
	light.position.set(0, 2, .5);
	scene.add(light);
	
	let lightHelper = new THREE.PointLightHelper(light, 0.1);
	scene.add(lightHelper);
});

