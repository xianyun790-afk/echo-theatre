import {requestsTapeDisclosure} from '@/lib/act-one';
import {hostVoice} from '@/lib/voices';
import {useEffect,useRef,useState} from 'react';
import {Mic,MicOff,Send} from 'lucide-react';
import {NiaSession,type NiaState} from '@/lib/nia-session';
import type {HostProps,HostInputProps} from './HostConversation';
import {Wave} from './Wave';
export function RealtimeHostConversation(props:HostProps&HostInputProps&{onUseLocal:()=>void}){
 const latest=useRef(props);latest.current=props;
 const {draft,onDraftChange:setDraft}=props;const composing=useRef(false);
 const [partial,setPartial]=useState(''),[state,setState]=useState<NiaState>('idle'),[error,setError]=useState(''),[voiceMode,setVoiceMode]=useState(false),[level,setLevel]=useState(0),[audioBytes,setAudioBytes]=useState(0);
 const session=useRef<NiaSession|null>(null),voice=useRef(false),alive=useRef(true),operation=useRef(0);
 function finish(){operation.current++;session.current?.stop();voice.current=false;setVoiceMode(false);latest.current.onVoiceActiveChange(false);}
 function discloseTape(text:string){
  if(latest.current.act===2||!requestsTapeDisclosure(text))return false;
  finish();setError('');latest.current.onAsk(text);return true;
 }
 useEffect(()=>{
  alive.current=true;
  const live=new NiaSession({
   onState:next=>{if(!alive.current)return;setState(next);if(next==='idle'&&!voice.current)latest.current.onVoiceActiveChange(false);},
   onLevel:value=>{if(alive.current)setLevel(value);},
   onPartial:text=>{if(alive.current)setPartial(text);},
   onUser:text=>{if(!discloseTape(text))latest.current.onLiveLine('你 · 林见秋',text,true);},
   onReply:(text,complete)=>{if(text)latest.current.onLiveLine('主持人 · NIA',text,complete);},
   onAction:action=>latest.current.onNiaAction(action),
   onAudioReceived:bytes=>{if(alive.current)setAudioBytes(bytes);},
   onError:message=>{if(!alive.current)return;setError(message);voice.current=false;setVoiceMode(false);latest.current.onVoiceActiveChange(false);},
  });session.current=live;live.setAct(latest.current.act??1);live.setKnown(latest.current.known);live.setHistory(latest.current.history);live.setMuted(latest.current.muted);
  return()=>{alive.current=false;live.stop();session.current=null;latest.current.onVoiceActiveChange(false);};
 },[]);
 useEffect(()=>{session.current?.setKnown(props.known);},[props.known]);
 useEffect(()=>{session.current?.setHistory(props.history);},[props.history]);
 useEffect(()=>{session.current?.setMuted(props.muted);},[props.muted]);
 useEffect(()=>{if(props.suspended||props.busy)finish();},[props.suspended,props.busy]);
 const fail=(e:unknown)=>{if(!alive.current)return;finish();setError(e instanceof DOMException&&e.name==='NotAllowedError'?'麦克风权限未开启，请在浏览器中允许后重试。':e instanceof Error?e.message:'实时语音连接失败，请重试。');};
 async function toggleVoice(){
  setError('');if(voice.current){finish();return;}
  latest.current.onInterrupt();voice.current=true;setVoiceMode(true);latest.current.onVoiceActiveChange(true);
  const token=++operation.current;try{await session.current?.startMicrophone();}catch(e){if(token===operation.current)fail(e);}
 }
 async function send(){
  if(composing.current)return;const text=draft.trim();if(!text)return;setDraft('');setError('');if(discloseTape(text))return;latest.current.onInterrupt();latest.current.onVoiceActiveChange(true);latest.current.onLiveLine('你 · 林见秋',text,true);
  const token=++operation.current;try{await session.current?.sendText(text);}catch(e){if(token===operation.current)fail(e);}
 }
 const active=state!=='idle'||voiceMode;
 return <section className={`host-conversation ${active?'voice-connected':''}`} aria-label="直接与主持人对话" data-nia-audio-bytes={audioBytes}>
  <form className="host-input-row" onSubmit={event=>{event.preventDefault();void send();}}>
   <button type="button" className="host-mic" aria-label={voiceMode?'结束语音对话':'向主持人语音提问'} aria-pressed={voiceMode} onClick={()=>void toggleVoice()}>{voiceMode?<MicOff size={18}/>:<Mic size={18}/>}<span>{voiceMode?'结束语音对话':'向主持人提问'}</span></button>
   <span className="host-input-divider"/>
   <input value={draft} onChange={event=>{setDraft(event.target.value);setError('');}} placeholder={state==='listening'?'正在听你说话，也可以输入…':'也可以输入问题，按 Enter 发送…'} aria-label="直接输入给主持人的问题" maxLength={300} autoComplete="off" onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}} onKeyDown={event=>{if(event.key==='Enter'&&(composing.current||event.nativeEvent.isComposing||event.keyCode===229))event.preventDefault();}}/>
   <button type="submit" className="host-send" aria-label="发送给主持人" disabled={!draft.trim()||state==='connecting'}><Send size={18}/></button>
  </form>
  <div className="host-input-status" role="status">
   {state==='connecting'?<span>正在连接主持人…</span>:state==='listening'?<><Wave active level={level}/><span>正在听 · 可以直接说话，随时打断</span></>:state==='thinking'?<><Wave active/><span>主持人正在思考…</span></>:state==='speaking'?<><Wave active/><span>{voiceMode?'主持人回应中 · 可以直接打断':'主持人回应中 · 可输入下一条问题'}</span></>:<span>点击麦克风连续对话 · Enter 发送文字</span>}
   <span className="host-service-note" title="开始语音对话后，麦克风声音通过本机中转的 WebSocket 发送至 NIA 实时语音模型。结束后释放麦克风。">{active?'实时对话 · 背景音乐已暂停':hostVoice.name+' · 普通话'}</span>
  </div>
  {partial&&<p className="host-asr-preview" aria-live="polite">正在识别：{partial}</p>}
  {error&&<div className="host-input-error" role="alert"><p>{error}</p><button className="text-link" onClick={()=>{finish();props.onUseLocal();}}>先用本地识别和预设回应继续试玩</button></div>}
 </section>;
}
