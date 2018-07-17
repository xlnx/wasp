import * as THREE from "three";
import { Wasp } from "../../src/wasp";

Wasp.quickSceneRender((renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => {
	renderer.render(scene, camera);
}, (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => {
	let p = new THREE.PointLight(0xffffff, 1, 0); 
	p.position.set(0, 2, 0);
	scene.add(new THREE.PointLightHelper(p, 0.1));
	scene.add(p);
	scene.add(new THREE.AmbientLight(0xffffff, 0.3));
	let box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), 
		new THREE.MeshPhysicalMaterial({ color: 0x125132, side: THREE.DoubleSide }));
	box.rotateX(-Math.PI/3);
	scene.add(box);
}, {
	antialias: true
})