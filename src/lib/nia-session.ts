import {PcmMicrophone,PcmStreamPlayer,pcmBase64,type StreamAudio,type StreamMicrophone} from './stream-audio';
import {requestsTableInspection} from './act-one';
export type NiaState='idle'|'connecting'|'listening'|'thinking'|'speaking';
export type NiaAction='inspect_under_table'|'ask_xu_about_tape'|'inspect_duty_room'|'inspect_seventh_door'|'review_act_two_timeline';
type Message=Record<string,unknown>&{type:string};
type HistoryLine={who:string;text:string};
type Callbacks={onState:(state:NiaState)=>void;onLevel:(level:number)=>void;onUser:(text:string)=>void;onPartial?:(text:string)=>void;onReply:(text:string,complete:boolean)=>void;onError:(message:string)=>void;onAudioReceived?:(bytes:number)=>void;onAction:(action:NiaAction)=>Record<string,unknown>};
type Pending={types:string[];resolve:(message:Message)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>};

/** Same-origin PCM streaming. Only the server knows NIA credentials. */
export class NiaSession {
 private socket:WebSocket|null=null;
 private generation=0;private turn=0;private pending=new Map<string,Pending>();
 private connecting:Promise<void>|null=null;private ready=false;private microphone=false;
 private statusController:AbortController|null=null;
 private idleTimer:ReturnType<typeof setTimeout>|null=null;private replyTimer:ReturnType<typeof setTimeout>|null=null;
 private transcript='';private responseIndex:unknown=null;private audioIndex:unknown=null;
 private known:string[]=[];private history:HistoryLine[]=[];private asrTraces=new Set<string>();
 private audioBytes=0;private responseStarted=false;
 private act:1|2=1;
 private audio:StreamAudio;private capture:StreamMicrophone;
 constructor(private callbacks:Callbacks,dependencies?:{audio?:StreamAudio;microphone?:StreamMicrophone}){
  this.audio=dependencies?.audio??new PcmStreamPlayer();this.capture=dependencies?.microphone??new PcmMicrophone();
 }
 setAct(act:1|2){if(this.act!==act){this.stop();this.act=act;}}
 setKnown(known:string[]){
  if(JSON.stringify(this.known)===JSON.stringify(known))return;
  this.known=[...known];if(this.ready)this.send({type:'GameContext',act:this.act,known,history:this.history});
 }
 setHistory(history:HistoryLine[]){this.history=history.filter(m=>m.who==='你 · 林见秋'||m.who.startsWith('主持人')).slice(-8).map(m=>({who:m.who,text:m.text.slice(0,300)}));}
 setMuted(muted:boolean){this.audio.setMuted(muted);}
 private state(state:NiaState){this.callbacks.onState(state);}
 private send(message:Record<string,unknown>){
  if(this.socket?.readyState!==WebSocket.OPEN)throw new Error('实时语音尚未连接，请重试。');
  this.socket.send(JSON.stringify(message));
 }
 private wait(types:string[],id='event:'+types[0]):Promise<Message>{return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('实时语音响应超时，请重新连接。'));},15000);
  this.pending.set(id,{types,resolve,reject,timer});
 });}
 private request(type:string,types:string[],payload:Record<string,unknown>={}){
  const request_id=crypto.randomUUID(),response=this.wait(types,request_id);this.send({type,request_id,...payload});return response;
 }
 private clearReplyDeadline(){if(this.replyTimer)clearTimeout(this.replyTimer);this.replyTimer=null;}
 private expectReply(){
  this.responseStarted=false;this.armReplyDeadline();
 }
 private armReplyDeadline(){
  this.clearReplyDeadline();
  this.replyTimer=setTimeout(()=>this.fail(this.responseStarted?'主持人的语音回复中断，请重试，也可以切换本地试玩。':'主持人暂时没有回应，请重试，也可以切换本地试玩。'),25000);
 }
 private progress(){if(this.replyTimer!==null)this.armReplyDeadline();}
 private receive(message:Message){
  for(const [id,p] of this.pending){
   if(p.types.includes(message.type)&&(id.startsWith('event:')||id===message.respond_to)){
    clearTimeout(p.timer);this.pending.delete(id);
    if(message.type==='ConfigRejected'||message.success===false)p.reject(new Error('NIA 会话配置被拒绝，请检查模型与音色权限。'));
    else p.resolve(message);
   }
  }
  switch(message.type){
   case 'LocalError':this.fail(typeof message.message==='string'?message.message:'实时语音连接失败。');break;
   case 'Report':
    if(Number(message.code)===12001||typeof message.content==='string'&&/quota exceeded/i.test(message.content))this.fail('NIA 实时交互额度超限（12001: quota exceeded）。请检查服务额度后重试。');
    else if(message.level==='error'||Number(message.code)>=400)this.fail('NIA 服务拒绝了请求，请检查模型权限或重新连接。');break;
   case 'ResponseBlocked':this.fail('这次回复未能生成，请换一种问法。');break;
   case 'CloseConnection':this.fail('实时语音连接已结束，请重新连接。');break;
   case 'StartSpeaking':this.interrupt();this.send({type:'GameContext',act:this.act,known:this.known,history:this.history,update:true,request_id:crypto.randomUUID()});this.callbacks.onPartial?.('');this.state('listening');break;
   case 'StopSpeaking':this.state('thinking');this.expectReply();break;
   case 'AsrTraceStart':this.callbacks.onPartial?.('');break;
   case 'AsrTraceUpdate':if(typeof message.result==='string')this.callbacks.onPartial?.(message.result.trim());break;
   case 'AsrTraceEnd':{
    this.callbacks.onPartial?.('');
    const trace=typeof message.trace_id==='string'?message.trace_id:null;
    if(trace&&this.asrTraces.has(trace))break;
    if(typeof message.result==='string'&&message.result.trim()){
     if(trace){this.asrTraces.add(trace);if(this.asrTraces.size>100)this.asrTraces.delete(this.asrTraces.values().next().value!);}
     const token=this.generation;this.inspectIfRequested(message.result.trim());
     if(token!==this.generation)break;
     this.callbacks.onUser(message.result.trim());
     if(token===this.generation){this.state('thinking');this.expectReply();}
    }break;
   }
   case 'ResponseStartTextStream':this.progress();this.responseStarted=true;this.transcript='';this.responseIndex=message.index;break;
   case 'ResponseTextSegment':
    if(this.responseIndex!==null&&message.index===this.responseIndex&&typeof message.text==='string'){
     this.progress();this.transcript+=message.text;this.callbacks.onReply(this.transcript,false);
    }break;
   case 'ResponseEndTextStream':
    if(this.responseIndex!==null&&message.index===this.responseIndex){
     this.progress();
     if(typeof message.text==='string'&&message.text)this.transcript=message.text.startsWith(this.transcript)?message.text:this.transcript.endsWith(message.text)?this.transcript:this.transcript+message.text;
     this.callbacks.onReply(this.transcript,message.complete!==false);this.responseIndex=null;
    }break;
   case 'ResponseStartAudioStream':case 'ResponseStartAudioSegment':
    this.progress();this.responseStarted=true;this.audioIndex=message.index;break;
   case 'ResponseAudioSegment':
    if(this.audioIndex!==null&&message.index===this.audioIndex&&typeof message.audio_segment==='string'){
     this.progress();this.audioBytes+=this.audio.push(message.audio_segment);this.callbacks.onAudioReceived?.(this.audioBytes);this.state('speaking');
    }break;
   case 'AgentStartPlay':this.progress();this.responseStarted=true;this.state('speaking');break;
   case 'AgentEndPlay':{
    if(!this.responseStarted)break;
    this.clearReplyDeadline();this.responseStarted=false;const token=this.generation,turn=this.turn;
    void this.audio.drain().then(()=>{
     if(token!==this.generation||turn!==this.turn)return;
     this.state(this.microphone?'listening':'idle');
     if(!this.microphone)this.idleTimer=setTimeout(()=>this.stop(),30000);
    });break;
   }
   case 'ClearAgentAudio':this.audio.clear();break;
   case 'CallFn':{
    this.progress();if(typeof message.call_id!=='string')return;
    const token=this.generation;
    const allowed=this.act===2?['inspect_duty_room','inspect_seventh_door','review_act_two_timeline']:['inspect_under_table','ask_xu_about_tape'];
    if(typeof message.name==='string'&&allowed.includes(message.name)){
     const result=this.callbacks.onAction(message.name as NiaAction);
     if(token===this.generation)this.send({type:'FnReturn',call_id:message.call_id,status:'Success',result});
    }else this.send({type:'FnReturn',call_id:message.call_id,status:'NoSuchFn',result:{}});
    break;
   }
  }
 }
 private fail(message:string){this.stop();this.callbacks.onError(message);}
 private inspectIfRequested(text:string){
  if(this.act===1&&requestsTableInspection(text))this.callbacks.onAction('inspect_under_table');
 }
 async connect(){
  if(this.idleTimer)clearTimeout(this.idleTimer);this.idleTimer=null;
  if(this.ready)return;if(this.connecting)return this.connecting;
  const token=this.generation;this.state('connecting');const current=()=>token===this.generation;
  const work=(async()=>{
   const controller=new AbortController();this.statusController=controller;
   const deadline=setTimeout(()=>controller.abort(),5000);let response:Response;
   try{response=await fetch('/api/nia/status',{signal:controller.signal});}finally{clearTimeout(deadline);}
   const status=await response.json();if(!current())return;
   if(!response.ok||!status.configured)throw new Error('NIA 尚未配置 AK/SK，请先完成服务端配置。');
   const socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/api/nia/session`);this.socket=socket;
   socket.addEventListener('message',event=>{
    if(!current())return;let message:Message;
    try{message=JSON.parse(event.data);}catch{this.fail('实时语音消息无法解析，请重新连接。');return;}
    if(message&&typeof message.type==='string'){
     try{this.receive(message);}catch{this.fail('实时语音处理失败，请重新连接。');}
    }
   });
   socket.addEventListener('error',()=>{if(current())this.fail('无法连接实时语音服务，请检查网络后重试。');});
   socket.addEventListener('close',()=>{if(current())this.fail('实时语音连接已断开，请重新连接。');});
   await this.wait(['TransportReady']);if(!current())return;
   this.send({type:'GameContext',act:this.act,known:this.known,history:this.history});
   await this.request('CreateSession',['CreateSessionResult']);if(!current())return;
   await this.request('ConfigPipeline',['ConfigUpdated','ConfigRejected']);if(!current())return;
   this.send({type:'ConfigASR',enable:true});
   const accepting=this.wait(['AudioAccepting']);this.send({type:'StartServing'});await accepting;if(!current())return;
   this.ready=true;this.state('idle');
  })();
  this.connecting=work;
  try{await work;}catch(error){if(current()){this.stop();throw error;}}
  finally{if(this.connecting===work)this.connecting=null;}
 }
 async startMicrophone(){
  const token=this.generation;
  try{
   await this.audio.open();if(token!==this.generation)return;
   await this.connect();if(token!==this.generation||!this.ready||this.microphone)return;
   this.microphone=true;
   await this.capture.start(bytes=>{
    if(token!==this.generation||!this.ready)return;
    if((this.socket?.bufferedAmount??0)>256000){this.fail('网络发送较慢，已暂停麦克风。请重试或输入问题。');return;}
    try{this.send({type:'InputBuffer',audio_segment:pcmBase64(bytes)});}catch{this.fail('语音连接已断开，请重新连接。');}
   },level=>{if(token===this.generation)this.callbacks.onLevel(level);});
   if(token!==this.generation)return;this.state('listening');
  }catch(error){if(token===this.generation)this.stop();throw error;}
 }
 async sendText(text:string){
  text=text.trim().slice(0,300);if(!text)return;const token=this.generation;
  try{
   await this.audio.open();if(token!==this.generation)return;
   await this.connect();if(token!==this.generation||!this.ready)return;
   this.interrupt();this.inspectIfRequested(text);if(token!==this.generation)return;
   this.send({type:'GameContext',act:this.act,known:this.known,history:this.history,update:true,request_id:crypto.randomUUID()});this.state('thinking');this.expectReply();
   this.send({type:'PostMultimodalGenerate',text,request_id:crypto.randomUUID()});
  }catch(error){if(token===this.generation)this.stop();throw error;}
 }
 interrupt(){
  this.turn++;this.clearReplyDeadline();this.audio.clear();this.transcript='';this.responseIndex=null;this.audioIndex=null;this.responseStarted=false;
  if(this.idleTimer)clearTimeout(this.idleTimer);this.idleTimer=null;
  if(this.socket?.readyState===WebSocket.OPEN)this.send({type:'InterruptAgent'});
 }
 stop(){
  this.generation++;this.turn++;this.ready=false;this.connecting=null;this.microphone=false;
  this.clearReplyDeadline();if(this.idleTimer)clearTimeout(this.idleTimer);this.idleTimer=null;
  this.statusController?.abort();this.statusController=null;this.capture.close();this.audio.close();this.socket?.close();this.socket=null;
  this.transcript='';this.responseIndex=null;this.audioIndex=null;this.asrTraces.clear();this.responseStarted=false;
  for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('实时会话已取消。'));}this.pending.clear();
  this.callbacks.onLevel(0);this.callbacks.onPartial?.('');this.state('idle');
 }
}
