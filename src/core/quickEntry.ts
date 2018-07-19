import * as THREE from "three";
import * as threeOrbitControls from "three-orbit-controls";

(<any>THREE).OrbitControls = threeOrbitControls(THREE);

export function quickRender(render: (renderer: THREE.WebGLRenderer) => void, 
		callback?: (renderer: THREE.WebGLRenderer) => void,
		params?: THREE.WebGLRendererParameters) {
	let renderer = new THREE.WebGLRenderer(params);
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setClearColor(0x000000, 1);
	document.body.appendChild(renderer.domElement);
	const fn = () => {
		requestAnimationFrame(fn);
		render(renderer);
	};
	window.addEventListener('resize', () => {
		renderer.setSize(window.innerWidth, window.innerHeight);
	});
	!callback || callback(renderer);
	fn();
}

export function quickSceneRender(render: (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) => void,
callback?: (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) => void,
		params?: THREE.WebGLRendererParameters) {
	let scene = new THREE.Scene();
	let camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
	camera.position.z = 4;
	quickRender((renderer: THREE.WebGLRenderer) => {
		render(renderer, scene, camera);
	}, (renderer: THREE.WebGLRenderer) => {
		window.addEventListener('resize', () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
		});
		let orbit = new THREE.OrbitControls(camera, renderer.domElement);
		orbit.enableZoom = true;
		callback(renderer, scene, camera);
	}, params);
}
