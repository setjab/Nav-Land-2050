import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/110/three.module.js";

// Opprett scene, kamera og renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("scene") });
renderer.setSize(window.innerWidth, window.innerHeight);

// Legg til en kube (BoxGeometry)
const geometry = new THREE.BoxGeometry(2, 2, 2); // Sikre kubeform
const material = new THREE.MeshBasicMaterial({ color: 0xffd700 }); // Fargen er gul
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Animasjonsfunksjon
function animate() {
  requestAnimationFrame(animate);

  // Roter kube
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  renderer.render(scene, camera);
}

// Start animasjonen
animate();

// Responser ved endring av vindusstørrelse
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
