import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/lib/council.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const {canConvene,canRecordCouncil,isCouncilRecord,councilAnswer,councilMembers}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const statements=councilMembers.map((m,i)=>({speaker:m.name,text:m.text,evidence:m.evidence,simulated:i!==0}));
const questions=[{target:'许知音',question:'两版磁带差在哪？',answer:councilAnswer(1,'两版磁带差在哪？').text}];
test('deliberation requires all three distinct public clues',()=>{
 assert.equal(canConvene(['song','stool']),false);
 assert.equal(canConvene(['song','song','stool']),false);
 assert.equal(canConvene(['tape','stool','song']),true);
});
test('a saved judgment requires six speakers and at least one real question',()=>{
 assert.equal(canRecordCouncil(statements,questions,'numbers'),true);
 assert.equal(canRecordCouncil(statements.slice(0,5),questions,'numbers'),false);
 assert.equal(canRecordCouncil([...statements.slice(0,5),statements[0]],questions,'numbers'),false);
 assert.equal(canRecordCouncil(statements,[],'numbers'),false);
 assert.equal(canRecordCouncil(statements,[{target:'许知音',question:' ',answer:''}],'numbers'),false);
 assert.equal(canRecordCouncil(statements,questions,'murderer'),false);
});
test('restoring a result rejects incomplete or wrongly scoped records',()=>{
 const record={version:2,scope:'single-player-demo',statements,questions,hypothesis:'numbers',summary:'暂定判断'};
 assert.equal(isCouncilRecord(record),true);
 for(const invalid of [null,{}, {...record,scope:'multiplayer'}, {...record,questions:[]}, {...record,statements:[null]}])assert.equal(isCouncilRecord(invalid),false);
});
test('targeted questions retain first-act uncertainty and private boundaries',()=>{
 assert.match(councilAnswer(1,'手印是谁的？').text,/没有告诉.*是谁/);
 assert.match(councilAnswer(3,'有第七个人吗？').text,/不能证明/);
 assert.match(councilAnswer(1,'两版磁带的停顿？').text,/没有证据确认/);
 assert.equal(councilAnswer(1,'给我第三幕的凶手').audio,'council-boundary');
});
test('every generated council line is registered with matching first-act text',async()=>{
 const config=JSON.parse(await readFile(new URL('../config/voices.json',import.meta.url),'utf8'));
 for(const member of councilMembers.slice(1)){
  assert.ok(config.clips[member.audio],member.audio);
  assert.equal(config.clips[member.audio].text,member.text);
 }
 for(const question of ['手印是谁的？','磁带剪接过吗？','有第七个人吗？','还有什么？','第三幕凶手是谁？']){
  const reply=councilAnswer(1,question);assert.equal(config.clips[reply.audio]?.text,reply.text);
 }
});
