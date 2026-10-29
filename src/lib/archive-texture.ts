import * as THREE from 'three';

// Shared by both acts so the same building keeps its original material palette.
export function createArchiveTexture(kind:'wood'|'wall'|'dust'){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d')!;
 let seed=931;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
 c.fillStyle=kind==='wood'?'#51402d':kind==='wall'?'#344c50':'#6b6045';c.fillRect(0,0,512,512);
 for(let i=0;i<2000;i++){
  const x=rand()*512,y=rand()*512;c.strokeStyle=kind==='wall'?`rgba(${rand()>.5?'127,137,117':'21,37,40'},${rand()*.16})`:`rgba(${rand()>.5?'199,163,103':'19,19,14'},${rand()*.22})`;
  c.lineWidth=rand()*4+.4;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+rand()*8,y+rand()*20,x+rand()*18,y+rand()*50,x+rand()*12,y+(kind==='wood'?rand()*170:rand()*40));c.stroke();
 }
 if(kind==='wall'){
  c.strokeStyle='#aaa37838';c.lineWidth=1.2;
  for(let y=20;y<512;y+=82)for(let x=20;x<512;x+=70){const px=x+(Math.floor(y/82)%2)*35;c.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?4:11;const xx=px+Math.cos(a)*r,yy=y+Math.sin(a)*r;i?c.lineTo(xx,yy):c.moveTo(xx,yy);}c.closePath();c.stroke();}
  for(let i=0;i<30;i++){c.fillStyle='#b5ab7e24';const x=rand()*512,y=rand()*512;c.beginPath();c.moveTo(x,y);for(let j=0;j<7;j++)c.lineTo(x+(rand()-.5)*90,y+(rand()-.5)*90);c.fill();}
 }
 if(kind==='dust'){
  c.fillStyle='#c7b991';for(let i=0;i<7500;i++){const x=rand()*512,y=rand()*512;c.globalAlpha=rand()*.22;c.fillRect(x,y,rand()*3+1,rand()*3+1);}c.globalAlpha=1;
  c.fillStyle='#2c271b';c.beginPath();c.ellipse(260,290,65,78,-.12,0,Math.PI*2);c.fill();
  for(const [x,y,rx,ry,a] of [[172,235,21,55,-.65],[216,166,18,62,-.24],[264,146,19,67,-.03],[309,167,17,60,.17],[345,206,16,45,.42]]){c.beginPath();c.ellipse(x,y,rx,ry,a,0,Math.PI*2);c.fill();}
 }
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;
}
