import {useEffect,useRef,useState} from 'react';
import {Mic,MicOff,Send} from 'lucide-react';
import {LocalSpeechSession,type SpeechState} from '@/lib/local-speech';
import {Wave} from './Wave';
import {RealtimeHostConversation} from './RealtimeHostConversation';
import type {NiaAction} from '@/lib/nia-session';

export type HostProps={act?:1|2;busy:boolean;suspended:boolean;context:string;known:string[];history:{who:string;text:string}[];muted:boolean;onLiveLine:(who:string,text:string,complete:boolean)=>void;onNiaAction:(action:NiaAction)=>Record<string,unknown>;onAsk:(text:string)=>void;onInterrupt:()=>void;onVoiceActiveChange:(active:boolean)=>void};
export type HostInputProps={draft:string;onDraftChange:(text:string)=>void};
export function HostConversation(props:HostProps){
 const [nia,setNia]=useState(false),[local,setLocal]=useState(false),[checking,setChecking]=useState(true),[draft,setDraft]=useState('');
 useEffect(()=>{
  let mounted=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
  void fetch('/api/nia/status',{signal:controller.signal}).then(r=>r.ok?r.json():null).then(s=>{if(mounted)setNia(s?.configured===true);}).catch(()=>{}).finally(()=>{clearTimeout(timer);if(mounted)setChecking(false);});
  return()=>{mounted=false;clearTimeout(timer);controller.abort();};
 },[]);
 const input={draft,onDraftChange:setDraft};
 return nia&&!local?<RealtimeHostConversation {...props} {...input} onUseLocal={()=>setLocal(true)}/>:<LocalHostConversation {...props} {...input} checking={checking} onRetryLive={nia?()=>setLocal(false):undefined}/>;
}
function LocalHostConversation({busy,suspended,context,onAsk,onInterrupt,onVoiceActiveChange,onRetryLive,draft,onDraftChange:setDraft,checking}:HostProps&HostInputProps&{checking:boolean;onRetryLive?:()=>void}){
 const composing=useRef(false);
 const [voiceMode,setVoiceMode]=useState(false),[state,setState]=useState<SpeechState>('idle'),[error,setError]=useState(''),[level,setLevel]=useState(0);
 const session=useRef<LocalSpeechSession|null>(null),latest=useRef({onAsk,onInterrupt,onVoiceActiveChange});latest.current={onAsk,onInterrupt,onVoiceActiveChange};
 function setVoiceSession(active:boolean){setVoiceMode(active);latest.current.onVoiceActiveChange(active);}
 useEffect(()=>{
  const speech=new LocalSpeechSession({onState:setState,onLevel:setLevel,onFinal:text=>{setDraft('');latest.current.onAsk(text);},onError:message=>{setError(message);setVoiceSession(false);}});
  session.current=speech;return()=>{speech.stop();session.current=null;latest.current.onVoiceActiveChange(false);};
 },[]);
 useEffect(()=>{
  if(suspended){session.current?.stop();setVoiceSession(false);return;}
  if(!voiceMode||busy)session.current?.stop();else session.current?.start();
 },[voiceMode,busy,suspended]);
 useEffect(()=>{session.current?.stop();setVoiceSession(false);},[context]);
 function toggleVoice(){
  if(checking)return;setError('');
  if(voiceMode){session.current?.stop();setVoiceSession(false);return;}
  setVoiceSession(true);latest.current.onInterrupt();session.current?.start();
 }
 function send(){if(checking||composing.current)return;const text=draft.trim();if(!text)return;session.current?.stop();setVoiceSession(false);setError('');setDraft('');latest.current.onAsk(text);}
 const listening=state==='listening',starting=state==='starting';
 return <section className={`host-conversation ${voiceMode?'voice-connected':''}`} aria-label="直接与主持人对话">
  <form className="host-input-row" onSubmit={event=>{event.preventDefault();send();}}>
   <button type="button" className="host-mic" disabled={checking} aria-label={voiceMode?'结束语音对话':'向主持人语音提问'} aria-pressed={voiceMode} onClick={toggleVoice}>{voiceMode?<MicOff size={18}/>:<Mic size={18}/>}<span>{voiceMode?'结束语音对话':'向主持人提问'}</span></button>
   <span className="host-input-divider"/>
   <input value={draft} onChange={event=>{if(voiceMode){session.current?.stop();setVoiceSession(false);}setDraft(event.target.value);setError('');}} placeholder={listening?'正在听你说话…':'也可以输入问题，按 Enter 发送…'} aria-label="直接输入给主持人的问题" maxLength={300} autoComplete="off" onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}} onKeyDown={event=>{if(event.key==='Enter'&&(composing.current||event.nativeEvent.isComposing||event.keyCode===229))event.preventDefault();}}/>
   <button type="submit" className="host-send" aria-label="发送给主持人" disabled={checking||!draft.trim()}><Send size={18}/></button>
  </form>
  <div className="host-input-status" role="status">{checking?<span>正在检查语音服务…</span>:listening?<><Wave active level={level}/><span>正在听 · 说完自动识别并发送</span></>:starting?<><span className="host-status-dot"/><span>正在开启麦克风…</span></>:state==='transcribing'?<><Wave active/><span>正在识别这句话…</span></>:voiceMode&&busy?<><Wave active/><span>主持人回应中 · 回应结束后继续听你说</span></>:<span>点击麦克风直接对话 · Enter 发送文字</span>}<span className="host-service-note" title="麦克风音频仅发送到这台电脑的中文识别服务，不上传第三方、不保存录音。主持人使用预设回应。">{checking?'连接准备中':voiceMode?'本地识别中 · 背景音乐已静音':'本地试玩 · 预设回应'}</span></div>
  {onRetryLive&&<button className="text-link" onClick={()=>{session.current?.stop();onRetryLive();}}>重新连接实时主持人</button>}
  {error&&<p className="host-input-error" role="alert">{error}</p>}
 </section>;
}
