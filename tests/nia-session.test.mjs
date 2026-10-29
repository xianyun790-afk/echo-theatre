import {test,afterEach,mock} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({entryPoints:[new URL('../src/lib/nia-session.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false});
const {NiaSession}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const oldFetch=globalThis.fetch,oldWS=globalThis.WebSocket,oldLocation=globalThis.location;
let sessions=[];
afterEach(()=>{sessions.forEach(s=>s.stop());sessions=[];globalThis.fetch=oldFetch;globalThis.WebSocket=oldWS;globalThis.location=oldLocation;mock.timers.reset();});
function setup(){
 const callbacks={onState(){},onLevel(){},onUser(){},onPartial(){},onReply(){},onError(){},onAction(){return {content:'tool result'};}};
 const sent=[],audio={opened:0,closed:0,cleared:0,volume:100,packets:[],async open(){this.opened++;},push(data){this.packets.push(data);return Buffer.from(data,'base64').length;},async drain(){},clear(){this.cleared++;},setMuted(v){this.volume=v?0:100;},close(){this.closed++;}};
 const mic={starts:0,closed:0,async start(pcm,level){this.starts++;this.pcm=pcm;this.level=level;},close(){this.closed++;}};
 class Socket extends EventTarget{
  static OPEN=1;readyState=1;bufferedAmount=0;
  constructor(url){super();assert.ok(url.endsWith('/api/nia/session'));queueMicrotask(()=>this.emit({type:'TransportReady'}));Socket.last=this;}
  emit(m){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(m)}));}
  send(raw){const m=JSON.parse(raw);sent.push(m);const responses={CreateSession:{type:'CreateSessionResult',success:true},ConfigPipeline:{type:'ConfigUpdated'},StartServing:{type:'AudioAccepting'}};if(responses[m.type])queueMicrotask(()=>this.emit({...responses[m.type],respond_to:m.request_id}));}
  close(){this.readyState=3;this.dispatchEvent(new Event('close'));}
 }
 globalThis.WebSocket=Socket;globalThis.location={protocol:'http:',host:'127.0.0.1:4177'};globalThis.fetch=async()=>({ok:true,json:async()=>({configured:true})});
 const session=new NiaSession(callbacks,{audio,microphone:mic});sessions.push(session);
 return {session,callbacks,sent,audio,mic,socket:()=>Socket.last};
}
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
test('text asks the real model over WS without RTC or a microphone, and includes bounded context',async()=>{
 const f=setup();f.session.setKnown(['song']);f.session.setHistory([{who:'你 · 林见秋',text:'刚才的歌'},{who:'私人剧本',text:'secret'}]);await f.session.sendText('广播是谁开的？');
 assert.equal(f.mic.starts,0);assert.equal(f.sent.find(m=>m.type==='GameContext').known[0],'song');
 assert.deepEqual(f.sent.find(m=>m.type==='GameContext').history,[{who:'你 · 林见秋',text:'刚才的歌'}]);
 assert.equal(f.sent.some(m=>/Agora/.test(m.type)),false);assert.equal(f.sent.at(-1).type,'PostMultimodalGenerate');
});
test('ASR partials are shown, and only one completed utterance per trace is submitted',async()=>{
 const f=setup(),users=[],partial=[];f.callbacks.onUser=text=>users.push(text);f.callbacks.onPartial=text=>partial.push(text);await f.session.startMicrophone();
 f.mic.pcm(new Uint8Array([1,0,2,0]));assert.equal(f.sent.at(-1).type,'InputBuffer');assert.equal(f.sent.at(-1).audio_segment,'AQACAA==');
 f.socket().emit({type:'AsrTraceUpdate',trace_id:'a',result:'看看'});assert.equal(partial.at(-1),'看看');assert.equal(users.length,0);
 f.socket().emit({type:'AsrTraceEnd',trace_id:'a',result:'看看桌下'});f.socket().emit({type:'AsrTraceEnd',trace_id:'a',result:'看看桌下'});
 assert.deepEqual(users,['看看桌下']);assert.equal(partial.at(-1),'');
 f.socket().emit({type:'AsrTraceEnd',trace_id:'b',result:'看看桌下'});assert.equal(users.length,2);
});
test('final full text is not duplicated; PCM is delivered and state waits for the audio tail',async()=>{
 const f=setup(),replies=[],states=[];f.callbacks.onReply=(text,done)=>replies.push({text,done});f.callbacks.onState=s=>states.push(s);
 let drain;f.audio.drain=()=>new Promise(resolve=>drain=resolve);await f.session.sendText('下一步？');
 f.socket().emit({type:'ResponseStartTextStream',index:1});f.socket().emit({type:'ResponseTextSegment',index:1,text:'先听广播。'});f.socket().emit({type:'ResponseEndTextStream',index:1,text:'先听广播。',complete:true});
 assert.deepEqual(replies.at(-1),{text:'先听广播。',done:true});
 f.socket().emit({type:'ResponseStartAudioSegment',index:1});f.socket().emit({type:'ResponseAudioSegment',index:1,audio_segment:'AQACAA=='});
 assert.equal(f.audio.packets.length,1);f.socket().emit({type:'AgentEndPlay',complete:true});await settle();assert.equal(states.at(-1),'speaking');
 drain();await settle();assert.equal(states.at(-1),'idle');assert.equal(f.socket().readyState,1);
 await f.session.sendText('它是谁开的？');assert.equal(f.sent.filter(m=>m.type==='CreateSession').length,1);
});
test('unused text sessions close after 30 seconds to stop metered idle time',async()=>{
 mock.timers.enable({apis:['setTimeout']});const f=setup();await f.session.sendText('下一步？');
 f.socket().emit({type:'ResponseStartTextStream',index:1});f.socket().emit({type:'AgentEndPlay',complete:true});await settle();
 mock.timers.tick(29999);assert.equal(f.socket().readyState,1);mock.timers.tick(1);assert.equal(f.socket().readyState,3);
});
test('interruption clears queued sound and ignores the old text and audio stream tails',async()=>{
 const f=setup(),replies=[];f.callbacks.onReply=t=>replies.push(t);await f.session.sendText('下一步？');
 f.socket().emit({type:'ResponseStartTextStream',index:1});f.socket().emit({type:'ResponseStartAudioStream',index:1});f.session.interrupt();
 f.socket().emit({type:'ResponseTextSegment',index:1,text:'stale'});f.socket().emit({type:'ResponseAudioSegment',index:1,audio_segment:'AQACAA=='});
 assert.equal(replies.length,0);assert.equal(f.audio.packets.length,0);assert.ok(f.audio.cleared>0);
});
test('game tools report results without claiming evidence and known updates do not interrupt that reply',async()=>{
 const f=setup();await f.session.connect();f.callbacks.onAction=name=>{assert.equal(name,'inspect_under_table');return {content:'尚未收集手印'};};
 f.socket().emit({type:'CallFn',call_id:'a',name:'inspect_under_table'});assert.equal(f.sent.at(-1).result.content,'尚未收集手印');
 f.session.setKnown(['song','stool']);assert.equal(f.sent.at(-1).type,'GameContext');assert.notEqual(f.sent.at(-1).update,true);
 f.session.setMuted(true);assert.equal(f.audio.volume,0);
});
test('a recognized tape request can close the session without reviving a stale thinking state',async()=>{
 const f=setup(),states=[];f.callbacks.onState=s=>states.push(s);f.callbacks.onUser=()=>f.session.stop();await f.session.startMicrophone();
 f.socket().emit({type:'AsrTraceEnd',result:'许知音的磁带'});assert.equal(states.at(-1),'idle');assert.equal(f.socket().readyState,3);
});
test('provider quota errors and unanswered requests release the microphone and transport',async()=>{
 mock.timers.enable({apis:['setTimeout']});const f=setup(),errors=[];f.callbacks.onError=s=>errors.push(s);await f.session.startMicrophone();
 f.socket().emit({type:'Report',code:12001,level:'error',content:'quota exceeded'});assert.match(errors[0],/12001/);assert.equal(f.socket().readyState,3);assert.ok(f.mic.closed>0);
 await f.session.sendText('还在吗？');mock.timers.tick(25000);assert.match(errors.at(-1),/没有回应/);assert.equal(f.socket().readyState,3);
});
test('cancellation prevents late input or transcripts and capture congestion stops transmission',async()=>{
 const f=setup(),users=[],errors=[];f.callbacks.onUser=t=>users.push(t);f.callbacks.onError=s=>errors.push(s);await f.session.startMicrophone();
 f.socket().bufferedAmount=300000;f.mic.pcm(new Uint8Array([1,0]));assert.match(errors[0],/网络发送较慢/);
 f.socket().emit({type:'AsrTraceEnd',result:'late'});assert.deepEqual(users,[]);
 const before=f.sent.length;f.mic.pcm(new Uint8Array([1,0]));assert.equal(f.sent.length,before);
});
test('missing credentials fail before capturing any audio',async()=>{
 const f=setup();globalThis.fetch=async()=>({ok:true,json:async()=>({configured:false})});
 await assert.rejects(f.session.startMicrophone(),/尚未配置/);assert.equal(f.mic.starts,0);
});

test('an empty stream-start event cannot disable the reply timeout and strand a live microphone',async()=>{
 mock.timers.enable({apis:['setTimeout']});const f=setup(),errors=[];f.callbacks.onError=message=>errors.push(message);
 await f.session.startMicrophone();f.socket().emit({type:'StopSpeaking'});f.socket().emit({type:'ResponseStartTextStream',index:1});
 mock.timers.tick(25000);assert.match(errors[0]||'',/没有回应|中断|超时/);assert.equal(f.socket().readyState,3);assert.ok(f.mic.closed>0);
});
test('text and PCM progress extend the watchdog, but stalled audio still releases the microphone',async()=>{
 mock.timers.enable({apis:['setTimeout']});const f=setup(),errors=[];f.callbacks.onError=message=>errors.push(message);
 await f.session.startMicrophone();f.socket().emit({type:'AsrTraceEnd',result:'手印是谁留下的？'});
 f.socket().emit({type:'ResponseStartTextStream',index:1});mock.timers.tick(20000);
 f.socket().emit({type:'ResponseTextSegment',index:1,text:'暂时还不能确定。'});mock.timers.tick(20000);assert.deepEqual(errors,[]);
 f.socket().emit({type:'ResponseStartAudioSegment',index:1});f.socket().emit({type:'ResponseAudioSegment',index:1,audio_segment:'AQACAA=='});
 mock.timers.tick(24999);assert.deepEqual(errors,[]);mock.timers.tick(1);
 assert.match(errors[0],/回复中断/);assert.ok(f.mic.closed>0);assert.equal(f.socket().readyState,3);
});
test('duplicate completion cannot close a later reply through a stale idle timer',async()=>{
 mock.timers.enable({apis:['setTimeout']});const f=setup();await f.session.sendText('手印？');
 f.socket().emit({type:'ResponseStartTextStream',index:1});f.socket().emit({type:'AgentEndPlay',complete:true});await settle();
 f.socket().emit({type:'AgentEndPlay',complete:true});await settle();mock.timers.tick(20000);
 await f.session.sendText('留下的时间呢？');mock.timers.tick(10000);assert.equal(f.socket().readyState,1);
});
test('explicit text and final ASR navigation execute even when the model never calls a tool',async()=>{
 const f=setup(),actions=[];f.callbacks.onAction=name=>{actions.push(name);return {content:'视角已移至桌下'};};
 await f.session.sendText('先停一下，我想看看餐桌下面。');assert.deepEqual(actions,['inspect_under_table']);
 await f.session.startMicrophone();f.socket().emit({type:'AsrTraceUpdate',trace_id:'a',result:'不要查看桌下'});assert.equal(actions.length,1);
 f.socket().emit({type:'AsrTraceEnd',trace_id:'a',result:'不要查看桌下'});assert.equal(actions.length,1);
 f.socket().emit({type:'AsrTraceEnd',trace_id:'b',result:'检查餐桌底下'});f.socket().emit({type:'AsrTraceEnd',trace_id:'b',result:'检查餐桌底下'});
 assert.deepEqual(actions,['inspect_under_table','inspect_under_table']);
});
test('act two sends its chapter context, never runs first-act navigation or disclosure tools',async()=>{
 const f=setup(),actions=[];f.callbacks.onAction=name=>{actions.push(name);return {content:'导航完成'};};f.session.setAct(2);f.session.setKnown(['B01','B02']);
 await f.session.sendText('看看餐桌下面，询问许知音的磁带');assert.deepEqual(actions,[]);
 assert.ok(f.sent.filter(m=>m.type==='GameContext').every(m=>m.act===2));
 f.socket().emit({type:'CallFn',call_id:'first',name:'ask_xu_about_tape'});assert.equal(f.sent.at(-1).status,'NoSuchFn');assert.deepEqual(actions,[]);
 f.socket().emit({type:'CallFn',call_id:'second',name:'inspect_duty_room'});assert.deepEqual(actions,['inspect_duty_room']);assert.equal(f.sent.at(-1).status,'Success');
});
