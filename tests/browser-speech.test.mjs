import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/lib/browser-speech.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const {BrowserSpeechSession}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
class FakeRecognition {
 static last;constructor(){FakeRecognition.last=this;this.aborted=false;}
 start(){this.onstart?.();}abort(){this.aborted=true;}
}
function setup(Engine=FakeRecognition){const states=[],interim=[],final=[],errors=[];const session=new BrowserSpeechSession({onState:x=>states.push(x),onInterim:x=>interim.push(x),onFinal:x=>final.push(x),onError:x=>errors.push(x)},Engine);return{session,states,interim,final,errors};}
const result=(transcript,isFinal)=>({results:[{0:{transcript},isFinal}]});
test('speech starts in Chinese and only a confirmed transcript is submitted',()=>{
 const t=setup();t.session.start();const r=FakeRecognition.last;
 assert.equal(r.lang,'zh-CN');assert.equal(r.interimResults,true);assert.deepEqual(t.states,['starting','listening']);
 r.onresult(result('磁带',false));assert.deepEqual(t.interim,['磁带']);assert.deepEqual(t.final,[]);
 const callback=r.onresult;callback(result('磁带和广播一样吗',true));callback(result('磁带和广播一样吗',true));
 assert.deepEqual(t.final,['磁带和广播一样吗']);assert.equal(r.aborted,true);
});
test('cancel rejects late microphone events and never submits partial speech',()=>{
 const t=setup();t.session.start();const r=FakeRecognition.last,callback=r.onresult;
 r.onresult(result('查看餐桌',false));t.session.stop();callback(result('查看餐桌下面',true));
 assert.deepEqual(t.final,[]);assert.equal(r.onresult,null);
});
test('recognition errors end capture and provide useful fallback text',()=>{
 const t=setup();t.session.start();const r=FakeRecognition.last;r.onerror({error:'network'});
 assert.equal(r.aborted,true);assert.match(t.errors[0],/连接失败/);assert.equal(t.states.at(-1),'idle');
});
test('no-speech ends the session instead of silently restarting the microphone',()=>{
 const t=setup();t.session.start();FakeRecognition.last.onend();assert.match(t.errors[0],/没有听清/);assert.deepEqual(t.final,[]);
});
test('unsupported browser never invents a transcript or pretends to connect',()=>{
 const errors=[],final=[];const s=new BrowserSpeechSession({onState:()=>{},onInterim:()=>{},onFinal:x=>final.push(x),onError:x=>errors.push(x)});
 s.start();assert.match(errors[0],/不支持语音识别/);assert.deepEqual(final,[]);
});
