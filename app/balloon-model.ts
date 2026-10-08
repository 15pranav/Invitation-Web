import * as THREE from "three";
export const balloonPalette = [
  0xa8794c, 0xd9b36a, 0x7a3b45, 0xc4918a, 0x5d2a33, 0xe6d5b5, 0xa5524a,
];
// One source for normal and foreground balloons: original geometry, latex,
// highlights, translucency, tied neck, and curved string are preserved.
export function createBalloon(index: number, low = false) {
  const group = new THREE.Group();
  function add(
    g: THREE.BufferGeometry,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = group,
  ) {
    const object = new THREE.Mesh(g, m);
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  }
  const geometry = new THREE.SphereGeometry(0.55, low ? 20 : 32, 24),
    p = geometry.attributes.position;
  for (let j = 0; j < p.count; j++) {
    const y = p.getY(j);
    if (y < -0.18) {
      const n = 1 - (-y - 0.18) * 0.6;
      p.setX(j, p.getX(j) * n);
      p.setZ(j, p.getZ(j) * n);
    }
    p.setY(j, y * 1.08);
  }
  geometry.computeVertexNormals();
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      color: {
        value: new THREE.Color(balloonPalette[index % balloonPalette.length]),
      },
    },
    vertexShader: `varying vec3 n,v; void main(){vec4 p=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
    fragmentShader: `uniform vec3 color;varying vec3 n,v;void main(){vec3 N=normalize(n);float rim=pow(1.-abs(dot(N,normalize(v))),2.);float shine=pow(max(0.,dot(N,normalize(vec3(-.5,.7,1.)))),32.);float shine2=pow(max(0.,dot(N,normalize(vec3(.7,.15,1.)))),60.);gl_FragColor=vec4(color*(.85+rim*.65)+vec3(1.,.94,.82)*shine*.85+shine2*.25,.34+rim*.42+shine*.17);}`,
  });
  add(geometry, material, 0, 0, 0, group);
  const latex = new THREE.MeshStandardMaterial({
    color: balloonPalette[index % balloonPalette.length],
    roughness: 0.32,
    metalness: 0.2,
  });
  add(
    new THREE.CylinderGeometry(0.023, 0.025, 0.07, 8),
    latex,
    0,
    -0.595,
    0,
    group,
  );
  add(new THREE.ConeGeometry(0.05, 0.08, 8), latex, 0, -0.655, 0, group);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.68, 0),
    new THREE.Vector3(0.11, -1.12, 0.03),
    new THREE.Vector3(-0.12, -1.57, 0),
    new THREE.Vector3(0.06, -2.1, 0.04),
  ]);
  add(
    new THREE.TubeGeometry(curve, 32, 0.0025, 5, false),
    new THREE.MeshBasicMaterial({
      color: 0xd5b17d,
      transparent: true,
      opacity: 0.6,
    }),
    0,
    0,
    0,
    group,
  );
  return group;
}
export function disposeBalloons(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      geometries.add(o.geometry);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
        materials.add(m),
      );
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}
