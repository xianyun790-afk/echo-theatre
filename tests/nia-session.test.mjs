import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/lib/nia-session.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const {NiaSession}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const oldFetch=globalThis.fetch,oldWS=globalThis.WebSocket,oldLocation=globalThis.location;
let sessions=[];
afterEach(()=>{sessions.forEach(s=>s.stop());sessions=[];globalThis.fetch=oldFetch;globalThis.WebSocket=oldWS;globalThis.location=oldLocation;});
function setup(){
 let micCalls=0,closed=0,left=0;const callbacks={onState(){},onLevel(){},onUser(){},onReply(){},onError(){},onAction(){return {content:'tool result'};}};
 const sent=[],events={},remote={plays:0,volume:100,stops:0,play(){this.plays++;},stop(){this.stops++;},setVolume(v){this.volume=v;}};
 class Socket extends EventTarget{
  static OPEN=1;readyState=1;
  constructor(url){super();assert.ok(url.endsWith('/api/nia/session'));queueMicrotask(()=>this.emit({type:'TransportReady'}));Socket.last=this;}
  emit(m){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(m)}));}
  send(raw){const m=JSON.parse(raw);sent.push(m);const responses={CreateSession:{type:'CreateSessionResult',success:true},ConfigPipeline:{type:'ConfigUpdated'},RequestAgoraChannelInfo:{type:'AgoraChannelInfo',appid:'app',channel_id:'room',server_uid:7},RequestAgoraToken:{type:'AgoraToken',token:'rtc-token',client_uid:9},StartServing:{type:'AudioAccepting'}};if(responses[m.type])queueMicrotask(()=>this.emit({...responses[m.type],respond_to:m.request_id}));}
  close(){this.readyState=3;this.dispatchEvent(new Event('close'));}
 }
 const client={on(event,fn){events[event]=fn;},async join(){},async leave(){left++;},async publish(){},async subscribe(){},async renewToken(){},getRemoteAudioStats(){return {7:{receiveBytes:8192}};},removeAllListeners(){}};
 const sdk={on(){},off(){},setLogLevel(){},createClient(){return client;},async createMicrophoneAudioTrack(){micCalls++;return {close(){closed++;},getVolumeLevel(){return .1;}};}};
 globalThis.WebSocket=Socket;globalThis.location={protocol:'http:',host:'127.0.0.1:4177'};globalThis.fetch=async()=>({ok:true,json:async()=>({configured:true})});
 const session=new NiaSession(callbacks,async()=>({default:sdk}));sessions.push(session);
 return {session,callbacks,sent,events,remote,socket:()=>Socket.last,sdk,client,counts:()=>({micCalls,closed,left})};
}
test('text sessions complete the RTC handshake without opening the microphone',async()=>{
 const f=setup();f.session.setKnown(['song']);await f.session.sendText('广播是谁开的？');
 assert.equal(f.counts().micCalls,0);assert.equal(f.sent.find(m=>m.type==='GameContext').known[0],'song');
 assert.ok(f.sent.findIndex(m=>m.type==='ConfigPipeline')<f.sent.findIndex(m=>m.type==='StartServing'));
 assert.equal(f.sent.at(-1).type,'PostMultimodalGenerate');
});
test('RTC text streams, interruption and game tools are routed without inventing collected evidence',async()=>{
 const f=setup(),replies=[],users=[],actions=[];f.callbacks.onReply=(text,done)=>replies.push({text,done});f.callbacks.onUser=text=>users.push(text);f.callbacks.onAction=name=>{actions.push(name);return {content:'尚未收集手印'};};
 await f.session.connect();await f.events['user-published']({uid:7,audioTrack:f.remote},'audio');
 f.socket().emit({type:'ResponseStartTextStream',index:1});f.socket().emit({type:'ResponseTextSegment',index:1,text:'尚未'});f.socket().emit({type:'ResponseTextSegment',index:1,text:'确认。'});f.socket().emit({type:'ResponseEndTextStream',index:1,text:'',complete:true});
 assert.deepEqual(replies.at(-1),{text:'尚未确认。',done:true});
 f.socket().emit({type:'AsrTraceEnd',result:'看看桌下'});assert.deepEqual(users,['看看桌下']);
 f.socket().emit({type:'CallFn',call_id:'tool-1',name:'inspect_under_table'});assert.deepEqual(actions,['inspect_under_table']);assert.equal(f.sent.at(-1).result.content,'尚未收集手印');
 f.session.interrupt();assert.ok(f.remote.stops>0);assert.equal(f.sent.at(-1).type,'InterruptAgent');
 f.session.setMuted(true);f.socket().emit({type:'AgentStartPlay'});assert.equal(f.remote.volume,0);
});
test('ending a live session releases the microphone, RTC and relay; late transcripts are ignored',async()=>{
 const f=setup(),users=[];f.callbacks.onUser=text=>users.push(text);await f.session.startMicrophone();assert.equal(f.counts().micCalls,1);
 f.session.stop();assert.equal(f.counts().closed,1);assert.equal(f.counts().left,1);assert.equal(f.socket().readyState,3);
 f.socket().emit({type:'AsrTraceEnd',result:'late'});assert.deepEqual(users,[]);
});
test('missing AK/SK fail clearly before any microphone is acquired',async()=>{
 const f=setup();globalThis.fetch=async()=>({ok:true,json:async()=>({configured:false})});
 await assert.rejects(f.session.startMicrophone(),/尚未配置/);assert.equal(f.counts().micCalls,0);
});

