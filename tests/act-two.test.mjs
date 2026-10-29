import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {pipelineConfig,normalizeKnown} from '../scripts/nia-config.mjs';
const compiled=await build({entryPoints:[new URL('../src/lib/act-two.ts',import.meta.url).pathname],bundle:true,format:'esm',platform:'node',write:false});
const {initialActTwo,parseActTwo,actTwoMembers,actTwoClues,actTwoCanReview,actTwoPublicKeys,actTwoReply}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const ready=()=>({...initialActTwo(),phase:'discussion',known:['B01','B02','B04','B05','B06'],statements:actTwoMembers.map(m=>({id:m.id,text:m.text,simulated:m.id!=='lin'})),recordingHeard:true,question:'名册是谁写的？',focus:'register'});
test('act two saves preserve drafts, notes and optional private disclosure separately from act one',()=>{
 const value={...ready(),draft:'我在走廊听见轻响',notes:'还不能断言是人'};assert.deepEqual(parseActTwo(JSON.stringify(value)),value);
 assert.equal(actTwoCanReview(value),true);assert.ok(!actTwoPublicKeys(value).includes('B03'));
 assert.ok(!pipelineConfig(actTwoPublicKeys(value),[],2).system_prompt.includes('鞋底留下水痕'));
 assert.ok(pipelineConfig([...actTwoPublicKeys(value),'B03'],[],2).system_prompt.includes('鞋底留下水痕'));
});
test('invalid restored phases cannot skip evidence, six statements or the full recording',()=>{
 for(const data of [{...ready(),known:[]},{...ready(),statements:[]},{...ready(),recordingHeard:false}])assert.equal(actTwoCanReview(parseActTwo(JSON.stringify(data))),false);
 assert.equal(parseActTwo(JSON.stringify({...ready(),phase:'complete',focus:''})).phase,'discussion');
 assert.equal(parseActTwo(JSON.stringify({...ready(),phase:'complete',question:' '})).phase,'discussion');
 assert.equal(parseActTwo(JSON.stringify({...ready(),statements:[null,{},false]})).statements.length,0);
 for(const raw of ['{','null','[]'])assert.deepEqual(parseActTwo(raw),initialActTwo());
});
test('second-act prompt filters first-act, private and future evidence and switches tools',()=>{
 assert.deepEqual(normalizeKnown(['B01','song','C05','secret','B01'],2),['B01']);
 const prompt=pipelineConfig(['B01','C05','B03'],[{who:'私人剧本',text:'secret-value'}],2);
 assert.ok(prompt.system_prompt.includes('第二幕'));assert.ok(prompt.system_prompt.includes('鞋底留下水痕'));assert.ok(!prompt.system_prompt.includes('secret-value'));
 assert.ok(!prompt.system_prompt.includes('只要她不出来'));assert.ok(!pipelineConfig([],[],2).system_prompt.includes('东西还给我'));
 assert.deepEqual(prompt.fn_call.client_fns.fn_defs.map(v=>v.name),['inspect_duty_room','inspect_seventh_door','review_act_two_timeline']);
 assert.equal(pipelineConfig([],[],1).fn_call.client_fns.fn_defs.length,2);
 assert.ok(!pipelineConfig(['B01'],[],2).system_prompt.includes('少报了一个人'));
 assert.ok(!pipelineConfig(['B02'],[],2).system_prompt.includes('少报了一个人'));
 assert.ok(pipelineConfig(['RADIO02'],[],2).system_prompt.includes('少报了一个人'));
});
test('second-act fallback preserves uncertain cause, timing, door state and unrevealed roles',()=>{
 const s=initialActTwo();for(const q of ['凶手是谁','顾怀山的死因','精确死亡时间','门是反锁的吗'])assert.match(actTwoReply(q,s).text,/不足|未确定/);
 assert.ok(!actTwoReply('走廊里的声音',s).text.includes('东西还给我'));
 assert.ok(!actTwoReply('广播录音说了什么',s).text.includes('少报了一个人'));
 assert.ok(actTwoReply('广播录音说了什么',ready()).text.includes('少报了一个人'));
 assert.ok(actTwoClues.find(c=>c.id==='B05').limit.includes('不能排除'));
});

test('current statement and reasoning response survive restore; NPC text updates without replacing player text',()=>{
 const value={...ready(),activeStatement:'zhou',deduction:{focus:'time',question:'20:46到20:50缺了哪段？'}};
 value.statements[0].text='我自己的公开原话，不等于预设路线';value.statements[2].text='旧版的系统旁注';
 const restored=parseActTwo(JSON.stringify(value));assert.equal(restored.activeStatement,'zhou');assert.deepEqual(restored.deduction,value.deduction);assert.equal(restored.statements[0].text,value.statements[0].text);assert.equal(restored.statements[2].text,actTwoMembers[2].text);
 assert.equal(parseActTwo(JSON.stringify({...value,activeStatement:'future-role'})).activeStatement,'');
});
