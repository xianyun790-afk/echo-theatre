import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {createRainWindow} from '@/lib/rain-window';
import {createArchiveTexture as texture} from '@/lib/archive-texture';

export type RoomView='room'|'radio'|'stool'|'council';
export type Target='radio'|'table'|'window'|'cabinet'|'print'|'evidence-song'|'evidence-stool'|'evidence-tape';
type Props={entered:boolean;view:RoomView;speaking:boolean;showPoints:boolean;speakerSeat?:number;focusEvidence?:string;onInteract:(target:Target)=>void;anchors:React.RefObject<Record<string,HTMLButtonElement|null>>};


export function Room(props:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef(props);latest.current=props;
 const [error,setError]=useState('');
 useEffect(()=>{
  const root=host.current!;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch{setError('当前浏览器无法启用3D。请在支持WebGL的浏览器打开本地链接。');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.45;root.appendChild(renderer.domElement);
  const world=new THREE.Scene();world.background=new THREE.Color('#10191e');world.fog=new THREE.FogExp2('#142029',.035);
  const camera=new THREE.PerspectiveCamera(48,1,.05,60);camera.position.set(0,1.65,8.1);const look=new THREE.Vector3(0,1.55,3.8);camera.lookAt(look);
  const woodMap=texture('wood'),wallMap=texture('wall'),dustMap=texture('dust');
  const wood=new THREE.MeshStandardMaterial({map:woodMap,color:'#a99879',roughness:.95});
  const darkWood=new THREE.MeshStandardMaterial({map:woodMap,color:'#685c45',roughness:.94});
  const wall=new THREE.MeshStandardMaterial({map:wallMap,roughness:1,color:'#c6c8b9'});
  const brass=new THREE.MeshStandardMaterial({color:'#8e7950',metalness:.6,roughness:.65});
  const ivory=new THREE.MeshStandardMaterial({color:'#c8bea2',roughness:.8});
  const black=new THREE.MeshStandardMaterial({color:'#121b1b',roughness:1});
  const addBox=(parent:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,material:THREE.Material=wood)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  const rod=(parent:THREE.Object3D,a:THREE.Vector3,b:THREE.Vector3,r:number,mat:THREE.Material=darkWood)=>{const d=b.clone().sub(a),m=new THREE.Mesh(new THREE.CylinderGeometry(r*.85,r,d.length(),7),mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.castShadow=true;parent.add(m);return m;};
  world.add(new THREE.HemisphereLight('#8fabb7','#322a1c',1.4));const ambient=new THREE.AmbientLight('#a0aeb1',.5);world.add(ambient);
  const lamp=new THREE.PointLight('#ffd08a',42,12,2);lamp.position.set(.9,3.4,-3.2);lamp.castShadow=true;lamp.shadow.mapSize.set(1024,1024);lamp.shadow.bias=-.0008;world.add(lamp);
  const cool=new THREE.PointLight('#82a5d3',20,14,2);cool.position.set(-3,2.5,-2.8);world.add(cool);
  const fill=new THREE.PointLight('#bdb394',7,8,2);fill.position.set(0,2.7,3);world.add(fill);
  addBox(world,8.4,4.8,.2,0,2,-4.6,wall);addBox(world,.2,4.8,12,-4.3,2,1,wall);addBox(world,.2,4.8,12,4.3,2,1,wall);addBox(world,8.6,.15,12,0,-.1,1,darkWood);
  for(let x=-4;x<4;x+=.4){const plank=addBox(world,.38,.025,11.8,x,-.012,1,wood);plank.material=wood;}
  addBox(world,8.5,.16,.15,0,.32,-4.43,darkWood);addBox(world,8.5,.1,.15,0,1.15,-4.43,darkWood);addBox(world,8.5,.11,.13,0,3.7,-4.43,darkWood);
  for(let x=-4;x<4;x+=.52)addBox(world,.04,.85,.05,x,.73,-4.44,darkWood);
  // The actual hinged entrance door. The camera moves through it after the first action.
  const hinge=new THREE.Group();hinge.position.set(-1.08,0,4.8);world.add(hinge);
  addBox(hinge,2.16,3.3,.16,1.08,1.65,0,darkWood);
  for(const y of [.75,2.3]){addBox(hinge,1.66,1.15,.07,1.08,y,.11,wood);for(const x of [.25,1.91])addBox(hinge,.05,1.22,.08,x,y,.16,brass);}
  const knob=new THREE.Mesh(new THREE.SphereGeometry(.067,10,8),brass);knob.position.set(1.84,1.5,.2);hinge.add(knob);
  for(const x of [-1.23,1.23])addBox(world,.2,3.6,.3,x,1.75,4.8,wood);addBox(world,2.7,.2,.3,0,3.5,4.8,wood);
  addBox(world,3.3,4.8,.2,-2.94,2,4.8,wall);addBox(world,3.3,4.8,.2,2.94,2,4.8,wall);
  // Wet glass refracts distant moonlight and trees; water runs on a separate layer.
  const win=new THREE.Group();win.position.set(-2.8,2.2,-4.38);win.userData.target='window';world.add(win);
  const arch=new THREE.Shape();arch.moveTo(-.75,-1.05);arch.lineTo(.75,-1.05);arch.lineTo(.75,.6);arch.quadraticCurveTo(.58,1.2,0,1.55);arch.quadraticCurveTo(-.58,1.2,-.75,.6);arch.closePath();
  const wetWindow=createRainWindow(arch);win.add(wetWindow.mesh);
  const edge=new THREE.Line(new THREE.BufferGeometry().setFromPoints(arch.getPoints(25).map(p=>new THREE.Vector3(p.x,p.y,.02))),new THREE.LineBasicMaterial({color:'#75684c'}));win.add(edge);
  rod(win,new THREE.Vector3(0,-1.05,.06),new THREE.Vector3(0,1.52,.06),.045,wood);rod(win,new THREE.Vector3(-.74,-.2,.06),new THREE.Vector3(.74,-.2,.06),.04,wood);
  for(const side of [-1,1]){rod(win,new THREE.Vector3(side*.77,-1.1,.03),new THREE.Vector3(side*.79,.65,.03),.07,wood);rod(win,new THREE.Vector3(side*.79,.65,.03),new THREE.Vector3(0,1.58,.03),.065,wood);}
  addBox(win,1.85,.13,.4,0,-1.12,.12,wood);
  // Central wired broadcast with three-dimensional grille, screws and turning switch.
  const radio=new THREE.Group();radio.position.set(0,2.38,-4.12);radio.rotation.z=.025;radio.userData.target='radio';world.add(radio);
  addBox(radio,1.5,1.43,.33,0,0,0,wood);addBox(radio,1.34,1.29,.04,0,0,.19,darkWood);
  for(const x of [-.71,.71])addBox(radio,.025,1.37,.025,x,0,.183,brass);
  const grille=new THREE.Mesh(new THREE.CylinderGeometry(.51,.51,.025,48),black);grille.rotation.x=Math.PI/2;grille.position.set(-.08,.055,.23);radio.add(grille);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.54,.035,8,48),brass);rim.position.set(-.08,.055,.25);radio.add(rim);
  for(let i=-13;i<=13;i++){const x=i*.036,h=Math.sqrt(.49*.49-x*x)*2;const wire=addBox(radio,.006,h,.008,x-.08,.055,.265,brass);wire.castShadow=false;const wire2=addBox(radio,h,.006,.008,-.08,x+.055,.268,brass);wire2.castShadow=false;}
  for(const x of [-.65,.65])for(const y of [-.61,.61]){const screw=new THREE.Mesh(new THREE.SphereGeometry(.02,6,5),brass);screw.position.set(x,y,.23);radio.add(screw);}
  addBox(radio,.16,.3,.045,.53,-.42,.235,ivory);const switchHandle=addBox(radio,.055,.12,.07,.53,-.4,.29,brass);switchHandle.rotation.x=.4;
  const indicator=new THREE.Mesh(new THREE.SphereGeometry(.023,8,6),new THREE.MeshBasicMaterial({color:'#b9854a'}));indicator.position.set(.53,-.23,.27);radio.add(indicator);
  rod(world,new THREE.Vector3(.64,3.15,-4.3),new THREE.Vector3(.64,4.4,-4.3),.018,brass);
  // Hanging lamp and the warm pool of light over the radio.
  const shade=new THREE.Mesh(new THREE.ConeGeometry(.3,.22,12,1,true),new THREE.MeshStandardMaterial({color:'#6b5b35',metalness:.4,roughness:.7,side:THREE.DoubleSide}));shade.position.copy(lamp.position);shade.position.y+=.04;world.add(shade);
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.065,10,8),new THREE.MeshBasicMaterial({color:'#ffe8b5'}));bulb.position.copy(lamp.position);bulb.position.y-=.08;world.add(bulb);rod(world,new THREE.Vector3(.9,3.6,-3.2),new THREE.Vector3(.9,4.5,-3.2),.018,black);
  const table=new THREE.Group();table.position.set(0,0,-.45);table.userData.target='table';world.add(table);
  addBox(table,3.5,.14,1.65,0,.92,0,wood);addBox(table,3.38,.16,.1,0,.81,.73,darkWood);
  for(const x of [-1.5,1.5])for(const z of [-.64,.64]){const leg=addBox(table,.12,.87,.13,x,.45,z,darkWood);leg.rotation.z=x*.025;addBox(table,.2,.12,.2,x,.12,z,wood);}
  const bowls:THREE.Mesh[]=[];
  for(const x of [-1.12,0,1.12]){const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.17,.09,.085,20,1,true),ivory);bowl.position.set(x,1.025,-.05);bowl.receiveShadow=true;table.add(bowl);const inside=new THREE.Mesh(new THREE.CircleGeometry(.15,20),ivory);inside.rotation.x=-Math.PI/2;inside.position.set(x,1.022,-.05);table.add(inside);bowls.push(bowl,inside);}
  const stool=new THREE.Group();stool.position.set(0,0,.1);stool.userData.target='print';world.add(stool);
  addBox(stool,.72,.095,.65,0,.43,0,wood);const print=new THREE.Mesh(new THREE.PlaneGeometry(.68,.61),new THREE.MeshStandardMaterial({map:dustMap,roughness:1,color:'#ded1a8'}));print.rotation.x=-Math.PI/2;print.position.y=.479;stool.add(print);
  for(const x of [-.26,.26])for(const z of [-.23,.23]){const leg=addBox(stool,.075,.4,.08,x,.2,z,darkWood);leg.rotation.z=x*.15;}for(const z of [-.23,.23])addBox(stool,.55,.055,.06,0,.12,z,wood);
  const chair=(x:number,z:number,rot:number)=>{const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=rot;world.add(group);addBox(group,.65,.09,.6,0,.59,0,wood);for(const xx of [-.25,.25])for(const zz of [-.23,.23])rod(group,new THREE.Vector3(xx*.95,.03,zz),new THREE.Vector3(xx,.58,zz),.04);for(const xx of [-.27,.27])rod(group,new THREE.Vector3(xx,.59,-.23),new THREE.Vector3(xx*1.1,1.5,-.25),.042);addBox(group,.67,.12,.07,0,1.48,-.25,wood);for(const xx of [-.14,0,.14])addBox(group,.035,.72,.035,xx,1.05,-.25,darkWood);};
  chair(-1.5,-1.7,-.07);chair(1.5,-1.7,.09);chair(-2.4,-.3,.9);chair(2.4,-.3,-1);chair(-.65,1.25,Math.PI);chair(.65,1.25,Math.PI);
  // The whole group returns to this same physical table for deliberation.
  const councilCards=new THREE.Group();world.add(councilCards);const cardMeshes:THREE.Mesh[]=[];
  const cardIds=['song','stool','tape'];
  ['广播里的童谣','小木凳上的手印','等待比对的磁带'].forEach((title,i)=>{
   const sheet=document.createElement('canvas');sheet.width=512;sheet.height=320;const ctx=sheet.getContext('2d')!;ctx.fillStyle='#d6c49c';ctx.fillRect(0,0,512,320);ctx.strokeStyle='#897b59';ctx.strokeRect(15,15,482,290);ctx.fillStyle='#4c4a3b';ctx.font='20px "Archive Print", "Songti SC", serif';ctx.fillText(`EVIDENCE / 0${i+1}`,35,55);ctx.font='31px "Archive Print", "Songti SC", serif';ctx.fillText(title,35,120);ctx.strokeStyle='#887c5e';ctx.lineWidth=3;
   for(let n=0;n<15;n++){const h=10+Math.sin(n*1.8)*8+i*4;ctx.beginPath();ctx.moveTo(40+n*25,205-h);ctx.lineTo(40+n*25,205+h);ctx.stroke();}
   const map=new THREE.CanvasTexture(sheet);map.colorSpace=THREE.SRGBColorSpace;
   const card=new THREE.Mesh(new THREE.BoxGeometry(.83,.012,.52),new THREE.MeshStandardMaterial({map,roughness:.94,color:'#f5e5c3'}));card.position.set((i-1)*1.04,1.015,-.17);card.rotation.y=(i-1)*-.06;card.userData.target=`evidence-${cardIds[i]}`;card.userData.councilOnly=true;card.receiveShadow=true;councilCards.add(card);cardMeshes.push(card);
  });
  const tableLight=new THREE.PointLight('#f5d698',0,5,2);tableLight.position.set(0,2,.1);world.add(tableLight);
  // Tall, heavy cupboard: its silhouette must clear the foreground chair backs.
  const cabinet=new THREE.Group();cabinet.position.set(2.82,0,-3.8);cabinet.userData.target='cabinet';world.add(cabinet);
  addBox(cabinet,1.38,2.46,.72,0,1.3,0,wood);
  addBox(cabinet,1.48,.12,.8,0,.08,.015,darkWood);
  addBox(cabinet,1.54,.14,.84,0,2.6,0,wood);
  addBox(cabinet,1.46,.045,.77,0,2.505,.025,darkWood);
  for(const x of [-.65,.65])addBox(cabinet,.075,2.38,.065,x,1.32,.39,darkWood);
  for(const x of [-.32,.32]){
   addBox(cabinet,.58,2.3,.065,x,1.32,.395,darkWood);
   addBox(cabinet,.44,2.08,.035,x,1.32,.44,wood);
   addBox(cabinet,.48,.045,.04,x,1.52,.46,darkWood);
   const handle=new THREE.Mesh(new THREE.TorusGeometry(.045,.009,5,12),brass);handle.position.set(x*.35,1.12,.485);cabinet.add(handle);
   for(const y of [.38,2.25])addBox(cabinet,.035,.12,.025,Math.sign(x)*.61,y,.45,brass);
  }
  // Airborne dust and contextual markers are animated in the actual 3D room.
  const dustPos=new Float32Array(140*3);for(let i=0;i<140;i++){dustPos[i*3]=(Math.random()-.5)*7;dustPos[i*3+1]=Math.random()*4;dustPos[i*3+2]=Math.random()*8-4;}
  const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({size:.012,color:'#cebc8b',transparent:true,opacity:.35,depthWrite:false}));world.add(dust);
  const markerMaterial=new THREE.MeshBasicMaterial({color:'#d4bf87',transparent:true,opacity:.5});const marks:THREE.Mesh[]=[];
  for(const point of [[0,2.38,-3.8],[-1.56,.98,.15],[-2.8,2.2,-4.1],[2.82,1.8,-3.28]]){const mark=new THREE.Mesh(new THREE.SphereGeometry(.025,8,6),markerMaterial);mark.position.fromArray(point);marks.push(mark);world.add(mark);}
  const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2(),parallax=new THREE.Vector2();let downX=0,downY=0,dragging=false,dragRadio=0;
  const hitAt=(event:PointerEvent)=>{const rect=renderer.domElement.getBoundingClientRect();mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(mouse,camera);for(const hit of raycaster.intersectObjects(world.children,true)){let obj:THREE.Object3D|null=hit.object;while(obj){if(obj.userData.councilOnly&&latest.current.view!=='council')break;if(obj.userData.target)return obj.userData.target as Target;obj=obj.parent;}}return null;};
  const onMove=(event:PointerEvent)=>{const rect=root.getBoundingClientRect();parallax.set((event.clientX-rect.left)/rect.width-.5,(event.clientY-rect.top)/rect.height-.5);if(dragging&&latest.current.view==='radio'){dragRadio=THREE.MathUtils.clamp((event.clientX-downX)*.0015,-.16,.16);}renderer.domElement.style.cursor=latest.current.entered&&hitAt(event)?'pointer':'default';};
  const onDown=(event:PointerEvent)=>{downX=event.clientX;downY=event.clientY;dragging=true;};
  const onUp=(event:PointerEvent)=>{dragging=false;if(!latest.current.entered||Math.hypot(event.clientX-downX,event.clientY-downY)>8)return;const target=hitAt(event);if(target)latest.current.onInteract(target);};
  renderer.domElement.addEventListener('pointermove',onMove);renderer.domElement.addEventListener('pointerdown',onDown);renderer.domElement.addEventListener('pointerup',onUp);
  const size={width:1,height:1};const resize=()=>{size.width=root.clientWidth;size.height=root.clientHeight;renderer.setSize(size.width,size.height,false);camera.aspect=size.width/size.height;camera.fov=camera.aspect<.9?62:48;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(root);resize();
  const anchorPoints:Record<string,THREE.Vector3>={radio:new THREE.Vector3(0,2.38,-3.78),table:new THREE.Vector3(1.55,.89,.25),window:new THREE.Vector3(-2.8,2.1,-4.1),cabinet:new THREE.Vector3(2.82,1.8,-3.28),print:new THREE.Vector3(0,.48,.05)};
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dest=new THREE.Vector3(),aim=new THREE.Vector3(),clock=new THREE.Clock();let frame=0,elapsed=0,dead=false;
  const animate=()=>{
   if(dead)return;frame=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);elapsed+=dt;const p=latest.current;
   if(!p.entered){dest.set(0,1.65,8.1);aim.set(0,1.55,3.8);}else if(p.view==='council'){dest.set(0,3.25,2.9);aim.set(0,.93,-.55);}else if(p.view==='radio'){dest.set(.05,2.35,-1.75);aim.set(0,2.38,-4.1);}else if(p.view==='stool'){dest.set(.1,.92,1.5);aim.set(0,.35,.03);}else{dest.set(0,1.94,1.8);aim.set(0,2,-3.8);}
   if(p.entered&&!reducedMotion){dest.x+=parallax.x*.09;dest.y-=parallax.y*.055;}
   camera.position.lerp(dest,1-Math.exp(-dt*1.5));look.lerp(aim,1-Math.exp(-dt*2));camera.lookAt(look);
   hinge.rotation.y=THREE.MathUtils.lerp(hinge.rotation.y,p.entered?1.8:0,1-Math.exp(-dt*1.4));
   radio.rotation.y=THREE.MathUtils.lerp(radio.rotation.y,dragRadio,dt*4);radio.scale.setScalar(p.speaking?1+Math.sin(elapsed*24)*.0018:1);switchHandle.rotation.x=THREE.MathUtils.lerp(switchHandle.rotation.x,p.speaking?-.6:.4,dt*6);
   lamp.intensity=42+Math.sin(elapsed*2.1)*.4+Math.sin(elapsed*5)*.17;indicator.scale.setScalar(p.speaking?1.3+Math.sin(elapsed*10)*.1:1);
   councilCards.visible=p.view==='council';bowls.forEach(b=>{b.visible=p.view!=='council';});tableLight.intensity=THREE.MathUtils.lerp(tableLight.intensity,p.view==='council'?8:0,dt*3);
   cardMeshes.forEach((card,i)=>{const selected=p.focusEvidence===cardIds[i];(card.material as THREE.MeshStandardMaterial).emissive.set(selected?'#4a3517':'#000000');(card.material as THREE.MeshStandardMaterial).emissiveIntensity=selected?.4:0;card.position.y=THREE.MathUtils.lerp(card.position.y,selected?1.045:1.015,dt*3);});
   if(p.view==='council')tableLight.position.x=THREE.MathUtils.lerp(tableLight.position.x,((p.speakerSeat??-1)%3-1)*.25,dt*2);
   dust.rotation.y=elapsed*.012;for(const m of marks){m.visible=p.entered&&p.showPoints;m.scale.setScalar(1+Math.sin(elapsed*2)*.15);}
   wetWindow.update(reducedMotion?0:elapsed);
   for(const [key,point]of Object.entries(anchorPoints)){const el=p.anchors.current[key];if(!el)continue;const v=point.clone().project(camera);el.style.left=`${(v.x*.5+.5)*size.width}px`;el.style.top=`${(-v.y*.5+.5)*size.height}px`;el.style.visibility=v.z>1||v.z<0||v.x<-1.1||v.x>1.1?'hidden':'visible';}
   renderer.render(world,camera);
  };animate();
  return()=>{dead=true;cancelAnimationFrame(frame);observer.disconnect();renderer.domElement.removeEventListener('pointermove',onMove);renderer.domElement.removeEventListener('pointerdown',onDown);renderer.domElement.removeEventListener('pointerup',onUp);const mats=new Set<THREE.Material>();world.traverse(obj=>{if(obj instanceof THREE.Mesh||obj instanceof THREE.Points||obj instanceof THREE.Line){obj.geometry.dispose();for(const m of Array.isArray(obj.material)?obj.material:[obj.material])mats.add(m);}});mats.forEach(m=>{if(m instanceof THREE.MeshStandardMaterial&&m.map&&![woodMap,wallMap,dustMap].includes(m.map as THREE.CanvasTexture))m.map.dispose();m.dispose();});woodMap.dispose();wallMap.dispose();dustMap.dispose();wetWindow.dispose();renderer.dispose();renderer.domElement.remove();};
 },[]);
 return <div ref={host} className="room-3d" aria-label="可调查的三维餐厅">{error&&<p className="webgl-error">{error}</p>}</div>;
}
