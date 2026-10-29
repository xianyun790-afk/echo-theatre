import {useEffect,useRef,useState,type Ref} from 'react';
import {createPortal} from 'react-dom';
import {Mic,Square,X} from 'lucide-react';
import {LocalSpeechSession,type SpeechState} from '@/lib/local-speech';
import {Wave} from './Wave';
import './speech-draft.css';

type Props={controlsTarget?:HTMLElement|null;value:string;onChange:(text:string)=>void;maxLength:number;label:string;placeholder:string;id?:string;inputRef?:Ref<HTMLTextAreaElement>;suspended:boolean;context:string;onStart:()=>void;onActiveChange:(active:boolean)=>void};

/** Dictation fills an editable draft. Publication is always a separate player action. */
export function SpeechDraftInput(props:Props){
 const [state,setState]=useState<SpeechState>('idle'),[level,setLevel]=useState(0),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const latest=useRef(props);latest.current=props;
 const session=useRef<LocalSpeechSession|null>(null);
 const root=useRef<HTMLDivElement>(null);
 function revealDraft(){if(!latest.current.controlsTarget)return;requestAnimationFrame(()=>root.current?.querySelector('textarea')?.scrollIntoView({block:'nearest'}));}
 useEffect(()=>{
  let mounted=true;
  const speech=new LocalSpeechSession({
   onState:next=>{if(mounted){setState(next);latest.current.onActiveChange(next!=='idle');}},
   onLevel:value=>{if(mounted)setLevel(value);},
   onFinal:text=>{
    if(!mounted||latest.current.suspended)return;
    const {value,maxLength,onChange}=latest.current;
    const combined=value.trim()?value.trimEnd()+'\n'+text:text;
    onChange(combined.slice(0,maxLength));
    revealDraft();
    setNotice(combined.length>maxLength?`已转成草稿，超过${maxLength}字的部分未填入，请检查后提交。`:'已转成草稿，可修改后再提交。');
   },
   onError:message=>{if(mounted){setError(message);setNotice('');}},
  });
  session.current=speech;
  return()=>{mounted=false;speech.stop();session.current=null;latest.current.onActiveChange(false);};
 },[]);
 useEffect(()=>{session.current?.stop();setError('');setNotice('');},[props.context,props.suspended]);
 const active=state!=='idle';
 function cancel(){session.current?.stop();setNotice('已取消语音输入，原草稿保留。');setError('');}
 function toggle(){
  if(state==='listening'){session.current?.finish();return;}
  if(active){cancel();return;}
  if(latest.current.suspended)return;
  setError('');setNotice('');latest.current.onStart();revealDraft();void session.current?.start();
 }
 const controls=<div className="speech-draft-controls">
  <div className="speech-draft-tools">
   <button type="button" className="draft-mic" disabled={props.suspended} aria-pressed={active} onClick={toggle}>{state==='listening'?<Square size={14}/>:active?<X size={14}/>:<Mic size={16}/>}<span>{state==='listening'?'说完了，转成文字':active?'取消语音输入':'语音输入'}</span></button>
   {state==='listening'&&<button type="button" className="draft-cancel" onClick={cancel}>取消</button>}
   <span className="draft-recognizer">本机中文识别 · 不会自动提交</span>
  </div>
  <div className="speech-draft-status" role="status">{state==='listening'?<><Wave active level={level}/><span>正在听，停顿后自动转成草稿。</span></>:state==='starting'?'正在开启麦克风，请允许浏览器使用…':state==='transcribing'?'正在转成文字，请稍候…':notice||'也可以直接输入文字，确认后再提交。'}</div>
  {error&&<p className="speech-draft-error" role="alert">{error} 文字草稿已保留。</p>}
 </div>;
 return <div ref={root} className="speech-draft">

  <textarea ref={props.inputRef} id={props.id} aria-label={props.label} value={props.value} maxLength={props.maxLength} placeholder={props.placeholder} onChange={event=>{if(active)session.current?.stop();setNotice('');setError('');props.onChange(event.target.value);}}/>
  {props.controlsTarget?createPortal(controls,props.controlsTarget):controls}
 </div>;
}
