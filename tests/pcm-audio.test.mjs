import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/lib/pcm-audio.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const {encodeSpeechWav}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('48kHz browser audio becomes a valid mono 16kHz PCM WAV',()=>{
 const pcm=new Float32Array(48000).fill(.5),buffer=encodeSpeechWav(pcm,48000),view=new DataView(buffer);
 assert.equal(buffer.byteLength,32044);assert.equal(view.getUint16(22,true),1);assert.equal(view.getUint32(24,true),16000);assert.equal(view.getUint16(34,true),16);assert.equal(view.getUint32(40,true),32000);assert.equal(view.getInt16(44,true),16383);
});
test('PCM conversion clamps peaks and preserves silence',()=>{
 const view=new DataView(encodeSpeechWav(new Float32Array([-2,0,2]),16000));
 assert.equal(view.getInt16(44,true),-32768);assert.equal(view.getInt16(46,true),0);assert.equal(view.getInt16(48,true),32767);
});
test('44.1kHz capture retains the utterance duration after resampling',()=>{
 const view=new DataView(encodeSpeechWav(new Float32Array(44100*2),44100));assert.equal(view.getUint32(40,true),16000*2*2);
});
