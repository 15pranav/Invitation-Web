"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
type Props = {
  mode: "diya" | "darbar" | "birthday";
  lit: boolean;
  offering?: number;
  bellPulse?: number;
  reduced?: boolean;
  travelling?: boolean;
  ambientOnly?: boolean;
  reignite?: number;
  onBellTap?: () => void;
};
export default function Temple({
  mode,
  lit,
  offering = 0,
  bellPulse = 0,
  reduced = false,
  travelling = false,
  ambientOnly = false,
  reignite = 0,
  onBellTap,
}: Props) {
  const host = useRef<HTMLDivElement>(null),
    current = useRef({ lit, offering, bellPulse, travelling, ambientOnly, reignite, onBellTap });
  current.current = { lit, offering, bellPulse, travelling, ambientOnly, reignite, onBellTap };
  const [fallback, setFallback] = useState(false),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false,
      frame = 0;
    setFallback(false);
    setLoading(mode === "darbar");
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      setFallback(true);
      setLoading(false);
      return;
    }
    const low =
      reduced ||
      (navigator.hardwareConcurrency || 4) <= 4 ||
      ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ||
        8) <= 2;
    renderer.setPixelRatio(Math.min(devicePixelRatio, low ? 1 : 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
    const brass = new THREE.MeshStandardMaterial({
      color: 0x987644,
      metalness: 0.72,
      roughness: 0.36,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x21120f,
      metalness: 0.35,
      roughness: 0.45,
    });
    const rim = new THREE.MeshStandardMaterial({
      color: 0xb68d51,
      metalness: 0.6,
      roughness: 0.4,
      emissive: 0x6f380d,
      emissiveIntensity: 0.18,
    });
    const ambient = new THREE.AmbientLight(
      0xffd6ab,
      mode === "diya" ? 0.38 : 1.4,
    );
    scene.add(ambient);
    const key = new THREE.PointLight(0xffd8a3, mode === "diya" ? 5 : 35, 25);
    key.position.set(1, 3, 4);
    scene.add(key);
    const fill = new THREE.PointLight(0xb33218, 9, 18);
    fill.position.set(-3, 0, 2);
    scene.add(fill);
    const meshes: THREE.Mesh[] = [],
      textures: THREE.Texture[] = [],
      shaders: THREE.ShaderMaterial[] = [];
    function mesh(
      g: THREE.BufferGeometry,
      m: THREE.Material,
      x: number,
      y: number,
      z: number,
      parent: THREE.Object3D = scene,
    ) {
      const o = new THREE.Mesh(g, m);
      o.position.set(x, y, z);
      parent.add(o);
      meshes.push(o);
      return o;
    }
    const loader = new THREE.TextureLoader();
    function texture(path: string, done?: () => void) {
      const t = loader.load(path, done, undefined, () => {
        if (!disposed && path.includes("mata")) {
          setFallback(true);
          setLoading(false);
        }
      });
      t.colorSpace = THREE.SRGBColorSpace;
      textures.push(t);
      return t;
    }
    const vertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
    function glow(
      size: number,
      x: number,
      y: number,
      z: number,
      opacity: number,
      rays = false,
    ) {
      const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          time: { value: 0 },
          strength: { value: opacity },
          reaction: { value: 0 },
          wave: { value: 10 },
        },
        vertexShader: vertex,
        fragmentShader: `varying vec2 vUv; uniform float time,strength,reaction,wave; void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float a=atan(p.y,p.x);float core=exp(-r*r*5.)*.6;float rays=${rays ? "pow(abs(sin(a*18.+sin(a*7.)*.3+time*.025)),18.)*exp(-r*2.)*.28" : "0."};float fade=1.-smoothstep(.65,1.,r);float light=(core+rays+exp(-pow((r-wave*.45)*32.,2.))*.12*reaction)*fade*strength*(1.+sin(time*.35)*.035+reaction*.12);gl_FragColor=vec4(1.,.55,.19,light);}`,
      });
      shaders.push(material);
      return mesh(new THREE.PlaneGeometry(size, size), material, x, y, z);
    }
    const floatingPetals: {
      mesh: THREE.Mesh;
      base: THREE.Vector3;
      offset: THREE.Vector2;
      velocity: THREE.Vector2;
    }[] = [];
    const lamps: THREE.Group[] = [];
    const lampHeat: number[] = [];
    const flames: {
      group: THREE.Group;
      material: THREE.ShaderMaterial;
      light: THREE.PointLight;
    }[] = [];
    function diya(x: number, y: number, z: number, scale: number) {
      const group = new THREE.Group();
      lamps.push(group);
      lampHeat.push(-10000);
      group.position.set(x, y, z);
      group.scale.setScalar(scale);
      group.userData.baseScale = scale;
      scene.add(group);
      const points = [
        [0.02, -0.15],
        [0.18, -0.15],
        [0.2, -0.1],
        [0.1, -0.07],
        [0.1, 0.06],
        [0.34, 0.1],
        [0.61, 0.28],
        [0.7, 0.38],
        [0.67, 0.41],
        [0.56, 0.26],
        [0.3, 0.15],
        [0.05, 0.12],
      ].map((p) => new THREE.Vector2(...(p as [number, number])));
      mesh(
        new THREE.LatheGeometry(points, low ? 32 : 56),
        brass,
        0,
        0,
        0,
        group,
      );
      mesh(
        new THREE.TorusGeometry(0.675, 0.012, 6, 48),
        rim,
        0,
        0.39,
        0,
        group,
      ).rotation.x = Math.PI / 2;
      mesh(
        new THREE.CylinderGeometry(0.52, 0.42, 0.012, 32),
        new THREE.MeshStandardMaterial({
          color: 0x39200e,
          metalness: 0.35,
          roughness: 0.2,
        }),
        0,
        0.23,
        0,
        group,
      );
      mesh(
        new THREE.CylinderGeometry(0.022, 0.03, 0.15, 8),
        new THREE.MeshStandardMaterial({ color: 0xbda17b }),
        0,
        0.32,
        0,
        group,
      ).rotation.z = -0.25;
      const flame = new THREE.Group();
      flame.position.set(0, 0.37, 0);
      group.add(flame);
      const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: { time: { value: 0 } },
        vertexShader: vertex,
        fragmentShader: `varying vec2 vUv; uniform float time; void main(){float y=vUv.y;float sway=sin(y*8.-time*6.)*.016*y;float x=(vUv.x-.5-sway);float width=.21*pow(max(.001,sin(y*3.14159)),.8)*(1.-y*.5);float edge=1.-smoothstep(width*.55,width,abs(x));float body=edge*smoothstep(0.,.1,y)*(1.-smoothstep(.8,1.,y));float core=exp(-x*x*500.)*(1.-y);vec3 color=mix(vec3(1.,.29,.035),vec3(1.,.93,.64),core);gl_FragColor=vec4(color,body*.98);}`,
      });
      mesh(new THREE.PlaneGeometry(0.6, 0.65), material, 0, 0.3, 0, flame);
      const halo = glow(1.6, 0, 0.28, 0, 0.5);
      scene.remove(halo);
      flame.add(halo);
      const light = new THREE.PointLight(0xffb64b, 0, 6);
      light.position.set(0, 0.72, 0);
      group.add(light);
      flames.push({ group: flame, material, light });
      return group;
    }
    let aura: THREE.Mesh | undefined;
    const bells: THREE.Group[] = [],
      balloons: THREE.Group[] = [];
    const balloonBase: {
      x: number;
      z: number;
      sway: number;
      phase: number;
      rise: number;
      speed: number;
    }[] = [];
    let flowerTexture: THREE.Texture | undefined;
    if (mode === "diya") {
      diya(0, -0.45, 0, 1.5);
      mesh(new THREE.CylinderGeometry(1.28, 1.33, 0.06, 64), dark, 0, -0.74, 0);
      aura = glow(7, 0, 0.05, -0.4, 0.03);
    }
    if (mode === "darbar") {
      aura = glow(9, 0, 1.1, -2.1, 1.4, true);
      glow(5.4, 0, 1.7, -1.7, 0.95);
      glow(3.1, 0, 1.9, -1.3, 0.34);
      const image = texture("/art/mata-relief.webp", () => {
        if (!disposed) setLoading(false);
      });
      // Low-relief surface, not a claimed sculpted model: gentle contour depth
      // with the nearest planes at the tiger/garments and the crown behind.
      const relief = new THREE.PlaneGeometry(
        3.32,
        4.98,
        low ? 24 : 48,
        low ? 36 : 72,
      );
      const pos = relief.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i),
          y = pos.getY(i);
        const torso = Math.exp(-x * x * 2.2 - (y - 0.3) ** 2 * 0.45);
        const tiger = Math.exp(-((x + 0.85) ** 2) * 5 - (y + 1.2) ** 2 * 1.2);
        pos.setZ(i, 0.14 + torso * 0.24 + tiger * 0.28);
      }
      relief.computeVertexNormals();
      mesh(
        relief,
        new THREE.MeshBasicMaterial({
          map: image,
          transparent: true,
          alphaTest: 0.035,
          side: THREE.DoubleSide,
        }),
        0,
        1.06,
        -0.12,
      );
      for (const [radius, z] of [
        [1.3, -0.8],
        [1.52, -1.05],
        [1.85, -1.35],
        [2.1, -1.55],
      ]) {
        mesh(new THREE.TorusGeometry(radius, 0.013, 6, 96), rim, 0, 1.8, z);
      }
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        const petal = mesh(
          new THREE.TorusGeometry(0.22, 0.009, 5, 22),
          rim,
          Math.sin(a) * 1.68,
          1.8 + Math.cos(a) * 1.68,
          -1.3,
        );
        petal.scale.set(0.45, 1.45, 1);
        petal.rotation.z = -a;
      }
      for (const side of [-1, 1]) {
        for (const [x, z, h] of [
          [2.3, -1.5, 5.7],
          [3.05, 0.8, 6.5],
        ]) {
          const archmat = x > 3 ? dark : brass;
          mesh(
            new THREE.CylinderGeometry(0.13, 0.2, h, 20),
            archmat,
            side * x,
            0.65,
            z,
          );
          for (const yy of [-1.6, 2.8, 3.25])
            mesh(
              new THREE.CylinderGeometry(0.24, 0.27, 0.13, 24),
              rim,
              side * x,
              yy,
              z,
            );
        }
        mesh(
          new THREE.TorusGeometry(2.3, 0.055, 10, 80, Math.PI),
          brass,
          0,
          1.8,
          -1.5,
        );
        const bell = new THREE.Group();
        bell.position.set(side * 1.98, 3.45, 0.2);
        scene.add(bell);
        bells.push(bell);
        mesh(
          new THREE.CylinderGeometry(0.013, 0.013, 0.62, 6),
          brass,
          0,
          -0.3,
          0,
          bell,
        );
        const profile = [
          [0.02, 0],
          [0.11, -0.05],
          [0.15, -0.25],
          [0.25, -0.37],
          [0.28, -0.4],
          [0.25, -0.42],
        ].map((p) => new THREE.Vector2(p[0], p[1]));
        mesh(new THREE.LatheGeometry(profile, 32), brass, 0, -0.63, 0, bell);
        mesh(new THREE.SphereGeometry(0.047, 10, 8), rim, 0, -1.08, 0, bell);
        // Enlarged invisible hit target so a finger tap on the decorative
        // bell registers reliably on mobile (thin brass geometry is hard to
        // hit precisely; the raycaster still resolves to this bell group).
        mesh(
          new THREE.SphereGeometry(0.5, 8, 6),
          new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
          }),
          0,
          -0.72,
          0,
          bell,
        );
      }
      for (let i = 0; i < 3; i++)
        mesh(
          new THREE.CylinderGeometry(
            2.22 + i * 0.21,
            2.35 + i * 0.21,
            0.16,
            64,
          ),
          i === 1 ? brass : dark,
          0,
          -1.57 - i * 0.16,
          0,
        );
      for (const side of [-1, 1]) {
        diya(side * 1.85, -1.18, 0.7, 0.53);
        diya(side * 2.7, -1.3, 1.9, 0.7);
        mesh(
          new THREE.CylinderGeometry(0.15, 0.24, 0.55, 20),
          brass,
          side * 2.7,
          -1.62,
          1.9,
        );
      }
      flowerTexture = texture("/art/offering-flower.webp");
      const petalCount = low ? 5 : 9;
      for (let i = 0; i < petalCount; i++) {
        const base = new THREE.Vector3(
          Math.sin(i * 2.4) * 2.6,
          0.2 + (i % 4) * 0.6,
          0.8 + (i % 3) * 0.6,
        );
        // Slight per-petal scale/opacity variation reads as natural depth
        // without adding draw calls.
        const depth = 0.78 + ((i * 0.37) % 1) * 0.45;
        const petal = mesh(
          new THREE.PlaneGeometry(0.14 * depth, 0.21 * depth),
          new THREE.MeshBasicMaterial({
            map: flowerTexture,
            transparent: true,
            opacity: 0.5 + depth * 0.24,
            depthWrite: false,
          }),
          base.x,
          base.y,
          base.z,
        );
        floatingPetals.push({
          mesh: petal,
          base,
          offset: new THREE.Vector2(),
          velocity: new THREE.Vector2(),
        });
      }
      for (let i = 0; i < 14; i++) {
        const a = (i / 13 - 0.5) * 2.3;
        const f = mesh(
          new THREE.PlaneGeometry(0.23, 0.23),
          new THREE.MeshBasicMaterial({
            map: flowerTexture,
            transparent: true,
            alphaTest: 0.03,
          }),
          Math.sin(a) * 2.03,
          -1.445,
          0.55 + Math.cos(a) * 0.6,
        );
        f.rotation.x = -Math.PI * 0.43;
        f.rotation.z = i * 2;
      }
    }
    if (mode === "birthday") {
      // Warm, premium palette — bronze, gold, wine, rose, burgundy,
      // champagne, muted red — no carnival rainbow.
      const palette = [
        0xa8794c, 0xd9b36a, 0x7a3b45, 0xc4918a, 0x5d2a33, 0xe6d5b5,
        0xa5524a,
      ];
      for (let i = 0; i < 10; i++) {
        const group = new THREE.Group();
        const base = {
          x: (i - 4.5) * 0.85 + (((i * 0.37) % 1) - 0.5) * 1.4,
          z: -(i % 2) * 1.4 + ((i * 0.37) % 1) * 0.8,
          sway: 0.12 + ((i * 0.13) % 0.12),
          phase: i * 1.7,
          // Staggered so the sky is continuously populated: each balloon
          // starts at a different point of its upward journey.
          rise: (i * 0.618) % 1,
          // Full rise in ~14–23s depending on size/depth.
          speed: 1 / (14 + ((i * 0.29) % 1) * 9),
        };
        group.position.set(base.x, -5.4, base.z);
        scene.add(group);
        balloons.push(group);
        balloonBase.push(base);
        const geometry = new THREE.SphereGeometry(0.55, low ? 20 : 32, 24),
          p = geometry.attributes.position;
        for (let j = 0; j < p.count; j++) {
          let y = p.getY(j);
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
              value: new THREE.Color(palette[i % palette.length]),
            },
          },
          vertexShader: `varying vec3 n,v; void main(){vec4 p=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
          fragmentShader: `uniform vec3 color;varying vec3 n,v;void main(){vec3 N=normalize(n);float rim=pow(1.-abs(dot(N,normalize(v))),2.);float shine=pow(max(0.,dot(N,normalize(vec3(-.5,.7,1.)))),32.);float shine2=pow(max(0.,dot(N,normalize(vec3(.7,.15,1.)))),60.);gl_FragColor=vec4(color*(.85+rim*.65)+vec3(1.,.94,.82)*shine*.85+shine2*.25,.34+rim*.42+shine*.17);}`,
        });
        mesh(geometry, material, 0, 0, 0, group);
        const latex = new THREE.MeshStandardMaterial({
          color: palette[i % palette.length],
          roughness: 0.32,
          metalness: 0.2,
        });
        mesh(
          new THREE.CylinderGeometry(0.023, 0.025, 0.07, 8),
          latex,
          0,
          -0.595,
          0,
          group,
        );
        mesh(new THREE.ConeGeometry(0.05, 0.08, 8), latex, 0, -0.655, 0, group);
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, -0.68, 0),
          new THREE.Vector3(0.11, -1.12, 0.03),
          new THREE.Vector3(-0.12, -1.57, 0),
          new THREE.Vector3(0.06, -2.1, 0.04),
        ]);
        mesh(
          new THREE.TubeGeometry(curve, 32, 0.008, 5, false),
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
      }
    }
    const count = low ? 35 : 90,
      positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = Math.sin(i * 127.1) * 4.5;
      positions[i * 3 + 1] = Math.sin(i * 311.7) * 4;
      positions[i * 3 + 2] = -2 + Math.cos(i * 8.1) * 3;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const pm = new THREE.PointsMaterial({
      size: 0.018,
      color: 0xe9bd77,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const dust = new THREE.Points(pg, pm);
    scene.add(dust);
    type Flower = {
      mesh: THREE.Mesh;
      born: number;
      start: THREE.Vector3;
      end: THREE.Vector3;
      turn: number;
    };
    const offerings: Flower[] = [];
    let seen = offering,
      seenBell = bellPulse,
      seenReign = reignite,
      exposeAt = 0,
      bellTime = -10000,
      ignition = lit ? performance.now() - 3000 : 0;
    let drag = false,
      lastX = 0,
      lastInput = 0,
      angle = 0,
      target = 0,
      velocity = 0,
      lastFrame = 0;
    const raycaster = new THREE.Raycaster(),
      pointer = new THREE.Vector2();
    const balloonOffsets = balloons.map(() => new THREE.Vector2());
    let heldBalloon = -1,
      lastY = 0;
    // World-space vertical span the balloons travel through before
    // recycling at the top.
    const balloonBottom = -5.4,
      balloonTop = 6.6;
    function pick(e: PointerEvent, groups: THREE.Group[]) {
      const r = el!.getBoundingClientRect();
      pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(groups, true)[0];
      return hit
        ? groups.findIndex((g) => {
            let o: THREE.Object3D | null = hit.object;
            while (o) {
              if (o === g) return true;
              o = o.parent;
            }
            return false;
          })
        : -1;
    }
    const down = (e: PointerEvent) => {
      if (mode === "birthday") {
        heldBalloon = pick(e, balloons);
        lastX = e.clientX;
        lastY = e.clientY;
        if (heldBalloon >= 0) el.setPointerCapture(e.pointerId);
        return;
      }
      const lamp = pick(e, lamps);
      if (lamp >= 0) lampHeat[lamp] = performance.now();
      if (mode !== "darbar") return;
      // Easter egg: the decorative bell itself rings through the same
      // shared handler as the "Ring the bell" button.
      if (pick(e, bells) >= 0) {
        current.current.onBellTap?.();
        return;
      }
      drag = true;
      lastX = e.clientX;
      lastInput = performance.now();
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!reduced && mode === "darbar") {
        const r = el.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * 2 - 1,
          py = 1 - ((e.clientY - r.top) / r.height) * 2;
        if (!drag) {
          target = THREE.MathUtils.clamp(px * 0.012, -0.015, 0.015);
          lastInput = performance.now();
          // Gentle affordance: pointer cursor only while hovering the bell.
          el.style.cursor = pick(e, bells) >= 0 ? "pointer" : "grab";
        }
        floatingPetals.forEach((p) => {
          const screen = p.mesh.position.clone().project(camera);
          if (Math.hypot(screen.x - px, screen.y - py) < 0.3)
            p.velocity
              .add(
                new THREE.Vector2(
                  (screen.x - px) * 0.008,
                  (screen.y - py) * 0.008,
                ),
              )
              .clampLength(0, 0.025);
        });
      }
      if (heldBalloon >= 0) {
        const i = heldBalloon,
          dx = (e.clientX - lastX) * 0.015,
          dy = -(e.clientY - lastY) * 0.015;
        balloonOffsets[i].add(new THREE.Vector2(dx, dy)).clampLength(0, 1.5);
        lastX = e.clientX;
        lastY = e.clientY;
        return;
      }
      if (!drag) return;
      velocity = (e.clientX - lastX) * 0.00055;
      target = THREE.MathUtils.clamp(target - velocity, -0.075, 0.075);
      lastX = e.clientX;
      lastInput = performance.now();
    };
    const up = () => {
      if (heldBalloon >= 0) {
        // Bake the dragged position into the rise state so flight resumes
        // smoothly upward from wherever the balloon was released — no snap
        // back to a scripted path.
        const i = heldBalloon,
          b = balloons[i],
          base = balloonBase[i];
        if (b && base) {
          base.x = THREE.MathUtils.clamp(b.position.x, -4.2, 4.2);
          base.rise = THREE.MathUtils.clamp(
            (b.position.y - balloonBottom) / (balloonTop - balloonBottom),
            0.02,
            0.98,
          );
        }
        balloonOffsets[i].set(0, 0);
      }
      heldBalloon = -1;
      drag = false;
      lastInput = performance.now();
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    const start = performance.now();
    const animate = (now: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      if (
        document.hidden ||
        now - lastFrame <
          (reduced || current.current.ambientOnly ? 100 : low ? 33 : 16)
      )
        return;
      const dt = Math.min((now - lastFrame) / 16.67, 3);
      lastFrame = now;
      const t = reduced ? 0 : now * 0.001;
      const travel = current.current.travelling && !reduced;
      floatingPetals.forEach((p, i) => {
        if (!reduced) {
          p.velocity
            .addScaledVector(p.offset, -0.018 * dt)
            .multiplyScalar(Math.pow(0.92, dt));
          p.offset.addScaledVector(p.velocity, dt);
          p.mesh.position.set(
            p.base.x + p.offset.x,
            p.base.y + p.offset.y + Math.sin(t * 0.3 + i) * 0.07,
            p.base.z,
          );
          p.mesh.rotation.z = Math.sin(t * 0.2 + i) * 0.15;
        }
      });
      if (mode === "darbar") {
        key.intensity += ((travel ? 43 : 35) - key.intensity) * 0.025;
        // During the blessing build-up the aura physically grows and the
        // jewellery/glow shaders gain a slow golden shimmer.
        if (aura) {
          const s =
            aura.scale.x + ((travel ? 1.35 : 1) - aura.scale.x) * 0.02;
          aura.scale.setScalar(s);
        }
      }
      if (!drag) {
        // Idle drift resumes shortly after the last gesture and stays inside
        // the manual-look clamp (±0.075). Primary cycle ≈7s so the sway is
        // clearly perceptible within 2–3 seconds of watching, layered with a
        // slower secondary drift so it never reads as a mechanical loop.
        if (now - lastInput > 1500 && !reduced)
          target = THREE.MathUtils.clamp(
            Math.sin(t * 0.9) * 0.045 + Math.sin(t * 0.21 + 1.7) * 0.02,
            -0.07,
            0.07,
          );
        else {
          target = THREE.MathUtils.clamp(target - velocity * dt, -0.075, 0.075);
          velocity *= Math.pow(0.9, dt);
        }
      }
      angle += (target - angle) * (1 - Math.pow(0.96, dt));
      const distance =
        mode === "diya"
          ? camera.aspect < 0.8
            ? 8
            : 6.6
          : mode === "darbar"
            ? camera.aspect < 0.8
              ? 11.7
              : 10.4
            : 10;
      camera.position.set(
        Math.sin(angle) * distance,
        (mode === "diya" ? 3.2 : 1.1) +
          (mode === "darbar" && !reduced ? Math.sin(t * 0.42) * 0.14 : 0),
        Math.cos(angle) * (distance - (travel ? 0.2 : 0)),
      );
      camera.lookAt(0, mode === "diya" ? 0 : 0.8, 0);
      if (current.current.lit && !ignition) ignition = now;
      const age = ignition ? (now - ignition) / 1000 : 0;
      const catchLight =
        mode !== "diya"
          ? 1
          : !ignition
            ? 0
            : reduced
              ? 1
              : THREE.MathUtils.smoothstep(age, 0.18, 1.55);
      flames.forEach((f, i) => {
        const warmth = Math.exp(-(now - lampHeat[i]) / 850);
        f.group.visible = catchLight > 0;
        f.material.uniforms.time.value = t;
        f.group.scale.set(
          0.15 + catchLight * 0.85,
          Math.max(0.025, catchLight) *
            (1 + Math.sin(t * 11 + i) * 0.025 + warmth * 0.16),
          1,
        );
        f.group.rotation.y = angle;
        f.group.rotation.z = Math.sin(t * 8 + i) * 0.018;
        f.light.intensity =
          catchLight *
          (7 +
            Math.sin(t * 9 + i) * 0.45 +
            Math.exp(-(now - lampHeat[i]) / 850) * 12);
      });
      if (mode === "diya") {
        key.intensity = 5 + catchLight * 9;
        ambient.intensity = 0.38 + catchLight * 0.32;
        if (aura)
          (aura.material as THREE.ShaderMaterial).uniforms.strength.value =
            0.03 + Math.min(age * 0.17, 0.6);
        if (!reduced && exposeAt) {
          // Diya emerges from darkness: exposure blooms in, body settles to
          // full scale, while the flame sequence above stages after it.
          const reveal = (now - exposeAt) / 1000;
          renderer.toneMappingExposure =
            0.12 + THREE.MathUtils.smoothstep(reveal, 0.05, 1.0) * 1.08;
          lamps.forEach(
            (g) =>
              void g.scale.setScalar(
                g.userData.baseScale *
                  (0.9 + 0.1 * THREE.MathUtils.smoothstep(reveal, 0.3, 1.3)),
              ),
          );
        }
      }
      if (current.current.bellPulse > seenBell) {
        seenBell = current.current.bellPulse;
        bellTime = now;
      }
      // Entering the finale re-runs the full lighting choreography: darkness
      // first, then the diya emerges, the flame catches, warm light spreads.
      if (current.current.reignite > seenReign) {
        seenReign = current.current.reignite;
        ignition = 0;
        exposeAt = now;
      }
      const bellAge = (now - bellTime) / 1000,
        reaction = Math.exp(-bellAge * 1.4);
      bells.forEach(
        (b, i) =>
          (b.rotation.z = reduced
            ? 0
            : Math.sin(bellAge * 9 + i * 0.3) * reaction * 0.2),
      );
      shaders.forEach((s) => {
        s.uniforms.time.value = t;
        s.uniforms.reaction.value = reduced
          ? 0
          : reaction +
            (travel
              ? 0.55 + Math.max(0, Math.sin(t * 6.5)) * 0.45
              : 0);
        if (s.uniforms.wave) s.uniforms.wave.value = bellAge;
      });
      pm.opacity = (mode === "diya" ? catchLight * 0.7 : 0.45) + reaction * 0.3;
      if (!reduced) {
        dust.rotation.y += 0.00013 * dt * (travel ? 0.2 : 1);
        dust.position.y = Math.sin(t * 0.15) * 0.07;
        balloons.forEach((b, i) => {
          const base = balloonBase[i];
          if (!base) return;
          if (heldBalloon === i) {
            // Frozen while held: only the finger moves this balloon.
            b.position.x = base.x + balloonOffsets[i].x;
            b.position.y = base.y + balloonOffsets[i].y;
          } else {
            // Continuous buoyant rise: progress advances every frame, the
            // balloon leaves through the top and re-enters from below.
            base.rise += (dt * base.speed) / 60;
            if (base.rise >= 1) {
              base.rise -= 1;
              base.x = (Math.random() - 0.5) * 8.4;
              base.phase = Math.random() * Math.PI * 2;
            }
            base.y = THREE.MathUtils.lerp(
              balloonBottom,
              balloonTop,
              base.rise,
            );
            b.position.x =
              base.x + Math.sin(t * 0.35 + base.phase) * base.sway;
            b.position.y = base.y;
          }
          b.scale.setScalar(
            0.7 +
              0.3 *
                THREE.MathUtils.smoothstep(
                  (now - start) / 1000 - i * 0.08,
                  0,
                  1.4,
                ),
          );
          b.rotation.z = Math.sin(t * 0.3 + i) * 0.035;
        });
      }
      if (current.current.offering > seen && flowerTexture) {
        seen = current.current.offering;
        if (offerings.length >= 8) {
          const oldest = offerings.shift()!;
          scene.remove(oldest.mesh);
          oldest.mesh.geometry.dispose();
          (oldest.mesh.material as THREE.Material).dispose();
        }
        const end = new THREE.Vector3(
          Math.sin(seen * 2.4) * 1.12,
          -1.44,
          1.1 + Math.cos(seen * 1.7) * 0.25,
        );
        const f = mesh(
          new THREE.PlaneGeometry(0.42, 0.42),
          new THREE.MeshBasicMaterial({
            map: flowerTexture,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
          }),
          0,
          -2.3,
          3.1,
        );
        offerings.push({
          mesh: f,
          born: now,
          start: new THREE.Vector3(Math.sin(seen) * 0.8, -2.3, 3.1),
          end,
          turn: seen * 0.7,
        });
      }
      for (let i = offerings.length - 1; i >= 0; i--) {
        const f = offerings[i],
          age = (now - f.born) / 1000,
          travel = reduced ? 0.1 : 1.4,
          q = Math.min(1, age / travel),
          ease = 1 - (1 - q) ** 2;
        f.mesh.position.lerpVectors(f.start, f.end, ease);
        f.mesh.position.y += Math.sin(q * Math.PI) * (reduced ? 0 : 1.6);
        f.mesh.rotation.set(-Math.PI * 0.44 * ease, 0, f.turn + q * 0.45);
        const fade = THREE.MathUtils.smoothstep(
          age,
          travel + 4.5,
          travel + 5.6,
        );
        (f.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - fade;
        if (fade > 0) f.mesh.position.y += fade * 0.06;
        if (age > travel + 5.6) {
          scene.remove(f.mesh);
          f.mesh.geometry.dispose();
          (f.mesh.material as THREE.Material).dispose();
          offerings.splice(i, 1);
        }
      }
      if (mode === "darbar" && !reduced)
        renderer.toneMappingExposure =
          1.24 * THREE.MathUtils.lerp(0.7, 1, Math.min(1, (now - start) / 1800));
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    const lost = (e: Event) => {
      e.preventDefault();
      setFallback(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      const materials = new Set<THREE.Material>();
      meshes.forEach((o) => {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
          materials.add(m),
        );
      });
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      pg.dispose();
      pm.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [mode, reduced]);
  return (
    <div
      ref={host}
      className={`temple-canvas ${fallback ? "fallback" : ""} ${loading ? "model-loading" : ""}`}
      role="img"
      aria-label={
        mode === "diya"
          ? lit
            ? "A glowing brass diya"
            : "A brass diya waiting to be lit"
          : mode === "darbar"
            ? "Mata Rani in a layered candlelit Darbar. Drag gently to look around."
            : "Softly illuminated balloons with ribbons"
      }
    >
      {loading && <div className="model-loader">Preparing the Darbar…</div>}
      {fallback &&
        (mode === "darbar" ? (
          <img src="/art/mata-relief.webp" alt="Mata Rani" />
        ) : mode === "diya" ? (
          <img
            src="/art/ceremonial-engraving.webp"
            alt="A sacred diya"
            style={{ opacity: lit ? 1 : 0.5 }}
          />
        ) : (
          <div className="birthday-fallback" aria-hidden="true" />
        ))}
    </div>
  );
}
