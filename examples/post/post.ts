import * as Wasp from "../../src/wasp";

let post = new Wasp.PostImagePass();
let texture

Wasp.quickRender((renderer: THREE.WebGLRenderer) => {
	post.render({ image: texture }, renderer);
}, (renderer: THREE.WebGLRenderer) => {
	texture = new Wasp.WhiteNoise(renderer, 1600, 900).texture;
}, {
	antialias: true
})
