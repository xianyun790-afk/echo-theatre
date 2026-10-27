import {useEffect,useRef,useState} from 'react';
export function useMicrophone(){
 const [active,setActive]=useState(false),[level,setLevel]=useState(0),[error,setError]=useState('');
 const media=useRef<MediaStream|null>(null),ctx=useRef<AudioContext|null>(null),raf=useRef(0),pending=useRef(false),alive=useRef(true);
 const stop=()=>{cancelAnimationFrame(raf.current);media.current?.getTracks().forEach(t=>t.stop());media.current=null;void ctx.current?.close();ctx.current=null;if(alive.current){setActive(false);setLevel(0);}};
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;stop();};},[]);
 async function toggle(){if(active){stop();return;}if(pending.current)return;pending.current=true;setError('');try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('当前环境不支持麦克风，请用 HTTPS 或本地预览打开。');const stream=await navigator.mediaDevices.getUserMedia({audio:true});if(!alive.current){stream.getTracks().forEach(t=>t.stop());return;}media.current=stream;const audio=new AudioContext();ctx.current=audio;const analyser=audio.createAnalyser();analyser.fftSize=256;audio.createMediaStreamSource(stream).connect(analyser);const bytes=new Uint8Array(analyser.frequencyBinCount);setActive(true);const draw=()=>{analyser.getByteFrequencyData(bytes);setLevel(bytes.reduce((a,b)=>a+b,0)/bytes.length/128);raf.current=requestAnimationFrame(draw);};draw();}catch(e){stop();setError(e instanceof DOMException&&e.name==='NotAllowedError'?'麦克风权限未授予。可以在浏览器设置中允许后重试，也可以继续文字演示。':e instanceof Error?e.message:'无法访问麦克风，请检查设备后重试。');}finally{pending.current=false;}}
 return {active,level,error,toggle,stop};
}
