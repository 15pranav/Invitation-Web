"use client";
import { useEffect, useRef } from "react";
import type { MotionValue } from "motion/react";
import * as THREE from "three";
import { createBalloon, disposeBalloons } from "./balloon-model";

import {
  BALLOON_TIMING,
  balloonPose,
  TRANSITION_BALLOON_COUNT,
} from "./balloon-motion";
export default function BalloonVeil({
  speed,
  progress,
  onCovered,
  onComplete,
}: {
  speed: number;
  progress?: MotionValue<number>;
  onCovered: () => void;
  onComplete: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onCovered, onComplete });
  useEffect(() => {
    callbacks.current = { onCovered, onComplete };
  }, [onCovered, onComplete]);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      // Graceful crossfade when WebGL is unavailable; no alternate balloon art.
      callbacks.current.onCovered();
      callbacks.current.onComplete();
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-70, 70, 50, -50, 0.1, 1000);
    camera.position.z = 400;
    scene.add(new THREE.AmbientLight(0xffd6ab, 1.4));
    const light = new THREE.PointLight(0xffd8a3, 35, 600);
    light.position.set(-50, 80, 120);
    scene.add(light);
    // Palette templates share geometry and materials across the denser veil.
    const templates = Array.from({ length: 7 }, (_, i) =>
      createBalloon(i, true),
    );
    const balloons = Array.from(
      { length: TRANSITION_BALLOON_COUNT },
      (_, i) => {
        const b = templates[i % templates.length].clone(true);
        scene.add(b);
        return b;
      },
    );
    const poses = balloons.map(() => ({
      x: 0,
      y: 0,
      z: 0,
      scale: 1,
      rotation: 0,
    }));
    let width = 140,
      dirty = true;
    const resize = () => {
      dirty = true;
      width = (100 * el.clientWidth) / el.clientHeight;
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    let frame = 0,
      start = 0,
      covered = false,
      lastAge = -1;
    renderer.compile(scene, camera);
    const tick = (now: number) => {
      if (!start) start = now;
      const age = progress
        ? progress.get() * BALLOON_TIMING.clear
        : (now - start) / speed;
      if (document.hidden || (progress && age === lastAge && !dirty)) {
        frame = requestAnimationFrame(tick);
        return;
      }
      lastAge = age;
      dirty = false;
      balloons.forEach((b, i) => {
        const p = balloonPose(i, width, age, poses[i]);
        b.scale.setScalar(p.scale);
        b.position.set(p.x, p.y, p.z);
        b.rotation.z = p.rotation;
      });
      renderer.render(scene, camera);
      // Shared clock controls coverage, scene switch, and removal after exit.
      if (!progress && !covered && age >= BALLOON_TIMING.cover) {
        covered = true;
        callbacks.current.onCovered();
      }
      if (!progress && age >= BALLOON_TIMING.clear) {
        callbacks.current.onComplete();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      disposeBalloons(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [speed, progress]);
  return <div ref={host} className="balloon-veil" aria-hidden="true" />;
}
