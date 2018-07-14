import * as THREE from "three";
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

let orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableZoom = true;

let group = new THREE.Group();

let geometry = 
// new THREE.TubeGeometry()
// new THREE.TorusGeometry(1);
new THREE.SphereGeometry(1);
// new THREE.RingGeometry(.5, 1);
// new THREE.PolyhedronGeometry()
// new THREE.PlaneGeometry(1, 1, 4, 4);
// new THREE.ParametricGeometry()
// new THREE.OctahedronGeometry(1);
// new THREE.LatheGeometry();
// new THREE.ExtrudeGeometry()
// new THREE.DodecahedronGeometry(1);
// new THREE.CylinderGeometry(.5, 1, 1, 6, 0);
// new THREE.ConeGeometry(1, 1, 6, 0);
// new THREE.BoxGeometry(1, 1, 1);

let lineMaterial = new THREE.LineBasicMaterial({
	color: 0xffffff, 
	transparent: true,
	opacity: 0.5,
	linewidth: 10
});
let meshMaterial = new THREE.MeshPhongMaterial({
	color: 0x156289,
	emissive: 0x072534,
	side: THREE.DoubleSide,
	flatShading: true		// hard edges
});

group.add(new THREE.Mesh(geometry, meshMaterial));
group.add(new THREE.LineSegments(new THREE.WireframeGeometry(geometry), lineMaterial));

let light = new THREE.PointLight(0xffffff, 1, 0);
light.position.set(0, 2, .5);
group.add(light);

let lightHelper = new THREE.PointLightHelper(light, 0.1);
scene.add(lightHelper);

scene.add(group);

function render() {
	requestAnimationFrame(render);

	// group.rotation.x += 0.005;
	group.rotation.y += 0.005;

	renderer.render(scene, camera);
};

window.addEventListener('resize', () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);
});

render();
