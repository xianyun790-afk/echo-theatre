/** Offline production of allowlisted first-act lines, using NIA WS1 PostSayIt. */
import {readFileSync,mkdirSync,existsSync,writeFileSync,renameSync,rmdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {WebSocket} from 'ws';
import {loadNiaCredentials,createNiaJwt} from './nia-config.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export const cast=JSON.parse(readFileSync(root+'config/nia-voices.json','utf8'));
const scripts=JSON.parse(readFileSync(root+'config/voices.json','utf8'));
const questionRoles=['xu','shen','zhou','cheng','tang'];
export function productionClips(){return Object.entries(scripts.clips).flatMap(([id,clip])=>[
 {id,role:clip.role,text:clip.text},
 ...(id.startsWith('council-question-')?questionRoles.map(role=>({id,role,text:clip.text})):[]),
]);}
export function clipIdentity(clip){return {...clip,voice_id:cast.voices[clip.role].voice_id,model:cast.model,language:cast.language,speech_rate:cast.speech_rate};}
export function cacheKey(clip){return createHash('sha256').update(JSON.stringify(clipIdentity(clip))).digest('hex');}
export function pcmWav(pcm,rate=16000){
 if(!pcm.length||pcm.length%2)throw Error('Invalid PCM16 audio');
 const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(36+pcm.length,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(rate,24);h.writeUInt32LE(rate*2,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);return Buffer.concat([h,pcm]);
}
export class NiaRenderer{
 constructor({socketFactory=url=>new WebSocket(url),credentials=loadNiaCredentials}={}){this.socketFactory=socketFactory;this.credentials=credentials;this.pending=new Set();this.sequence=0;this.collect=null;}
 send(type,payload={}){this.socket.send(JSON.stringify({type,...payload}));}
 wait(types,requestId,timeout=30000){return new Promise((resolve,reject)=>{
  const entry={types:new Set(types),requestId,resolve:value=>{clearTimeout(entry.timer);this.pending.delete(entry);resolve(value);},reject:error=>{clearTimeout(entry.timer);this.pending.delete(entry);reject(error);}};
  entry.timer=setTimeout(()=>entry.reject(Error('NIA response timeout: '+types.join('/'))),timeout);this.pending.add(entry);
 });}
 request(type,payload,types){const id='render-'+(++this.sequence);const pending=this.wait(types,id);this.send(type,{...payload,request_id:id});return pending;}
 fail(error){for(const p of [...this.pending])p.reject(error);if(this.collect){this.collect.reject(error);this.collect=null;}}
 async connect(role){
  const {ak,sk}=this.credentials();if(!ak||!sk)throw Error('NIA credentials missing');
  this.socket=this.socketFactory('wss://nia.sensetime.com/biz/duplex/ws1?audio_only=true&jwt='+encodeURIComponent(createNiaJwt(ak,sk)));
  this.socket.on('message',raw=>{
   let m;try{m=JSON.parse(raw.toString());}catch{return;}
   if(m.type==='Ping'){this.send('Pong');return;}
   if(process.env.NIA_RENDER_DEBUG&&m.type!=='ResponseAudioSegment')console.log(JSON.stringify({event:m.type,code:m.code,index:m.index,bytes:m.audio_segment?Buffer.from(m.audio_segment,'base64').length:undefined}));
   if(m.type==='Report'&&(m.level==='error'||Number(m.code)>=400)){this.fail(Error('NIA '+m.code+': '+m.content));return;}
   if(m.type==='ConfigRejected'||m.type==='InvalidVoiceType'){this.fail(Error('NIA rejected voice/config: '+(m.reason||m.type)));return;}
   if(m.type==='ResponseBlocked'){this.fail(Error('NIA blocked fixed script'));return;}
   if(this.collect&&m.type==='ResponseAudioSegment'){
    const chunk=Buffer.from(m.audio_segment||'','base64');this.collect.size+=chunk.length;
    if(this.collect.size>16000*2*120){this.fail(Error('NIA clip duration limit'));return;}
    this.collect.chunks.push(chunk);
   }
   // WS1 currently emits EndAudioSegment then AgentEndPlay (the docs call it EndAudioStream).
   // Wait for the whole turn so a subsequent voice cannot capture a late segment.
   if(this.collect&&m.type==='AgentEndPlay'){
    const c=this.collect;this.collect=null;if(m.complete===false)c.reject(Error('NIA fixed clip interrupted'));else c.resolve(Buffer.concat(c.chunks));
   }
   for(const p of [...this.pending])if(p.types.has(m.type)&&(!p.requestId||m.respond_to===p.requestId))p.resolve(m);
  });
  this.socket.on('error',()=>this.fail(Error('NIA WebSocket connection failed')));
  this.socket.on('close',()=>this.fail(Error('NIA WebSocket closed')));
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('NIA connect timeout')),15000);this.socket.once('open',()=>{clearTimeout(timer);resolve();});this.socket.once('error',()=>{clearTimeout(timer);reject(Error('NIA connection failed'));});});
  const created=await this.request('CreateSession',{},['CreateSessionResult']);if(!created.success)throw Error('NIA session not created');
  await this.request('ConfigPipeline',{custom_config:{model_name:cast.model,voice_type:cast.voices[role].voice_id,language:cast.language,system_prompt:'只用咬字清楚、自然流畅的普通话。正常语速，不拖长起声，不模仿外国口音。',tts:{enabled:true,speech_rate:1},rag:{enabled:false},websearch:{enabled:false}}},['ConfigUpdated']);
  this.role=role;this.send('ConfigASR',{enable:false});const ready=this.wait(['AudioAccepting']);this.send('StartServing');await ready;
 }
 async render(clip){
  if(this.role!==clip.role){await this.request('SetVoiceType',{voice_type:cast.voices[clip.role].voice_id},['VoiceTypeSet']);this.role=clip.role;}
  const audio=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.collect=null;reject(Error('NIA fixed clip timeout'));},90000);this.collect={chunks:[],size:0,resolve:pcm=>{clearTimeout(timer);resolve(pcm);},reject:e=>{clearTimeout(timer);reject(e);}};});
  this.send('PostSayIt',{text:clip.text,add_history:false,request_id:'say-'+(++this.sequence)});
  const pcm=await audio;if(pcm.length<3200||pcm.length%2)throw Error('NIA empty or malformed PCM');return pcmWav(pcm);
 }
 close(){if(this.socket)this.socket.close();this.fail(Error('Renderer closed'));}
}
async function saveManifest(path,key,entry){
 const lock=path+'.lock';let locked=false;
 for(let i=0;i<250;i++){try{mkdirSync(lock);locked=true;break;}catch(e){if(e.code!=='EEXIST')throw e;await new Promise(r=>setTimeout(r,20));}}
 if(!locked)throw Error('Cache manifest is busy');
 try{let current={};try{current=JSON.parse(readFileSync(path,'utf8'));}catch{}current[key]=entry;const tmp=path+'.'+process.pid+'.tmp';writeFileSync(tmp,JSON.stringify(current,null,2)+'\n');renameSync(tmp,path);}finally{rmdirSync(lock);}
}
async function main(){
 const selected=process.argv.slice(2);const clips=productionClips().filter(c=>!selected.length||selected.includes(c.id)||selected.includes(c.role));
 const folder=root+'.local-asr/nia/cache/';mkdirSync(folder,{recursive:true});
 const manifestPath=folder+'manifest.json';
 let renderer;
 try{for(const clip of clips){
  const key=cacheKey(clip),file=key+'.wav',path=folder+file;
  if(!existsSync(path)){
   let wav;for(let attempt=0;attempt<2;attempt++){try{if(!renderer){renderer=new NiaRenderer();await renderer.connect(clip.role);}wav=await renderer.render(clip);break;}catch(e){renderer?.close();renderer=null;if(attempt)throw e;console.log(JSON.stringify({clip:clip.id,retry:true,error:e.message}));}}const raw=folder+key+'-16k.wav';writeFileSync(raw,wav);
   const result=spawnSync('afconvert',['-f','WAVE','-d','LEI16@32000','-c','1',raw,path+'.render.wav'],{encoding:'utf8'});
   if(result.status!==0)throw Error('Local PCM conversion failed');
   renameSync(path+'.render.wav',path);
  }
  await saveManifest(manifestPath,clip.id+'@'+clip.role,{...clipIdentity(clip),file});
  console.log(JSON.stringify({clip:clip.id,role:clip.role,voice:cast.voices[clip.role].name,cached:true}));
 }}finally{renderer?.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
