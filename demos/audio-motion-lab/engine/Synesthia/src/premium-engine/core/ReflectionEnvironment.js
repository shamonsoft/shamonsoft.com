import * as THREE from "../../vendor/three/three.module.js";

export class ReflectionEnvironment {
  constructor(renderer) {
    this.pmremGenerator = new THREE.PMREMGenerator(renderer);
    this.pmremGenerator.compileEquirectangularShader();
    this.target = null;
  }

  create() {
    const scene = new THREE.Scene();

    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(26, 48, 48),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#0b1320"),
        side: THREE.BackSide,
      }),
    );
    scene.add(shell);

    const addPanel = (color, position, rotation, scale) => {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 0.18),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color) }),
      );
      panel.position.copy(position);
      panel.rotation.set(rotation.x, rotation.y, rotation.z);
      panel.scale.copy(scale);
      scene.add(panel);
    };

    addPanel("#79ebff", new THREE.Vector3(0, 4.2, -5.2), new THREE.Euler(0.18, 0, 0), new THREE.Vector3(10, 6.2, 1));
    addPanel("#4e79ff", new THREE.Vector3(-7.2, 2.4, -1), new THREE.Euler(0, 0.76, 0), new THREE.Vector3(5.2, 7.8, 1));
    addPanel("#d7faff", new THREE.Vector3(7.4, 2.6, -0.6), new THREE.Euler(0, -0.82, 0), new THREE.Vector3(4.8, 7.2, 1));
    addPanel("#142640", new THREE.Vector3(0, -4.2, 0), new THREE.Euler(Math.PI / 2, 0, 0), new THREE.Vector3(13, 13, 1));

    scene.add(new THREE.AmbientLight("#b8deff", 0.22));

    const key = new THREE.PointLight("#d8faff", 88, 0, 2);
    key.position.set(0, 4, 6);
    scene.add(key);

    const left = new THREE.PointLight("#5979ff", 54, 0, 2);
    left.position.set(-8.5, 2.2, 3.5);
    scene.add(left);

    const right = new THREE.PointLight("#78ebff", 48, 0, 2);
    right.position.set(8.5, 2.5, 3.5);
    scene.add(right);

    this.target?.dispose();
    this.target = this.pmremGenerator.fromScene(scene, 0.05);

    scene.traverse((entry) => {
      entry.geometry?.dispose?.();
      entry.material?.dispose?.();
    });

    return this.target.texture;
  }

  dispose() {
    this.target?.dispose();
    this.pmremGenerator?.dispose();
  }
}
