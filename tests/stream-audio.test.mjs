import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const js=ts.transpileModule(await readFile(new URL('../src/lib/stream-audio.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const {Pcm16Encoder,PcmStreamPlayer,PcmMicrophone}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const originalAudio=globalThis.AudioContext,originalNav=Object.getOwnPropertyDescriptor(globalThis,'navigator');
afterEach(()=>{globalThis.AudioContext=originalAudio;if(originalNav)Object.defineProperty(globalThis,'navigator',originalNav);else delete globalThis.navigator;});
test('44.1kHz streaming across uneven packet boundaries has the same duration and PCM as a single packet',()=>{
 const input=Float32Array.from({length:44100},(_,i)=>Math.sin(i*.06)*.7),stream=new Pcm16Encoder(44100),chunks=[];
 for(let start=0;start<input.length;start+=1024)chunks.push(Buffer.from(stream.encode(input.subarray(start,start+1024))));
 const bytes=Buffer.concat(chunks),whole=Buffer.from(new Pcm16Encoder(44100).encode(input));
 assert.equal(bytes.length,32000);assert.deepEqual(bytes,whole);
 assert.equal(Buffer.from(new Pcm16Encoder(48000).encode(new Float32Array(48000))).length,32000);
});
test('stream playback schedules PCM continuously, preserves silence/mute and drains the actual audio tail',async()=>{
 let context;class Context{
  currentTime=2;state='running';sources=[];buffers=[];
  constructor(){context=this;}
  createGain(){return this.gain={gain:{value:1},connect(){}};}
  async resume(){}async close(){this.closed=true;}
  createBuffer(channels,count,rate){const data=new Float32Array(count),buffer={duration:count/rate,getChannelData:()=>data,data};this.buffers.push(buffer);return buffer;}
  createBufferSource(){const source={connect(){},disconnect(){},start(time){this.time=time;},stop(){this.stopped=true;}};this.sources.push(source);return source;}
 }
 globalThis.AudioContext=Context;const player=new PcmStreamPlayer();await player.open();
 const pcm=Buffer.from([0,128,0,0,255,127]);assert.equal(player.push(pcm.toString('base64')),6);player.push(pcm.toString('base64'));
 assert.equal(context.buffers[0].data[0],-1);assert.equal(context.buffers[0].data[1],0);assert.ok(context.buffers[0].data[2]>.99);
 assert.equal(context.sources[1].time,context.sources[0].time+3/16000);
 player.setMuted(true);assert.equal(context.gain.gain.value,0);let done=false;const tail=player.drain().then(()=>done=true);
 context.sources[0].onended();await Promise.resolve();assert.equal(done,false);context.sources[1].onended();await tail;assert.equal(done,true);
 player.push(pcm.toString('base64'));player.clear();assert.equal(context.sources.at(-1).stopped,true);player.close();assert.equal(context.closed,true);
});
test('cancelling while permission is pending closes the late microphone without recording or sending audio',async()=>{
 let release,stopped=0;Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:()=>new Promise(resolve=>release=resolve)}}});
 const mic=new PcmMicrophone();const pending=mic.start(()=>assert.fail('late audio'),()=>{});mic.close();
 release({getTracks:()=>[{stop(){stopped++;}}]});await pending;assert.equal(stopped,1);
});
