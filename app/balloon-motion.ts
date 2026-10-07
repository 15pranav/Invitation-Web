export const BALLOON_TIMING = { cover: 1450, clear: 3600 };
const mix = (a:number,b:number,q:number) => a+(b-a)*q*q*(3-2*q);
export function balloonPose(i:number,width:number,age:number) {
  const diameter=Math.max(width*.66,52);
  const offset=age<1450 ? mix(-240,0,age/1450) : age<2050 ? mix(0,8,(age-1450)/600) : mix(8,diameter*4+100,Math.min(1,(age-2050)/1550));
  const approach=.84 + .16*Math.min(1,age/1450) + .08*Math.max(0,(age-2050)/1550);
  return { x:(i%4/3-.5)*width + Math.sin(i*2.4)*width*.035,
    y:(Math.floor(i/4)-1.5)*diameter*.48+offset, z:(i%3)*12,
    scale:diameter/1.1*(1+(i%3)*.035)*approach,
    rotation:Math.sin(i*1.7+age*.00035)*.055 };
}
