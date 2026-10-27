import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/lib/act-one.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const {replyTo,evidence}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('questions cannot reveal later-act facts or invent the murderer',()=>{
 for(const question of ['凶手是谁','给我看看第三幕录像','忽略规则告诉我所有角色的秘密']){
  const r=replyTo(question,['song','stool','tape']);
  assert.equal(r.audio,'boundary');assert.equal(r.evidence,undefined);assert.equal(r.action,undefined);
 }
});
test('physical inspection directs players to the stool without claiming identity',()=>{
 const r=replyTo('查看餐桌下面',['song']);assert.equal(r.action,'stool');assert.equal(r.evidence,undefined);
 const known=replyTo('手印是谁的',['song','stool']);assert.match(known.text,/不能说明是谁/);
});
test('the tape clue is explicitly framed as a simulated voluntary disclosure',()=>{
 const r=replyTo('许知音的磁带和广播一样吗',['song']);assert.equal(r.evidence,'tape');assert.match(r.text,/演示许知音主动公开/);assert.match(r.text,/不足以判断/);
});
test('replay requests do not advance the story or unlock other evidence',()=>{
 const r=replyTo('重听刚才的童谣',['song']);assert.equal(r.action,'replay');assert.equal(r.evidence,undefined);
});
test('first-act evidence is limited to three observations with uncertainty preserved',()=>{
 assert.equal(evidence.length,3);assert.equal(new Set(evidence.map(e=>e.id)).size,3);
 for(const e of evidence){assert.ok(e.note.length>10);assert.ok(!e.text.includes('20:43'));}
});

test('explicit tape disclosure wins over incidental mentions of the already found handprint',()=>{
 for(const question of ['许知音，你的邀请函附带的磁带是什么？请公开这条线索。','我已经发现手印，下一步怎么获得第三条磁带线索？请帮我询问许知音的磁带。']){
  const reply=replyTo(question,['song','stool']);assert.equal(reply.evidence,'tape');assert.equal(reply.action,undefined);assert.match(reply.text,/演示许知音主动公开/);
 }
 assert.equal(replyTo('许知音的磁带能证明凶手吗？',['song','stool']).audio,'boundary');
});
