import * as THREE from "three";
import { Wasp } from "./wasp";
import * as threeOrbitControls from "three-orbit-controls";
const OrbitControls = threeOrbitControls(THREE);

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = 4;

let img = new Wasp.PostImagePass();
let blur = new Wasp.PostUniformBlurPass();
let wave = new Wasp.PostFFTWavePass(256);

let g = new Wasp.WebGLGBufferRenderTarget(256, 256);

window.addEventListener('resize', () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
});

Wasp.quickRender((renderer: THREE.WebGLRenderer) => {
	wave.render({}, renderer, g);
	blur.render({ image: g.texture }, renderer);
}, {
	antialias: true
});
