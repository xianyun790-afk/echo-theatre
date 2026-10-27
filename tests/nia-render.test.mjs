import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {NiaRenderer,productionClips,cast,cacheKey,pcmWav} from '../scripts/nia-render.mjs';
import {pipelineConfig} from '../scripts/nia-config.mjs';
test('cast has seven distinct voices and live host shares the narrator identity',()=>{
 assert.equal(new Set(Object.values(cast.voices).map(v=>v.voice_id)).size,7);
 assert.equal(pipelineConfig([]).voice_type,cast.voices.narrator_host.voice_id);
 assert.equal(pipelineConfig([]).language,'ZH_CN');assert.equal(cast.speech_rate,1);
 const clips=productionClips();assert.equal(clips.length,58);
 for(const role of ['xu','shen','zhou','cheng','tang'])for(const suffix of ['print','tape','numbers','open'])assert.ok(clips.some(c=>c.id==='council-question-'+suffix&&c.role===role));
 const q=clips.find(c=>c.id==='council-question-print');
 assert.notEqual(cacheKey(q),cacheKey({...q,role:'xu'}));assert.notEqual(cacheKey(q),cacheKey({...q,text:q.text+'改'}));
});
test('WS1 waits for the complete audio turn before changing a voice, with exact scripts',async()=>{
 const sent=[];let socket;
 class Socket extends EventEmitter{
  send(raw){const m=JSON.parse(raw);sent.push(m);const reply={CreateSession:'CreateSessionResult',ConfigPipeline:'ConfigUpdated',StartServing:'AudioAccepting',SetVoiceType:'VoiceTypeSet'}[m.type];if(reply)queueMicrotask(()=>this.emit('message',Buffer.from(JSON.stringify({type:reply,success:true,respond_to:m.request_id}))));}
  message(m){this.emit('message',Buffer.from(JSON.stringify(m)));}close(){}
 }
 const renderer=new NiaRenderer({credentials:()=>({ak:'test',sk:'test-secret'}),socketFactory:url=>{assert.ok(url.startsWith('wss://nia.sensetime.com/biz/duplex/ws1?'));socket=new Socket();queueMicrotask(()=>socket.emit('open'));return socket;}});
 try{
  await renderer.connect('narrator_host');
  const clip=productionClips().find(c=>c.role==='xu');let done=false;
  const result=renderer.render(clip).then(wav=>{done=true;return wav;});
  await new Promise(r=>setImmediate(r));
  assert.equal(sent.at(-1).type,'PostSayIt');assert.equal(sent.at(-1).text,clip.text);assert.equal(sent.at(-1).add_history,false);
  const pcm=Buffer.alloc(6400,1);socket.message({type:'ResponseAudioSegment',audio_segment:pcm.toString('base64')});socket.message({type:'ResponseEndAudioSegment',index:1});
  await new Promise(r=>setImmediate(r));assert.equal(done,false);
  socket.message({type:'AgentEndPlay',complete:true});const wav=await result;
  assert.equal(wav.readUInt32LE(24),16000);assert.deepEqual(wav.subarray(44),pcm);
 }finally{renderer.close();}
});
test('interrupted fixed audio is rejected and not cached as a finished clip',async()=>{
 const renderer=new NiaRenderer();renderer.role='xu';renderer.socket={send(){},close(){}};
 const pending=renderer.render(productionClips().find(c=>c.role==='xu'));
 renderer.fail(Error('connection lost'));await assert.rejects(pending,/connection lost/);renderer.close();
 assert.throws(()=>pcmWav(Buffer.alloc(1)),/Invalid PCM/);
});
