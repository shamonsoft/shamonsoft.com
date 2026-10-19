import * as THREE from "../../vendor/three/three.module.js";

export class EnvironmentMapFactory {
  constructor(renderer) {
    this.renderer = renderer;
    this.pmremGenerator = new THREE.PMREMGenerator(renderer);
    this.pmremGenerator.compileEquirectangularShader();
    this.renderTarget = null;
  }

  create() {
    const scene = new THREE.Scene();

    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(24, 48, 48),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#0d1524"),
        side: THREE.BackSide,
      }),
    );
    scene.add(shell);

    const makePanel = (color, position, rotation, scale) => {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 0.2),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color) }),
      );
      panel.position.copy(position);
      panel.rotation.set(rotation.x, rotation.y, rotation.z);
      panel.scale.copy(scale);
      scene.add(panel);
    };

    makePanel("#7de0ff", new THREE.Vector3(0, 3.5, -5), new THREE.Euler(0.15, 0, 0), new THREE.Vector3(10, 6, 1));
    makePanel("#4d85ff", new THREE.Vector3(-6, 1.8, -1), new THREE.Euler(0, 0.7, 0), new THREE.Vector3(5, 7, 1));
    makePanel("#b8fff8", new THREE.Vector3(6.6, 2.4, -0.5), new THREE.Euler(0, -0.78, 0), new THREE.Vector3(4.5, 6.5, 1));
    makePanel("#17304f", new THREE.Vector3(0, -3.8, 0), new THREE.Euler(Math.PI / 2, 0, 0), new THREE.Vector3(12, 12, 1));

    scene.add(new THREE.AmbientLight("#9ed6ff", 0.28));

    const key = new THREE.PointLight("#d2f6ff", 80, 0, 2);
    key.position.set(0, 3, 5);
    scene.add(key);

    const left = new THREE.PointLight("#5881ff", 45, 0, 2);
    left.position.set(-8, 1.4, 3);
    scene.add(left);

    const right = new THREE.PointLight("#7ef6ff", 40, 0, 2);
    right.position.set(7, 2, 2);
    scene.add(right);

    this.renderTarget?.dispose();
    this.renderTarget = this.pmremGenerator.fromScene(scene, 0.045);
    scene.traverse((node) => {
      node.geometry?.dispose?.();
      node.material?.dispose?.();
    });
    return this.renderTarget.texture;
  }

  dispose() {
    this.renderTarget?.dispose();
    this.pmremGenerator?.dispose();
  }
}
