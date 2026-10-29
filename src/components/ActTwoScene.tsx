import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {createArchiveTexture} from '@/lib/archive-texture';
import {createRainWindow} from '@/lib/rain-window';
import type {ActTwoScene as SceneName} from '@/lib/act-two';

export type ActTwoTarget='register'|'blackout'|'radio'|'door';
type Props={scene:SceneName;focus:ActTwoTarget|null;doorOpen:boolean;enabled:boolean;onInteract:(target:ActTwoTarget)=>void};

/** Same house as Act I: weathered timber, printed plaster, rain glass and brass. */
export function ActTwoScene(props:Props){
 const root=useRef<HTMLDivElement>(null),latest=useRef(props);latest.current=props;
 const hotspots=useRef<Partial<Record<ActTwoTarget,HTMLButtonElement|null>>>({});
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  const host=root.current!;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{setFailed(true);return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.45;
  host.appendChild(renderer.domElement);
  const world=new THREE.Scene();world.background=new THREE.Color('#10191e');world.fog=new THREE.FogExp2('#142029',.035);
  const camera=new THREE.PerspectiveCamera(48,1,.05,60),look=new THREE.Vector3(.2,1.65,-2.4);
  camera.position.set(1.15,2.2,5.2);
  const woodMap=createArchiveTexture('wood'),wallMap=createArchiveTexture('wall');
  const longWallMap=wallMap.clone();longWallMap.repeat.set(3,1);
  const wood=new THREE.MeshStandardMaterial({map:woodMap,color:'#a99879',roughness:.95});
  const darkWood=new THREE.MeshStandardMaterial({map:woodMap,color:'#685c45',roughness:.94});
  const wall=new THREE.MeshStandardMaterial({map:wallMap,color:'#c6c8b9',roughness:1});
  const longWall=new THREE.MeshStandardMaterial({map:longWallMap,color:'#c6c8b9',roughness:1});
  const brass=new THREE.MeshStandardMaterial({color:'#8e7950',metalness:.6,roughness:.65});
  const ivory=new THREE.MeshStandardMaterial({color:'#c8bea2',roughness:.8});
  const black=new THREE.MeshStandardMaterial({color:'#121b1b',roughness:1});
  const paper=new THREE.MeshStandardMaterial({color:'#c8b991',roughness:1});
  const glass=new THREE.MeshStandardMaterial({color:'#2b3b3b',roughness:.25,metalness:.2});
  const box=(parent:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material=wood)=>{
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  const rod=(parent:THREE.Object3D,a:THREE.Vector3,b:THREE.Vector3,r:number,mat:THREE.Material=darkWood)=>{
   const delta=b.clone().sub(a),mesh=new THREE.Mesh(new THREE.CylinderGeometry(r*.85,r,delta.length(),8),mat);
   mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());mesh.castShadow=true;parent.add(mesh);return mesh;
  };
  const cylinder=(parent:THREE.Object3D,r:number,h:number,x:number,y:number,z:number,mat:THREE.Material)=>{
   const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,24),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  const sign=(text:string,w:number,h:number)=>{
   const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d')!;
   ctx.fillStyle='#aa9974';ctx.fillRect(0,0,512,256);ctx.strokeStyle='#61543b';ctx.lineWidth=4;ctx.strokeRect(13,13,486,230);
   ctx.fillStyle='#393b30';ctx.font='54px "Songti SC",serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,130);
   const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
   return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map,roughness:.9}));
  };
  const screw=(parent:THREE.Object3D,x:number,y:number,z:number)=>{
   const mesh=new THREE.Mesh(new THREE.SphereGeometry(.017,7,6),brass);mesh.position.set(x,y,z);parent.add(mesh);
  };
  world.add(new THREE.HemisphereLight('#8fabb7','#322a1c',1.2),new THREE.AmbientLight('#a0aeb1',.43));
  const duty=new THREE.Group(),corridor=new THREE.Group();world.add(duty,corridor);

  // Duty room: the outage leaves the ceiling and desk lamps unlit.
  box(duty,8.4,4.8,.2,0,2,-4.6,wall);box(duty,.2,4.8,12,-4.3,2,1,wall);box(duty,.2,4.8,12,4.3,2,1,wall);
  box(duty,8.6,.15,12,0,-.1,1,darkWood);
  for(let x=-4;x<4.2;x+=.4)box(duty,.385,.025,11.8,x,-.012,1,wood);
  for(const y of [.32,1.15,3.7])box(duty,8.5,.11,.13,0,y,-4.43,darkWood);
  for(let x=-4;x<4;x+=.52)box(duty,.04,.85,.05,x,.73,-4.44,darkWood);
  for(const side of [-1,1]){
   for(const y of [.32,1.15,3.7])box(duty,.13,.11,11.8,side*4.14,y,1,darkWood);
   for(let z=-4;z<6;z+=.52)box(duty,.05,.85,.04,side*4.15,.73,z,darkWood);
  }
  const win=new THREE.Group();win.position.set(-2.65,2.2,-4.38);duty.add(win);
  const arch=new THREE.Shape();arch.moveTo(-.75,-1.05);arch.lineTo(.75,-1.05);arch.lineTo(.75,.6);arch.quadraticCurveTo(.58,1.2,0,1.55);arch.quadraticCurveTo(-.58,1.2,-.75,.6);arch.closePath();
  const wetWindow=createRainWindow(arch);win.add(wetWindow.mesh);
  const archLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(arch.getPoints(32).map(p=>new THREE.Vector3(p.x,p.y,.04))),new THREE.LineBasicMaterial({color:'#75684c'}));win.add(archLine);
  rod(win,new THREE.Vector3(0,-1.05,.06),new THREE.Vector3(0,1.52,.06),.045,wood);
  rod(win,new THREE.Vector3(-.74,-.2,.06),new THREE.Vector3(.74,-.2,.06),.04,wood);
  for(const side of [-1,1]){
   rod(win,new THREE.Vector3(side*.77,-1.1,.03),new THREE.Vector3(side*.79,.65,.03),.07,wood);
   rod(win,new THREE.Vector3(side*.79,.65,.03),new THREE.Vector3(0,1.58,.03),.065,wood);
  }
  box(win,1.85,.13,.4,0,-1.12,.12,wood);
  const moon=new THREE.PointLight('#82a5d3',23,14,2);moon.position.set(-2.6,2.65,-3.35);duty.add(moon);
  // A soft off-camera phone light reveals the existing observations, not powered fixtures.
  const phone=new THREE.SpotLight('#eee0bc',65,14,.79,.75,1.3);phone.position.set(-.5,3.55,3.4);phone.target.position.set(-.25,1.2,-1.8);
  phone.castShadow=true;phone.shadow.mapSize.set(1024,1024);phone.shadow.bias=-.0008;phone.shadow.normalBias=.025;duty.add(phone,phone.target);
  const fill=new THREE.PointLight('#bdb394',5,8,2);fill.position.set(1.5,2.5,.5);duty.add(fill);

  const table=new THREE.Group();table.userData.target='register';table.position.set(-.2,0,-1.75);duty.add(table);
  box(table,3.65,.14,1.8,0,1.05,0,wood);box(table,3.5,.17,.11,0,.92,.82,darkWood);
  for(const z of [-.83,.83])box(table,3.65,.035,.045,0,1.09,z,darkWood);
  for(const x of [-1.56,1.56])for(const z of [-.7,.7]){
   const leg=box(table,.13,.98,.13,x,.5,z,darkWood);leg.rotation.z=x*.018;box(table,.2,.12,.2,x,.11,z,wood);
  }
  for(const x of [-.8,.8]){
   box(table,1.25,.29,.08,x,.85,.77,darkWood);box(table,1.13,.22,.04,x,.85,.82,wood);
   const pull=new THREE.Mesh(new THREE.TorusGeometry(.045,.01,6,16),brass);pull.position.set(x,.85,.86);table.add(pull);
  }
  // Same round woven grille and cabinet joinery as the broadcast in Act I.
  const radio=new THREE.Group();radio.position.set(.8,1.79,-.37);radio.rotation.y=-.07;radio.userData.target='radio';table.add(radio);
  box(radio,1.35,1.22,.38,0,0,0,wood);box(radio,1.22,1.1,.035,0,0,.21,darkWood);
  for(const x of [-.65,.65])box(radio,.025,1.16,.025,x,0,.235,brass);
  const cone=new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.025,48),black);cone.rotation.x=Math.PI/2;cone.position.set(-.08,.04,.24);radio.add(cone);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.46,.028,8,48),brass);rim.position.set(-.08,.04,.27);radio.add(rim);
  for(let i=-11;i<=11;i++){
   const n=i*.037,h=Math.sqrt(.43*.43-n*n)*2;
   const a=box(radio,.006,h,.008,n-.08,.04,.28,brass),b=box(radio,h,.006,.008,-.08,n+.04,.283,brass);a.castShadow=b.castShadow=false;
  }
  box(radio,.13,.23,.035,.48,-.38,.245,ivory);box(radio,.045,.1,.06,.48,-.38,.29,brass).rotation.x=.4;
  for(const x of [-.58,.58])for(const y of [-.52,.52])screw(radio,x,y,.24);
  // The ledger remains the only readable paper on the desk.
  const book=new THREE.Group();book.position.set(-.8,1.18,.29);book.rotation.y=-.16;book.userData.target='register';table.add(book);
  box(book,1.43,.055,1.0,0,0,0,darkWood);box(book,1.35,.045,.93,0,.035,0,paper);
  const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=1024;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#c7b58e';ctx.fillRect(0,0,1536,1024);
  let seed=619;const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
  for(let i=0;i<6000;i++){ctx.fillStyle=`rgba(74,58,37,${random()*.09})`;ctx.fillRect(random()*1536,random()*1024,random()*5+1,random()*3+1);}
  ctx.strokeStyle='#776c4d55';ctx.lineWidth=2;for(let y=245;y<1024;y+=105){ctx.beginPath();ctx.moveTo(90,y);ctx.lineTo(1450,y);ctx.stroke();}
  ctx.strokeStyle='#776c4d44';for(const x of [175,780,1250]){ctx.beginPath();ctx.moveTo(x,245);ctx.lineTo(x,1024);ctx.stroke();}
  ctx.fillStyle='#4f4938';ctx.font='50px "Songti SC",serif';ctx.fillText('白榆儿童之家 · 旧名册',110,145);
  ctx.font='64px "Songti SC",serif';ctx.fillText('当晚实际在院人数：七',120,490);
  const stain=ctx.createRadialGradient(1190,750,30,1190,750,360);stain.addColorStop(0,'#75502c33');stain.addColorStop(.85,'#77533355');stain.addColorStop(1,'#77533300');ctx.fillStyle=stain;ctx.fillRect(650,390,886,634);
  ctx.strokeStyle='#74523244';ctx.lineWidth=10;ctx.beginPath();ctx.ellipse(1220,740,215,150,-.2,0,Math.PI*2);ctx.stroke();
  const bookTexture=new THREE.CanvasTexture(canvas);bookTexture.colorSpace=THREE.SRGBColorSpace;bookTexture.anisotropy=4;
  const page=new THREE.Mesh(new THREE.PlaneGeometry(1.33,.91),new THREE.MeshStandardMaterial({map:bookTexture,roughness:.96}));page.rotation.x=-Math.PI/2;page.position.y=.06;page.receiveShadow=true;book.add(page);
  for(let i=0;i<4;i++)box(book,1.32,.003,.9,0,.012+i*.009,.002*i,paper);
  // Cup fragments sit beside the desk; their positions are decoration, not additional clues.
  const spill=new THREE.Mesh(new THREE.CircleGeometry(.38,40),new THREE.MeshStandardMaterial({color:'#5b472b',transparent:true,opacity:.45,roughness:.25,depthWrite:false}));spill.rotation.x=-Math.PI/2;spill.scale.set(1.7,.7,1);spill.position.set(.18,.009,-.26);duty.add(spill);
  for(let i=0;i<7;i++){
   const piece=new THREE.Mesh(new THREE.CylinderGeometry(.11,.095,.025,6,1,false,i*.4,.7),ivory);piece.position.set(.1+Math.sin(i*2)*.3,.025,-.35+Math.cos(i*3)*.23);piece.rotation.set(.1*i,i,.16*i);piece.castShadow=true;duty.add(piece);
  }
  const handle=new THREE.Mesh(new THREE.TorusGeometry(.07,.018,6,16,Math.PI*1.3),ivory);handle.position.set(.45,.033,-.13);handle.rotation.x=Math.PI/2;duty.add(handle);
  const chair=new THREE.Group();chair.position.set(1.75,.4,-1.9);chair.rotation.set(.1,.2,-.85);duty.add(chair);
  box(chair,.65,.09,.6,0,0,0,wood);
  for(const x of [-.26,.26])for(const z of [-.23,.23])rod(chair,new THREE.Vector3(x,-.55,z),new THREE.Vector3(x,0,z),.04);
  for(const x of [-.27,.27])rod(chair,new THREE.Vector3(x,0,-.23),new THREE.Vector3(x,.91,-.25),.04);
  box(chair,.67,.12,.07,0,.9,-.25,wood);for(const x of [-.14,0,.14])box(chair,.035,.72,.035,x,.47,-.25,darkWood);
  // Heavy cupboard with the same cornice, inset doors and brass rings downstairs.
  const cabinet=new THREE.Group();cabinet.position.set(2.92,0,-4.0);duty.add(cabinet);
  box(cabinet,1.38,2.46,.72,0,1.3,0,wood);box(cabinet,1.48,.12,.8,0,.08,.015,darkWood);box(cabinet,1.54,.14,.84,0,2.6,0,wood);
  for(const x of [-.32,.32]){
   box(cabinet,.58,2.3,.065,x,1.32,.395,darkWood);box(cabinet,.44,2.08,.035,x,1.32,.44,wood);
   box(cabinet,.48,.045,.04,x,1.52,.46,darkWood);
   const pull=new THREE.Mesh(new THREE.TorusGeometry(.045,.009,5,12),brass);pull.position.set(x*.35,1.12,.485);cabinet.add(pull);
  }
  for(let i=0;i<3;i++){box(duty,.8,.09,.48,1.5,1.2+i*.075,-4.08,i%2?darkWood:paper);}
  const plaque=sign('值 班 室',.78,.33);plaque.position.set(.45,3.05,-4.46);duty.add(plaque);
  const lamp=new THREE.Group();lamp.position.set(-1.3,1.2,-.6);table.add(lamp);cylinder(lamp,.19,.035,0,0,0,darkWood);rod(lamp,new THREE.Vector3(0,0,0),new THREE.Vector3(.06,.48,0),.023,brass);
  const shade=new THREE.Mesh(new THREE.ConeGeometry(.25,.18,20,1,true),new THREE.MeshStandardMaterial({color:'#526350',metalness:.3,roughness:.75,side:THREE.DoubleSide}));shade.position.set(.06,.49,0);lamp.add(shade);

  // Corridor: continuous wallpaper and dado, closed ordinary doors and room seven.
  box(corridor,4.2,.15,18,0,-.1,-2,darkWood);
  for(let x=-1.95;x<2.1;x+=.3)box(corridor,.285,.025,18,x,-.012,-2,wood);
  box(corridor,.2,4.8,18,-2.15,2,-2,longWall);box(corridor,.2,4.8,18,2.15,2,-2,longWall);
  box(corridor,4.4,4.8,.2,0,2,-7,wall);box(corridor,4.3,.13,18,0,4.35,-2,darkWood);
  for(const side of [-1,1]){
   for(const y of [.32,1.15,3.7])box(corridor,.12,.11,18,side*2.01,y,-2,darkWood);
   for(let z=-6.5;z<6;z+=.5)box(corridor,.05,.85,.04,side*2.02,.73,z,darkWood);
   for(let z=-5.1;z<4.8;z+=3.1){
    const doorFrame=new THREE.Group();doorFrame.position.set(side*1.99,0,z);doorFrame.rotation.y=side===-1?Math.PI/2:-Math.PI/2;corridor.add(doorFrame);
    box(doorFrame,1.25,2.9,.11,0,1.45,0,darkWood);
    for(const x of [-.72,.72])box(doorFrame,.13,3.12,.22,x,1.52,.04,wood);box(doorFrame,1.57,.13,.24,0,3.07,.05,wood);
    for(const y of [.73,2.05]){box(doorFrame,.98,.93,.04,0,y,.085,wood);for(const x of [-.52,.52])box(doorFrame,.035,1.02,.025,x,y,.12,brass);}
    const knob=new THREE.Mesh(new THREE.SphereGeometry(.045,12,8),brass);knob.position.set(.42,1.35,.15);doorFrame.add(knob);
   }
  }
  // The shallow gap is only darkness; nothing from Act III is visible behind it.
  box(corridor,1.7,3.08,.02,0,1.54,-6.98,new THREE.MeshBasicMaterial({color:'#030707'}));
  const door=new THREE.Group();door.position.set(-.78,0,-6.8);door.userData.target='door';corridor.add(door);
  box(door,1.56,3,.13,.78,1.5,0,darkWood);
  for(const y of [.8,2.15]){box(door,1.22,.97,.055,.78,y,.1,wood);for(const x of [.15,1.41])box(door,.035,1.06,.035,x,y,.14,brass);}
  for(const x of [-.94,.94]){box(corridor,.17,3.25,.3,x,1.59,-6.78,wood);box(corridor,.055,3.1,.035,x*.84,1.55,-6.59,brass);}
  box(corridor,2.08,.16,.34,0,3.2,-6.78,wood);box(corridor,2.18,.055,.37,0,3.3,-6.78,darkWood);
  const number=sign('七',.37,.24);number.position.set(.78,2.61,.15);door.add(number);
  box(door,.09,.29,.035,1.37,1.34,.14,brass);const knob=new THREE.Mesh(new THREE.SphereGeometry(.052,12,10),brass);knob.position.set(1.37,1.35,.22);door.add(knob);
  for(const y of [.48,2.53]){cylinder(door,.025,.16,.025,y,.09,brass);}
  // A subtle sheen stays on the hinge; it does not identify a person or a date.
  const oil=cylinder(door,.028,.09,.026,2.5,.1,glass);oil.rotation.z=.04;
  const corridorPhone=new THREE.SpotLight('#e9ddbc',72,16,.86,.8,1.35);corridorPhone.position.set(-.9,2.5,1.5);corridorPhone.target.position.set(0,1.7,-6.7);
  corridorPhone.castShadow=true;corridorPhone.shadow.mapSize.set(1024,1024);corridorPhone.shadow.bias=-.0008;corridorPhone.shadow.normalBias=.025;corridor.add(corridorPhone,corridorPhone.target);
  const corridorMoon=new THREE.PointLight('#82a5d3',13,13,2);corridorMoon.position.set(1.55,3.3,-4.8);corridor.add(corridorMoon);
  const dustPos=new Float32Array(110*3);for(let i=0;i<110;i++){dustPos[i*3]=(random()-.5)*7;dustPos[i*3+1]=random()*4;dustPos[i*3+2]=random()*10-5;}
  const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));
  const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({size:.012,color:'#cebc8b',transparent:true,opacity:.3,depthWrite:false}));world.add(dust);

  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),parallax=new THREE.Vector2();let down={x:0,y:0};
  const hitAt=(x:number,y:number)=>{
   const rect=renderer.domElement.getBoundingClientRect();pointer.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);
   const hit=ray.intersectObject(latest.current.scene==='duty'?duty:corridor,true).find(h=>h.object instanceof THREE.Mesh);
   let object:THREE.Object3D|null=hit?.object??null;
   while(object){if(object.userData.target)return object.userData.target as ActTwoTarget;object=object.parent;}return null;
  };
  const pointerdown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY};};
  const pointermove=(e:PointerEvent)=>{const r=host.getBoundingClientRect();parallax.set((e.clientX-r.left)/r.width-.5,(e.clientY-r.top)/r.height-.5);renderer.domElement.style.cursor=hitAt(e.clientX,e.clientY)?'pointer':'default';};
  const click=(e:MouseEvent)=>{if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>8)return;const target=hitAt(e.clientX,e.clientY);if(target)latest.current.onInteract(target);};
  renderer.domElement.addEventListener('pointerdown',pointerdown);renderer.domElement.addEventListener('pointermove',pointermove);renderer.domElement.addEventListener('click',click);
  const size={width:1,height:1};
  const resize=()=>{const {width,height}=host.getBoundingClientRect();size.width=width;size.height=height;renderer.setSize(width,height,false);camera.aspect=width/height;camera.fov=camera.aspect<.9?62:48;camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dest=new THREE.Vector3(),aim=new THREE.Vector3();let frame=0,last=performance.now(),elapsed=0;
  const animate=()=>{
   frame=requestAnimationFrame(animate);const now=performance.now(),dt=Math.min((now-last)/1000,.05),alpha=1-Math.exp(-dt*2);last=now;elapsed+=dt;
   const p=latest.current,compact=size.width<701;duty.visible=p.scene==='duty';corridor.visible=!duty.visible;
   if(p.scene==='corridor'){dest.set(compact?.65:.85,1.85,p.focus==='door'?-2.9:1.25);aim.set(compact?.1:.65,1.7,-6.8);}
   else if(p.focus==='register'){dest.set(compact?-.9:-.2,2.7,.4);aim.set(compact?-.9:-.05,1.2,-1.43);}
   else if(p.focus==='radio'){dest.set(compact?.5:1,2.1,.25);aim.set(compact?.5:.9,1.75,-2.15);}
   else{dest.set(compact?.25:1.15,compact?2.1:2.2,compact?3.6:5.2);aim.set(compact?-.5:.3,compact?1.7:1.65,-2.4);}
   if(!reducedMotion){dest.x+=parallax.x*.07;dest.y-=parallax.y*.045;}
   camera.position.lerp(dest,alpha);look.lerp(aim,alpha);camera.lookAt(look);
   door.rotation.y=THREE.MathUtils.lerp(door.rotation.y,p.doorOpen?-.17:0,alpha);
   wetWindow.update(reducedMotion?0:elapsed);if(!reducedMotion)dust.rotation.y=elapsed*.012;
   renderer.render(world,camera);
   const anchors:[ActTwoTarget,THREE.Object3D,THREE.Vector3][]=[['register',book,new THREE.Vector3(0,.22,0)],['radio',radio,new THREE.Vector3(0,.7,.25)],['door',door,new THREE.Vector3(.03,2.53,.15)]];
   for(const [target,object,offset] of anchors){const button=hotspots.current[target];if(!button)continue;const point=object.localToWorld(offset).project(camera);button.hidden=!p.enabled||(target==='door'?p.scene!=='corridor':p.scene!=='duty')||point.z< -1||point.z>1||Math.abs(point.x)>.95||Math.abs(point.y)>.95;button.style.left=(point.x*.5+.5)*size.width+'px';button.style.top=(-point.y*.5+.5)*size.height+'px';}

  };animate();
  return()=>{
   cancelAnimationFrame(frame);observer.disconnect();renderer.domElement.removeEventListener('pointerdown',pointerdown);renderer.domElement.removeEventListener('pointermove',pointermove);renderer.domElement.removeEventListener('click',click);
   const materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>([woodMap,wallMap,longWallMap]);
   world.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line||o instanceof THREE.Points){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
   for(const m of materials){const map=(m as THREE.MeshStandardMaterial).map;if(map)textures.add(map);m.dispose();}
   textures.forEach(t=>t.dispose());wetWindow.dispose();phone.shadow.dispose();corridorPhone.shadow.dispose();renderer.dispose();renderer.domElement.remove();
  };
 },[]);
 return <div ref={root} className="act-two-world" data-scene={props.scene} data-view={props.focus??'room'} data-door-state={props.doorOpen?'ajar':'closed'} aria-label={props.scene==='duty'?'停电后的二楼值班室':'七号房外的走廊'}>{(['register','radio','door'] as const).map(target=><button key={target} ref={el=>{hotspots.current[target]=el;}} className="a2-hotspot" hidden={!props.enabled} data-target={target} aria-label={'调查'+({register:'桌上名册',radio:'广播台',door:'七号房门轴'}[target])} onClick={event=>{event.stopPropagation();props.onInteract(target);}}><i/>{({register:'旧名册',radio:'广播台',door:'门轴'}[target])}<span>查看</span></button>)}{failed&&<p className="scene-fallback">3D场景暂不可用，请使用调查入口继续。</p>}</div>;
}