test('cancel during microphone permission wait closes a late track without publishing it',async()=>{
 const f=setup();let release,closed=0,published=0;
 f.sdk.createMicrophoneAudioTrack=()=>new Promise(resolve=>release=resolve);
 f.client.publish=async()=>published++;
 await f.session.connect();const capture=f.session.startMicrophone();
 while(!release)await Promise.resolve();f.session.stop();
 release({close(){closed++;},getVolumeLevel(){return 0;}});await capture;
 assert.equal(closed,1);assert.equal(published,0);
});

test('provider quota exhaustion is shown accurately and closes the realtime session',async()=>{
 const f=setup(),errors=[];f.callbacks.onError=message=>errors.push(message);
 await f.session.connect();f.socket().emit({type:'Report',code:12001,level:'error',content:'quota exceeded'});
 assert.match(errors[0],/12001: quota exceeded/);assert.match(errors[0],/额度/);
 assert.equal(f.socket().readyState,3);assert.equal(f.counts().left,1);
});

test('final full text is not duplicated and a completed text reply closes its metered RTC session',async()=>{
 const f=setup(),replies=[],received=[];f.callbacks.onReply=(text,done)=>replies.push({text,done});f.callbacks.onAudioReceived=bytes=>received.push(bytes);
 await f.session.sendText('下一步？');
 f.socket().emit({type:'ResponseStartTextStream',index:1});
 f.socket().emit({type:'ResponseTextSegment',index:1,text:'先听广播。'});
 f.socket().emit({type:'ResponseEndTextStream',index:1,text:'先听广播。',complete:true});
 assert.deepEqual(replies.at(-1),{text:'先听广播。',done:true});
 f.socket().emit({type:'AgentEndPlay',turn_id:1,complete:true});
 assert.deepEqual(received,[8192]);assert.equal(f.socket().readyState,3);assert.equal(f.counts().left,1);
});

test('a recognized story action that ends RTC cannot resurrect a stale thinking state',async()=>{
 const f=setup(),states=[];f.callbacks.onState=state=>states.push(state);
 f.callbacks.onUser=()=>f.session.stop();await f.session.startMicrophone();
 f.socket().emit({type:'AsrTraceEnd',result:'询问许知音的磁带'});
 assert.equal(states.at(-1),'idle');assert.equal(f.socket().readyState,3);assert.equal(f.counts().closed,1);
});
