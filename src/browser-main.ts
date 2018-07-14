import * as THREE from "three";
import { Wasp } from "./wasp";
import * as threeOrbitControls from "three-orbit-controls";
const OrbitControls = threeOrbitControls(THREE);

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = 4;

let renderer = new THREE.WebGLRenderer({
	antialias: true
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);
document.body.appendChild(renderer.domElement);

// let pass = new Wasp.PostPass(require("./shaders/test.frag"));
let img = new Wasp.PostImagePass();
// let uv = new Wasp.PostUVPass();
// let blur = new Wasp.PostUniformBlurPass();

let fftBuffer = new THREE.WebGLRenderTarget(256, 256, {
	wrapS: THREE.RepeatWrapping,
	wrapT: THREE.RepeatWrapping,
	magFilter: THREE.NearestFilter,
	minFilter: THREE.NearestFilter,
	type: THREE.FloatType,
	depthBuffer: false,
	stencilBuffer: false
});
let phillipsTarget = fftBuffer.clone();
new Wasp.PostPass(require("./shaders/phillips.frag")).
	render({}, renderer, phillipsTarget);

let gaussianTarget = fftBuffer.clone();
new Wasp.PostPass(require("./shaders/gaussian.frag")).
	render({}, renderer, gaussianTarget);

let fftHTarget = [fftBuffer.clone(), fftBuffer.clone()];
let fftDxyTarget = [fftBuffer.clone(), fftBuffer.clone()];
new Wasp.PostPass({
	uniforms: {
		spectrum: { type: 't' },
		gaussian: { type: 't' }
	},
	fragmentShader: require("./shaders/fftsrcH.frag")
}).
	render({
		spectrum: phillipsTarget.texture,
		gaussian: gaussianTarget.texture
	}, renderer, fftHTarget[0]);

new Wasp.PostPass({
	uniforms: {
		H: { type: 't' }
	},
	fragmentShader: require("./shaders/fftsrcDxy.frag")
}).
	render({
		H: fftHTarget[0].texture
	}, renderer, fftDxyTarget[0]);

swapfftTargets();

let fftvr = new Wasp.PostPass({
	defines: {
		N: 256
	},
	uniforms: {
		prev: { type: 't' }
	},
	fragmentShader: require("./shaders/fftvr.frag")
});
fftvr.render({
		prev: fftHTarget[1].texture
	}, renderer, fftHTarget[0]);
fftvr.render({
		prev: fftDxyTarget[1].texture
	}, renderer, fftDxyTarget[0]);

swapfftTargets();

let fftv = new Wasp.PostPass({
	defines: {
		N: 256
	},
	uniforms: {
		prev: { type: 't' },
		unit: { type: 'f' }
	},
	fragmentShader: require("./shaders/fftv.frag")
});
for (let i = 1; i != 256; i *= 2) {
	fftv.render({
			prev: fftHTarget[1].texture,
			unit: i
		}, renderer, fftHTarget[0]);
	fftv.render({
			prev: fftDxyTarget[1].texture,
			unit: i
		}, renderer, fftDxyTarget[0]);
	swapfftTargets();
}

let ffthr = new Wasp.PostPass({
	defines: {
		N: 256
	},
	uniforms: {
		prev: { type: 't' }
	},
	fragmentShader: require("./shaders/ffthr.frag")
});
ffthr.render({
		prev: fftHTarget[1].texture
	}, renderer, fftHTarget[0]);
ffthr.render({
		prev: fftDxyTarget[1].texture
	}, renderer, fftDxyTarget[0]);

swapfftTargets();

let ffth = new Wasp.PostPass({
	defines: {
		N: 256
	},
	uniforms: {
		prev: { type: 't' },
		unit: { type: 'f' }
	},
	fragmentShader: require("./shaders/ffth.frag")
});
for (let i = 1; i != 256; i *= 2) {
	ffth.render({
			prev: fftHTarget[1].texture,
			unit: i
		}, renderer, fftHTarget[0]);
	ffth.render({
			prev: fftDxyTarget[1].texture,
			unit: i
		}, renderer, fftDxyTarget[0]);
	swapfftTargets();
}

let displacementTarget = new THREE.WebGLRenderTarget(256, 256, {
	wrapS: THREE.RepeatWrapping,
	wrapT: THREE.RepeatWrapping,
	magFilter: THREE.LinearFilter,
	minFilter: THREE.LinearFilter,
	type: THREE.FloatType,
	depthBuffer: false,
	stencilBuffer: false
});
new Wasp.PostPass({
	defines: {
		N: 256
	},
	uniforms: {
		prevH: { type: 't' },
		prevDxy: { type: 't' }
	},
	fragmentShader: require("./shaders/fftend.frag")
}).
	render({
		prevH: fftHTarget[1],
		prevDxy: fftDxyTarget[1]
	}, renderer, displacementTarget);

function swapfftTargets() {
	let fft = fftHTarget[0]; 
	fftHTarget[0] = fftHTarget[1];
	fftHTarget[1] = fft;
	fft = fftDxyTarget[0];
	fftDxyTarget[0] = fftDxyTarget[1];
	fftDxyTarget[1] = fft;
}

function render() {
	requestAnimationFrame(render);

	// uv.render({}, renderer, target);
	// blur.render({ image: target.texture }, renderer, targ);
	// img.render({ image: targ.texture }, renderer);
	img.render({ image: displacementTarget.texture }, renderer);
};

window.addEventListener('resize', () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);
});

render();
