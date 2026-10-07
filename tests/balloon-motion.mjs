import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBalloon, disposeBalloons } from '../app/balloon-model.ts';
import { balloonPose, BALLOON_TIMING } from '../app/balloon-motion.ts';
for (const [w,h] of [[320,740],[375,812],[1280,900],[1536,726]]) {
 const width=100*w/h; const camera=new THREE.OrthographicCamera(-width/2,width/2,50,-50,.1,1000); camera.position.z=400; camera.updateMatrixWorld();
 const scene=new THREE.Scene(); const groups=Array.from({length:16},(_,i)=>{const b=createBalloon(i,true);scene.add(b);return b;});
 for (const age of [1450,1750,2050]) {
  groups.forEach((b,i)=>{const p=balloonPose(i,width,age); b.position.set(p.x,p.y,p.z);b.scale.setScalar(p.scale);b.rotation.z=p.rotation;});scene.updateMatrixWorld(true);
  const ray=new THREE.Raycaster();let covered=0,total=0;
  const bodies=groups.map(g=>g.children[0]);
  for(let x=0;x<31;x++)for(let y=0;y<31;y++){ray.setFromCamera(new THREE.Vector2((x+.5)/31*2-1,(y+.5)/31*2-1),camera);covered+=Number(ray.intersectObjects(bodies,false).length>0);total++;}
  const ratio=covered/total;assert.ok(ratio>=.98, w+'x'+h+' '+age+'ms coverage '+ratio); console.log(w+'x'+h+' '+age+'ms: '+(ratio*100).toFixed(1)+'% balloon silhouette coverage');
 }
 for(let i=0;i<16;i++){let prior=-Infinity;for(let t=0;t<=3600;t+=20){const p=balloonPose(i,width,t);assert.ok(p.y>=prior);prior=p.y;}const p=balloonPose(i,width,BALLOON_TIMING.clear);assert.ok(p.y-2.15*p.scale>50,'entire string exits before removal');}
 disposeBalloons(scene);
}
console.log('Balloon coverage, monotonic rise and complete upward exit passed.');
