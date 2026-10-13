export const smooth = t => t*t*t*(t*(t*6-15)+10);
const keys = [[0,190,365,.28],[.18,215,375,.22],[.48,240,290,-.12],[.64,245,290,.35],[.78,235,315,.25],[1,190,365,.28]];
export function shovelPose(phase) {
  const p=((phase%1)+1)%1;
  const i=keys.findIndex((k,j)=>j<keys.length-1 && p>=k[0] && p<keys[j+1][0]);
  const a=keys[Math.max(0,i)], b=keys[Math.max(0,i)+1], t=smooth((p-a[0])/(b[0]-a[0]));
  return {x:a[1]+(b[1]-a[1])*t,y:a[2]+(b[2]-a[2])*t,angle:a[3]+(b[3]-a[3])*t};
}
export function shaftPoint(p,d) {return {x:p.x+Math.cos(p.angle)*d,y:p.y+Math.sin(p.angle)*d};}
export function armJoint(s,h,a=105,b=135,bend=1) {
  const dx=h.x-s.x,dy=h.y-s.y,raw=Math.hypot(dx,dy),d=Math.min(a+b-.001,Math.max(Math.abs(a-b)+.001,raw));
  const theta=Math.atan2(dy,dx)+bend*Math.acos(Math.max(-1,Math.min(1,(a*a+d*d-b*b)/(2*a*d))));
  return {x:s.x+Math.cos(theta)*a,y:s.y+Math.sin(theta)*a};
}
