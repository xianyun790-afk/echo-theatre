import * as THREE from 'three';

// Original procedural scenery: soft distant trees behind sharply lit wet glass.
export function createRainWindow(shape:THREE.Shape){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=1280;
 const c=canvas.getContext('2d')!;
 let seed=824;const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
 const sky=c.createLinearGradient(0,0,0,1280);sky.addColorStop(0,'#162b41');sky.addColorStop(.45,'#557c98');sky.addColorStop(1,'#182e3c');c.fillStyle=sky;c.fillRect(0,0,768,1280);
 const glow=c.createRadialGradient(240,340,10,240,340,290);glow.addColorStop(0,'#d5e9f3a0');glow.addColorStop(1,'#8bb7d000');c.fillStyle=glow;c.fillRect(0,0,768,1280);
 c.filter='blur(3px)';c.fillStyle='#d5e5eb';c.beginPath();c.arc(240,340,70,0,Math.PI*2);c.fill();
 for(let layer=0;layer<3;layer++){
  c.filter=`blur(${6-layer*2}px)`;c.strokeStyle=['#35536b','#263f50','#142c39'][layer];
  function branch(x:number,y:number,length:number,angle:number,width:number,depth:number){
   const nx=x+Math.sin(angle)*length,ny=y-Math.cos(angle)*length;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+Math.sin(angle)*length*.3,y-length*.45,nx,ny);c.stroke();
   if(depth>0){branch(nx,ny,length*(.59+random()*.14),angle-.3-random()*.5,width*.63,depth-1);branch(nx,ny,length*(.58+random()*.16),angle+.25+random()*.55,width*.63,depth-1);}
  }
  for(let i=0;i<7;i++)branch(-100+i*155+random()*90,1400,300+random()*290,random()*.3-.15,13+layer*5,5);
 }
 c.filter='none';const mist=c.createLinearGradient(0,450,0,1280);mist.addColorStop(0,'#93b0bd00');mist.addColorStop(1,'#80a6b23b');c.fillStyle=mist;c.fillRect(0,0,768,1280);
 const scenery=new THREE.CanvasTexture(canvas);scenery.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.ShaderMaterial({uniforms:{sceneMap:{value:scenery},time:{value:0}},vertexShader:`
  varying vec2 vUv;
  void main(){vUv=(position.xy+vec2(.75,1.05))/vec2(1.5,2.6);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
 `,fragmentShader:`
  uniform sampler2D sceneMap;uniform float time;varying vec2 vUv;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  void main(){
   vec2 uv=vUv;vec2 grid=uv*vec2(34.,58.);vec2 id=floor(grid);vec2 p=fract(grid)-.5;
   float seed=hash(id);p-=vec2((seed-.5)*.52,(hash(id+5.)-.5)*.5);
   vec2 bead=p*vec2(1.0,.68);float radius=.07+seed*.13;float d=length(bead);
   float drop=1.-smoothstep(radius*.65,radius,d);drop*=step(.3,seed);
   float rim=exp(-abs(d-radius*.8)*110.)*step(.3,seed);
   vec2 cells=vec2(uv.x*15.,uv.y);float column=floor(cells.x);float n=hash(vec2(column,8.));
   float speed=.045+n*.06;float y=fract(uv.y+time*speed+n);float x=fract(cells.x)-.5-sin(uv.y*23.+n*20.)*.08;
   float head=1.-smoothstep(.0,.075,length(vec2(x*.75,(y-.3)*9.)));
   float trail=exp(-abs(x)*110.)*smoothstep(.32,.42,y)*(1.-smoothstep(.68,.98,y));
   vec2 bend=bead*drop*.085+vec2(x*head*.38,head*.035)+vec2(trail*.006,0.);
   vec3 col=texture2D(sceneMap,clamp(uv+bend,vec2(.001),vec2(.999))).rgb;
   col*=1.-drop*.33-head*.24;col+=vec3(.48,.65,.75)*(rim*.14+drop*max(0.,-p.x-p.y)*.75+head*.22+trail*.23);
   // Fine rain beyond the pane travels faster than the surface rivulets.
   vec2 rain=vec2(uv.x*95.+uv.y*6.,uv.y*14.+time*1.7);vec2 r=fract(rain);
   float streak=pow(max(0.,1.-abs(r.x-.5)*35.),3.)*smoothstep(.72,.95,r.y)*step(.62,hash(floor(rain)));
   col+=vec3(.25,.36,.43)*streak*.3;
   col=mix(col,vec3(.17,.26,.31),.12);gl_FragColor=vec4(col,1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }
 `});
 const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape,32),material);
 return {mesh,update:(seconds:number)=>{material.uniforms.time.value=seconds;},dispose:()=>scenery.dispose()};
}
