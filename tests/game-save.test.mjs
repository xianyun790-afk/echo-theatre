import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const urls=new Map();
async function moduleURL(name){
 if(urls.has(name))return urls.get(name);
 const source=await readFile(new URL(`../src/lib/${name}.ts`,import.meta.url),'utf8');
 let js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
 for(const match of [...js.matchAll(/from ['"]\.\/([^'"]+)['"]/g)])js=js.replace(match[0],`from '${await moduleURL(match[1])}'`);
 const url='data:text/javascript;base64,'+Buffer.from(js).toString('base64');urls.set(name,url);return url;
}
const {parseProgress,initialProgress,hasSavedProgress}=await import(await moduleURL('game-save'));
const {councilMembers,councilAnswer}=await import(await moduleURL('council'));
const statements=councilMembers.map((m,i)=>({speaker:m.name,text:m.text,evidence:m.evidence,simulated:i!==0}));
const questions=[{target:'许知音',question:'磁带比对过了吗？',answer:councilAnswer(1,'磁带比对过了吗？').text}];
const draft={version:1,phase:'questions',turn:5,read:true,draft:'先核对手印',selectedEvidence:'stool',statements,question:'手印属于谁？',target:2,questions,response:null,hypothesis:'',caption:'围绕公开线索提问。'};
test('new saves stay at the opening and old v2 clues migrate without losing evidence',()=>{
 assert.equal(hasSavedProgress(initialProgress()),false);
 const migrated=parseProgress(JSON.stringify({known:['song','stool','song','fake'],completed:false}));
 assert.equal(migrated.version,3);assert.deepEqual(migrated.known,['song','stool']);assert.equal(hasSavedProgress(migrated),true);assert.equal(migrated.checkpoint.view,'room');
});
test('council drafts, unsent questions and investigation history survive a save round trip',()=>{
 const history=[{who:'你 · 林见秋',text:'询问许知音的磁带'},{who:'许知音 · 公开资料',text:'尚需比对。'}];
 const save={...initialProgress(),intro:'ready',known:['song','stool','tape'],history,councilDraft:draft,checkpoint:{scene:'speaker',view:'council'}};
 const restored=parseProgress(JSON.stringify(save));
 assert.deepEqual(JSON.parse(JSON.stringify(restored)),save);assert.equal(restored.councilDraft.question,'手印属于谁？');assert.deepEqual(parseProgress(JSON.stringify(restored)).history,history);
});
test('an old autoplay-only save still receives the prologue without losing its song record',()=>{
 const restored=parseProgress(JSON.stringify({version:3,known:['song'],history:[{who:'开场 · 童谣',text:'原始记录'}]}));
 assert.equal(restored.intro,'prologue');assert.equal(hasSavedProgress(restored),false);
 assert.deepEqual(restored.known,['song']);assert.equal(restored.history[0].text,'原始记录');assert.equal(restored.checkpoint,undefined);
 const entered=parseProgress(JSON.stringify({known:['song'],checkpoint:{scene:'speaker',view:'radio'}}));
 assert.equal(entered.intro,'ready');assert.equal(hasSavedProgress(entered),true);assert.equal(entered.checkpoint.view,'radio');
});
test('unfinished role reading survives refresh and cannot become a resumable investigation',()=>{
 const save={...initialProgress(),intro:'role'};
 const restored=parseProgress(JSON.stringify(save));
 assert.deepEqual(JSON.parse(JSON.stringify(restored)),save);assert.equal(hasSavedProgress(restored),false);
 assert.equal(parseProgress(JSON.stringify({...save,checkpoint:{scene:'speaker',view:'room'}})).checkpoint,undefined);
 const ready=parseProgress(JSON.stringify({...save,intro:'ready'}));
 assert.equal(hasSavedProgress(ready),true);assert.equal(ready.checkpoint.view,'room');
});
test('malformed drafts cannot strand a restored game in an invalid speaker or judgment phase',()=>{
 for(const bad of [{...draft,turn:6},{...draft,target:0},{...draft,phase:'judgment',questions:[]},{...draft,statements:[]},{...draft,statements:[null]},{...draft,response:{}},{...draft,selectedEvidence:'secret'}]){
  assert.equal(parseProgress(JSON.stringify({...initialProgress(),councilDraft:bad})).councilDraft,undefined);
 }
 for(const raw of ['{','null','[]'])assert.deepEqual(parseProgress(raw),initialProgress());
});
test('a previously completed v2 result remains completed and available after migration',()=>{
 const deliberation={version:2,statements,questions,hypothesis:'handprint',summary:'先查手印。',scope:'single-player-demo'};
 const restored=parseProgress(JSON.stringify({known:['song','stool','tape'],completed:true,deliberation}));
 assert.equal(restored.completed,true);assert.deepEqual(restored.deliberation,deliberation);assert.equal(hasSavedProgress(restored),true);
 assert.equal(parseProgress(JSON.stringify({completed:true})).completed,false);
});
