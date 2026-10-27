import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ArrowDown,ArrowLeft,ArrowRight,AudioLines,BookOpen,Check,ChevronRight,Eye,FileText,Headphones,Info,MoreHorizontal,Pause,Play,Radio,RotateCcw,Search,Send,Volume2,VolumeX} from 'lucide-react';
import {Panel} from '@/components/ui/Panel';
import {Wave} from '@/components/Wave';
import {evidence,opening,replyTo,broadcastText,type EvidenceId} from '@/lib/act-one';
import {SceneAudio} from '@/lib/audio';
import narration from '@/lib/narration.json';
import {hostVoice,voiceForSpeaker} from '@/lib/voices';
type NarrationId=keyof typeof narration;
import {HostConversation} from '@/components/HostConversation';
import type {NiaAction} from '@/lib/nia-session';
import {Room,type RoomView,type Target} from '@/components/Room';
import {Deliberation} from '@/components/Deliberation';
import {canConvene,type CouncilDraft,type CouncilRecord} from '@/lib/council';
import {hasSavedProgress,initialProgress,parseProgress,type Message,type Progress} from '@/lib/game-save';
import {useHostLayout} from '@/lib/useHostLayout';

const qaScope=new URLSearchParams(location.search).get('qa');
const SAVE='echo-act-one-v2'+(qaScope?'-qa-'+qaScope:'');
function restore():Progress{try{return parseProgress(localStorage.getItem(SAVE));}catch{return initialProgress();}}

export default function App(){
 const [progress,setProgress]=useState<Progress>(restore),[scene,setScene]=useState<'speaker'|'stool'>('speaker');
 const [panel,setPanel]=useState<'evidence'|'script'|'more'|'about'|'history'|'finish'|null>(null);
 const [selected,setSelected]=useState<EvidenceId|null>(null);
 const [resuming,setResuming]=useState(()=>hasSavedProgress(progress));
 const [evidenceReplay,setEvidenceReplay]=useState(false);
 const gameRef=useRef<HTMLElement|null>(null);
 const [preparing,setPreparing]=useState(false);
 const [playing,setPlaying]=useState(false),[thinking,setThinking]=useState(false),[line,setLine]=useState(-1),[muted,setMuted]=useState(false),[musicEnabled,setMusicEnabled]=useState(false);
 const [message,setMessage]=useState<Message>(()=>progress.history.at(-1)||{who:'序幕',text:opening});
 const history=progress.history;
 const [toast,setToast]=useState(''),[audioError,setAudioError]=useState(''),[saveError,setSaveError]=useState('');
 const [showPoints,setShowPoints]=useState(false);
 const [council,setCouncil]=useState(false),[speakerSeat,setSpeakerSeat]=useState(-1),[focusEvidence,setFocusEvidence]=useState<EvidenceId>('song');
 const [entered,setEntered]=useState(false),[entering,setEntering]=useState(false),[view,setView]=useState<RoomView>('room');
 const anchors=useRef<Record<string,HTMLButtonElement|null>>({}),entryTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const audio=useRef<SceneAudio|null>(null),request=useRef(0),feedbackTimer=useRef<ReturnType<typeof setTimeout>|null>(null),replyTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const finishNarration=useRef({pending:false,active:false});
 const entryState=useRef({entered:false,stage:'song' as 'song'|'narration'|'done'|'cancelled',diningNarrated:false});
 const known=progress.known,heard=known.includes('song'),allFound=canConvene(known);
 useHostLayout(gameRef,entered&&!council);
 const saveCouncilDraft=useCallback((draft:CouncilDraft)=>setProgress(p=>({...p,councilDraft:draft})),[]);
 useEffect(()=>{audio.current=new SceneAudio();if(!resuming)startOpening();return()=>{request.current++;void audio.current?.destroy();if(feedbackTimer.current)clearTimeout(feedbackTimer.current);if(replyTimer.current)clearTimeout(replyTimer.current);if(entryTimer.current)clearTimeout(entryTimer.current);};},[]);
 useLayoutEffect(()=>{if(!entered)return;setProgress(p=>p.checkpoint?.scene===scene&&p.checkpoint?.view===view?p:{...p,checkpoint:{scene,view}});},[entered,scene,view]);
 useLayoutEffect(()=>{try{localStorage.setItem(SAVE,JSON.stringify(progress));setSaveError('');}catch{setSaveError('浏览器无法保存进度；本次仍可继续体验。');}},[progress]);
 useEffect(()=>{
  if(panel){
   stop();
   if(panel==='finish'&&finishNarration.current.pending){
    finishNarration.current.pending=false;finishNarration.current.active=true;
    void narrate(['n17-act-one-end']).finally(()=>{finishNarration.current.active=false;});
   }
  }else if(finishNarration.current.active||evidenceReplay){finishNarration.current.active=false;stop();}
 },[panel]);
 function notify(text:string){setToast(text);if(feedbackTimer.current)clearTimeout(feedbackTimer.current);feedbackTimer.current=setTimeout(()=>setToast(''),4200);}
 function add(id:EvidenceId){setProgress(p=>p.known.includes(id)?p:{...p,known:[...p.known,id]});}
 function tell(who:string,text:string){setMessage({who,text});setProgress(p=>({...p,history:[...p.history,{who,text}]}));}
 async function narrate(ids:NarrationId[],who='旁白'){
  const token=++request.current;setLine(-1);setPlaying(true);setAudioError('');
  for(const id of ids){
   if(token!==request.current)break;
   tell(who,narration[id].text);setPreparing(true);
   try{await audio.current?.play(id,undefined,undefined,{onStart:()=>{if(token===request.current)setPreparing(false);}});}
   catch(e){if(token===request.current)setAudioError(e instanceof Error?e.message:'语音暂时无法播放，请阅读字幕。');break;}
  }
  if(token===request.current){setPlaying(false);setPreparing(false);}
  return token===request.current;
 }
 function startOpening(){
  entryState.current={entered:false,stage:'song',diningNarrated:false};
  const token=++request.current;
  void audio.current?.playFile('/audio/opening-song.mp3',undefined,{kind:'music',retryOnGesture:true,onStart:()=>{
   if(token!==request.current)return;add('song');setPlaying(true);setPreparing(false);setLine(0);tell('开场 · 童谣',broadcastText);
  },onEnded:()=>{if(token===request.current)void narrateOpening();}}).catch(e=>{if(token===request.current)setAudioError(e instanceof Error?e.message:'开场音频暂时无法播放。');}).finally(()=>{
   if(token!==request.current)return;entryState.current.stage='cancelled';setPlaying(false);setPreparing(false);setLine(-1);
  });
 }
 async function narrateOpening(){
  entryState.current.stage='narration';
  if(!await narrate(['n01-return'],'开场 · 旁白'))return;
  if(entryState.current.entered&&!entryState.current.diningNarrated){
   entryState.current.diningNarrated=true;
   if(!await narrate(['n02-dining-room']))return;
  }
  entryState.current.stage='done';
 }
 function stop(){
  request.current++;audio.current?.stop();if(replyTimer.current)clearTimeout(replyTimer.current);
  if(entryState.current.stage!=='done')entryState.current.stage='cancelled';
  setPlaying(false);setPreparing(false);setThinking(false);setEvidenceReplay(false);
  if(line>=0)setMessage({who:'主持人',text:'广播暂时停了。可以重听，或先查看餐桌下面。'});setLine(-1);
 }
 async function playRhyme(options?:{stayWide?:boolean}){
  if(playing||thinking){stop();return;}
  setScene('speaker');setView(options?.stayWide?'room':'radio');
  await playRhymeForced(request.current);
 }
 async function replayEvidence(){
  if(evidenceReplay){stop();return;}
  const token=++request.current;setEvidenceReplay(true);setPlaying(true);setPreparing(true);setAudioError('');
  try{await audio.current?.playFile('/audio/opening-song.mp3',undefined,{kind:'music',onStart:()=>{if(token===request.current)setPreparing(false);}});}
  catch(e){if(token===request.current)setAudioError(e instanceof Error?e.message:'录音暂时无法播放，请重试。');}
  finally{if(token===request.current){setEvidenceReplay(false);setPlaying(false);setPreparing(false);}}
 }
 function inspectStool(){stop();setScene('stool');setView('stool');void narrate(['n07-under-table']);}
 function recordStool(){
  stop();add('stool');notify('线索已收进证据本');
  void narrate(['n08-handprint','n09-evidence-recorded',known.includes('tape')&&heard?'n12-ready-to-gather':'n10-ask-xu']);
 }
 function focusRadio(){stop();setScene('speaker');setView('radio');void narrate(['n03-radio-focus']);}
 function startMusic(){setMusicEnabled(true);void audio.current?.setBackground(true).catch(()=>setMusicEnabled(false));}
 async function enterRoom(){
  startMusic();entryState.current.entered=true;setEntered(true);setEntering(true);setView('room');setScene('speaker');
  entryTimer.current=setTimeout(()=>setEntering(false),2600);
  if(['done','cancelled'].includes(entryState.current.stage)&&!entryState.current.diningNarrated){entryState.current.diningNarrated=true;void narrate(['n02-dining-room']);}
 }
 function continueGame(){
  stop();startMusic();entryState.current={entered:true,stage:'done',diningNarrated:true};setEntered(true);setEntering(false);
  const checkpoint=progress.checkpoint;
  if(progress.completed&&progress.deliberation){setScene('speaker');setView('room');setPanel('finish');return;}
  const resumeCouncil=checkpoint?.view==='council'&&canConvene(known);
  setScene(resumeCouncil?'speaker':checkpoint?.scene??'speaker');setView(resumeCouncil?'council':checkpoint?.view==='council'?'room':checkpoint?.view??'room');setCouncil(resumeCouncil);
 }
 function beginCouncil(preview=false){if(!preview&&!canConvene(known)){notify('先公开本幕三条线索，再召集大家集中推理');return;}stop();if(!entered)startMusic();if(entryTimer.current)clearTimeout(entryTimer.current);setEntering(false);setPanel(null);setEntered(true);setScene('speaker');setView('council');setCouncil(true);if(preview){setProgress(p=>({...p,known:['song','stool','tape'],completed:false,councilDraft:undefined}));notify('演示跳转：已预置本幕三条公开线索');}}
 function finishCouncil(record:CouncilRecord){finishNarration.current.pending=true;setProgress(p=>({...p,deliberation:record,councilDraft:undefined,completed:false}));setCouncil(false);setView('room');tell('集中推理记录',`本地演示中的暂定判断：${record.summary} 尚未汇总真实多人意见。`);setPanel('finish');}
 function interact(target:Target){
  if(!entered||entering)return;
  if(council){if(target.startsWith('evidence-')){const id=target.slice(9) as EvidenceId;if(known.includes(id)){setSelected(id);setPanel('evidence');}}return;}
  if(target==='radio'){if(playing)stop();else if(view!=='radio')focusRadio();else void playRhyme();}
  else if(target==='table')inspectStool();
  else if(target==='print'){if(view!=='stool')inspectStool();else recordStool();}
  else{stop();void narrate([target==='window'?'n05-rain-window':'n06-old-cabinet']);}
 }
 async function answer(text:string){
  if(!text.trim())return;stop();setAudioError('');const token=++request.current;
  tell('你 · 林见秋',text.trim());setThinking(true);
  replyTimer.current=setTimeout(async()=>{
   if(token!==request.current)return;const reply=replyTo(text,known);setThinking(false);tell(reply.label||'主持人',reply.text);
   if(reply.evidence){add(reply.evidence);notify('许知音的演示证词已公开，已收进证据本');}
   if(reply.action==='stool'){setScene('stool');setView('stool');}
   setPlaying(true);setPreparing(true);setAudioError('');
   try{
    await audio.current?.play(reply.audio,undefined,undefined,{onStart:()=>{if(token===request.current)setPreparing(false);}});
    if(token!==request.current)return;
    if(reply.action==='replay'){await playRhymeForced(token);return;}
    if(reply.evidence==='tape'){
     await narrate(['n11-tape-received',...(canConvene([...known,'tape'])?['n12-ready-to-gather' as NarrationId]:[])]);return;
    }
   }catch(e){if(token===request.current)setAudioError(e instanceof Error?e.message:'请阅读字幕。');}
   finally{if(token===request.current){setPlaying(false);setPreparing(false);}}
  },400);
 }
 async function playRhymeForced(previous:number){
  if(previous!==request.current)return;
  const token=++request.current;let ended=false;setPlaying(true);setPreparing(true);setAudioError('');setScene('speaker');setView('radio');setLine(0);tell('广播 · 童谣',broadcastText);
  try{
   await audio.current?.playFile('/audio/opening-song.mp3',undefined,{kind:'music',onStart:()=>{if(token===request.current){setPreparing(false);add('song');}},onEnded:()=>{ended=true;}});
   if(token===request.current&&ended){await narrate(['n04-song-ended']);return;}
  }catch(e){if(token===request.current)setAudioError(e instanceof Error?e.message:'音频无法播放，可在证据本查看童谣。');}
  finally{if(token===request.current){setPlaying(false);setPreparing(false);setLine(-1);}}
 }
 function toggleMute(){setMuted(v=>{audio.current?.setMuted(!v);return !v;});}
 function reset(){finishNarration.current={pending:false,active:false};stop();void audio.current?.setBackground(false);setMusicEnabled(false);if(entryTimer.current)clearTimeout(entryTimer.current);setEntering(false);setCouncil(false);setProgress(initialProgress());setResuming(false);setScene('speaker');setView('room');setEntered(false);setPanel(null);setMessage({who:'序幕',text:opening});setAudioError('');setSelected(null);startOpening();notify('已回到第一幕开场');}
 function liveLine(who:string,text:string,complete:boolean){setMessage({who,text});if(complete)setProgress(p=>({...p,history:[...p.history,{who,text}]}));}
 function niaAction(action:NiaAction):Record<string,unknown>{
  if(action==='inspect_under_table'){setScene('stool');setView('stool');return {content:'视角已移至桌下，请玩家点击调查凳面的手印；尚未自动收集物证。'};}
  if(action==='ask_xu_about_tape'){add('tape');notify('许知音的演示证词已公开，已收进证据本');return {content:'【演示许知音主动公开】邀请函附带一盘磁带。它与广播是否同一版本尚未比对。资料已加入证据本，不能确认来源、剪接或身份。'};}
  return {content:'该操作尚未开放，不能产生新线索。'};
 }
 function download(){const blob=new Blob([JSON.stringify({title:'第七个孩子 · 第一幕',scope:'本地单人演示，未连接多人服务；实时主持人以页面实际连接状态为准',evidence:evidence.filter(e=>known.includes(e.id)),history,deliberation:progress.deliberation},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='第七个孩子-第一幕调查记录.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const activeEvidence=evidence.find(e=>e.id===selected);
 return <main ref={gameRef} className={`game real-room scene-${scene} view-${view} ${council?'is-council':''} ${entered?'has-entered':'at-door'} ${entering?'is-entering':''} ${playing?'is-playing':''}`}>
  <Room entered={entered} view={view} speaking={playing&&line>=0} showPoints={showPoints} onInteract={interact} anchors={anchors} speakerSeat={speakerSeat} focusEvidence={focusEvidence}/><div className="scene-vignette" aria-hidden="true"/><div className="scene-grain" aria-hidden="true"/>
  <header className="topbar">
   <div className="game-brand"><span className="brand-symbol"><Radio size={19} strokeWidth={1.2}/></span><div><span className="brand-name" data-type-surface="game-brand">第七个孩子</span><span className="brand-sub">THE SEVENTH CHILD</span></div></div>
   <div className="location"><span className="location-dash"/>白榆儿童之家<span className="location-divider">/</span><span>{council?'集中推理':scene==='speaker'?'餐厅':'餐桌下'}</span><span className="location-dash"/></div>
   <div className="top-tools"><span className="demo-label"><i/>本地试玩</span><button className="icon-button" aria-label={muted?'打开声音':'静音'} onClick={toggleMute}>{muted?<VolumeX size={19}/>:<Volume2 size={19}/>}</button><button className="icon-button" aria-label="试玩说明" onClick={()=>setPanel('about')}><Info size={18}/></button></div>
  </header>
  <section className="chapter-intro" aria-label="章节信息"><div className="chapter-number">第一幕<span>01 / 03</span></div><h1 data-type-surface="chapter-title">请在熄灯前<br/>回家</h1><div className="chapter-rule"/><p>{scene==='speaker'?'雨还没有停。':'灰尘不会说谎。'}<br/>{scene==='speaker'?'有人在等你们回来。':'但它还没有说出名字。'}</p></section>
  <div className={`scene-interactions ${showPoints?'show-points':''}`} aria-label="场景中的可调查物件" hidden={!entered||entering||council}>
   {scene==='speaker'?<>
    <button ref={el=>{anchors.current.radio=el;}} className={`hotspot hotspot-speaker ${!heard?'current-target':''}`} aria-label={playing&&line>=0?'停止广播':'调查旧广播'} onClick={()=>interact('radio')}><span className="hotspot-pin"><Radio size={15}/></span><span className="hotspot-name">{view==='radio'?'打开广播':'走近广播'}</span></button>
    <button ref={el=>{anchors.current.window=el;}} className="hotspot hotspot-window" aria-label="查看窗外" onClick={()=>interact('window')}><span className="hotspot-pin"><Eye size={14}/></span><span className="hotspot-name">查看窗外</span></button>
    <button ref={el=>{anchors.current.cabinet=el;}} className="hotspot hotspot-cabinet" aria-label="检查旧木柜" onClick={()=>interact('cabinet')}><span className="hotspot-pin"><Search size={14}/></span><span className="hotspot-name">检查木柜</span></button>
    <button ref={el=>{anchors.current.table=el;}} className={`hotspot hotspot-table ${heard&&!known.includes('stool')?'next-target':''}`} aria-label="检查餐桌下面" onClick={inspectStool}><span className="hotspot-pin"><Search size={14}/></span><span className="hotspot-name">餐桌下面</span></button>
   </>:<button ref={el=>{anchors.current.print=el;}} className="hotspot hotspot-print current-target" aria-label={known.includes('stool')?'重新查看手印':'调查凳面上的手印'} onClick={()=>{if(known.includes('stool')){setSelected('stool');setPanel('evidence');}else recordStool();}}><span className="hotspot-pin">{known.includes('stool')?<Check size={15}/>:<Search size={15}/>}</span><span className="hotspot-name">{known.includes('stool')?'查看手印记录':'调查手印'}</span></button>}
  </div>
  <button className={`reveal-points ${showPoints?'enabled':''}`} onClick={()=>setShowPoints(v=>!v)} aria-label={showPoints?'隐藏交互点提示':'显示交互点提示'} aria-pressed={showPoints}><Eye size={14}/><span>{showPoints?'收起提示':'寻找交互点'}</span></button>
  {view!=='room'&&<button className="back-scene" onClick={()=>{stop();setScene('speaker');setView('room');setMessage({who:'当前目标',text:heard?'童谣已经停下。你可以继续调查物件，或者向主持人提问。':'先找到餐厅里正在发声的广播。'});}}><ArrowLeft size={15}/>回到餐厅</button>}
  <div className="scene-object-label"><span className="object-tick"/><span>{view==='radio'?'旧式有线广播':view==='stool'?'儿童用小木凳':'白榆 · 旧餐厅'}</span><small>{view==='radio'?'点击开关 · 拖动查看':view==='stool'?'点击手印 · 记录证据':'点击场景中的物件进行调查'}</small></div>
  {!entered&&<section className="entry-screen" aria-label="第一幕入口">
   <div className="entry-copy"><span className="eyebrow">ACT I · 白榆儿童之家</span><h1 data-type-surface="entry-title">请在熄灯前<br/>回家。</h1><p>二十年后，你又站在这扇门前。<br/>门里，传来了一阵电流声。</p></div>
   <div className="entry-action">
     <span className="entry-objective">{resuming?progress.completed?'第一幕已完成，调查记录已保存。':`已发现 ${known.length} / 3 条线索，继续上次的调查。`:'推门进去，寻找歌声的来源。'}</span>
     <button className="primary-action" onClick={()=>resuming?continueGame():void enterRoom()}>{resuming?progress.completed?'查看第一幕记录':progress.checkpoint?.view==='council'?'继续集中推理':'继续调查':'推门进入'}<span className="action-end"><ArrowRight size={17}/></span></button>
     <span className="action-hint"><Headphones size={13}/>声音将成为你的线索</span>
     <button className="quiet-action council-demo-entry" onClick={()=>beginCouncil(true)}>演示跳转 · 直接体验集中推理<ArrowRight size={12}/></button>
   </div>
  </section>}
  <section className="dialogue-region" aria-label="当前语音与交互">
   <div className="voice-meta"><span className={`voice-dot ${playing?'is-speaking':''}`}/><span>{thinking?'主持人正在整理已公开的信息':playing&&line>=0?'广播 · 童谣':message.who}</span>{playing&&!preparing&&<Wave active/>}<span className="voice-origin">{preparing?'正在准备语音…':playing&&line>=0?'原声录音':message.who.startsWith('你 ·')?'文字输入':'NIA · '+voiceForSpeaker(message.who).name}</span></div>
   <div className="subtitle" aria-live="polite" aria-atomic="true">{thinking?<span className="thinking-dots">稍等，让我们看看已经知道了什么<span>…</span></span>:line>=0?<span className="broadcast-caption">旧广播里，传来一首童谣。</span>:<p>{message.text}</p>}</div>
   {audioError&&<p className="inline-error" role="alert">{audioError}</p>}
   <div className="main-action-row">
    {entering?<button className="primary-action" disabled><AudioLines size={17}/>正在走入餐厅…</button>:playing||thinking?<button className="primary-action" onClick={stop}><Pause size={17}/>{thinking?'取消提问':'停止播放'}<span className="action-end"><span/></span></button>:progress.completed&&progress.deliberation?<button className="primary-action" onClick={()=>setPanel('finish')}><FileText size={17}/>查看第一幕记录<span className="action-end"><Check size={16}/></span></button>:allFound?<button className="primary-action" onClick={()=>beginCouncil()}><AudioLines size={17}/>{progress.councilDraft?'继续集中推理':'召集大家，集中推理'}<span className="action-end"><ArrowRight size={16}/></span></button>:scene==='stool'&&!known.includes('stool')?<button className="primary-action" onClick={recordStool}><FileText size={17}/>记录这条线索<span className="action-end"><Check size={16}/></span></button>:!heard&&view==='room'?<button className="primary-action" onClick={focusRadio}><Radio size={17}/>走近广播<span className="action-end"><ArrowRight size={16}/></span></button>:!heard?<button className="primary-action" onClick={()=>void playRhyme()}><Play size={16} fill="currentColor"/>打开广播开关<span className="action-end"><ArrowRight size={16}/></span></button>:!known.includes('stool')?<button className="primary-action" onClick={inspectStool}><Search size={17}/>检查餐桌下面<span className="action-end"><ArrowDown size={16}/></span></button>:null}
    {!playing&&!thinking&&known.includes('stool')&&!allFound&&<button className="quiet-action" onClick={()=>void answer('询问许知音的磁带')}>询问许知音的磁带<ChevronRight size={13}/></button>}
   </div>
  </section>
  {entered&&!council&&<HostConversation busy={playing||thinking||entering} suspended={panel!==null} context={view} known={known} muted={muted} onLiveLine={liveLine} onNiaAction={niaAction} onAsk={text=>void answer(text)} onInterrupt={stop} onVoiceActiveChange={active=>audio.current?.setMicrophoneActive(active)}/>}
  {council&&<Deliberation initialDraft={progress.councilDraft} onDraftChange={saveCouncilDraft} muted={muted} suspended={panel!==null} onLeave={()=>{setCouncil(false);setView('room');setMessage({who:'当前目标',text:'你回到搜证阶段。公开线索已经保留，可以随时重新召集大家。'});}} onEvidence={id=>{setSelected(id);setPanel('evidence');}} onSpeaker={(seat,id)=>{setSpeakerSeat(seat);setFocusEvidence(id);}} onComplete={finishCouncil}/>}
  <footer className="bottom-bar"><div className="session-state"><span className="session-line"/><span>单人演示</span><span className="footer-dot">·</span><span>你的角色：林见秋</span></div><div className="stage-progress" aria-label={`已找到${known.length}条线索，共3条`}>{evidence.map(e=><i key={e.id} className={known.includes(e.id)?'complete':''}/>)}<span>{String(known.length).padStart(2,'0')} / 03</span></div><nav aria-label="辅助工具"><button onClick={()=>{setSelected(null);setPanel('evidence');}}><FileText size={16}/><span>线索</span><small>{known.length}</small></button><button onClick={()=>setPanel('script')}><BookOpen size={16}/><span>我的剧本</span></button><button onClick={()=>setPanel('more')} aria-label="更多选项"><MoreHorizontal size={21}/></button></nav></footer>
  {(toast||saveError)&&<div className="toast" role="status"><Check size={14}/>{saveError||toast}</div>}
  {panel==='evidence'&&<Panel title={activeEvidence?.title||'已发现的线索'} kicker="EVIDENCE ARCHIVE" onClose={()=>{stop();setPanel(null);setSelected(null);}}>{activeEvidence?<><button className="text-link" onClick={()=>{stop();setSelected(null);}}><ArrowLeft size={14}/>返回证据本</button><span className="evidence-kind">{activeEvidence.kind}</span><p className="reading-text">{activeEvidence.text}</p>{activeEvidence.id==='song'&&<><button className="panel-primary" aria-pressed={evidenceReplay} onClick={()=>void replayEvidence()}>{evidenceReplay?<Pause size={15}/>:<Play size={15}/>} {evidenceReplay?'停止重听':'重听广播录音'}</button>{evidenceReplay&&<p className="small-print" role="status">{preparing?'正在准备录音…':'广播录音播放中'}</p>}{audioError&&<p className="inline-error" role="alert">{audioError}</p>}</>}<div className="note-box"><span>推理边界</span><p>{activeEvidence.note}</p></div></>:<><p className="panel-lead">只记录已经在本次调查中公开的事实。</p>{known.length===0?<div className="empty-state"><Radio size={32} strokeWidth={1}/><p>广播还没有响起。</p><span>先回到场景，听听它想说什么。</span></div>:evidence.filter(e=>known.includes(e.id)).map(e=><button className="evidence-row" key={e.id} onClick={()=>setSelected(e.id)}><span>{e.number}</span><div><small>{e.kind}</small><h3 data-type-surface={'evidence-title-'+e.id}>{e.title}</h3></div><ChevronRight size={17}/></button>)}<div className="locked-count">{3-known.length>0?`还有 ${3-known.length} 条线索等待发现`:'第一幕的三条线索已经收齐'}</div></>}</Panel>}
  {panel==='script'&&<Panel title="林见秋" kicker="PRIVATE SCRIPT · ACT I" onClose={()=>setPanel(null)}><div className="role-description">31岁 · 刑警<span>你的角色</span></div><p className="reading-text">二十年前，你从白榆儿童之家的火里获救。如今，你始终记不起火灾前最后半小时。今晚，一封没有署名的信，把你带回这里。</p><div className="paper-letter"><span>邀请函背面</span><p data-type-surface="private-letter-quote">你听见了。</p></div><h3 className="reading-heading">只有你知道</h3><p className="reading-text">你还记得一把红绳钥匙的触感，却不记得自己为什么拿着它。你从未把这件事告诉任何人。</p><div className="note-box"><span>第一幕任务</span><p>听完童谣，寻找能与记忆对应的线索。你可以隐瞒自己的秘密，但不要把猜测当作亲眼所见。</p></div><p className="small-print">本地演示固定使用林见秋视角；没有建立多人房间或真实的私人权限服务。</p></Panel>}
  {panel==='about'&&<Panel title="欢迎回到白榆" kicker="LOCAL DEMO · FIRST ACT" onClose={()=>setPanel(null)}><p className="reading-text">这是一段围绕声音与物证展开的第一幕试玩。推门后收听广播，调查桌下物证、询问磁带，再召集大家集中推理。</p><div className="instructions"><p><span>01</span>开场先听童谣，推门后可在广播里重听。</p><p><span>02</span>直接点击麦克风说话，或在常驻输入框里提问。</p><p><span>03</span>公开三条线索后，回到餐桌前陈述、质询与记录判断。</p></div><div className="note-box"><span>演示范围</span><p>单人本地交互。固定旁白和演示角色使用 NIA 的7套音色，台词为第一幕预设脚本，音频已生成并保存在本机。旁白与主持人共用「{hostVoice.name}」音色。童谣和背景音乐使用你提供的原文件。多玩家联机尚未接入。配置 NIA 后，主持人的语音与文字提问会连接 SenseNova 实时模型；开始通话时麦克风音频通过声网发送至 NIA，结束后释放麦克风。未配置时使用本机中文识别与预设回应。固定台词播放不重新调用云端生成。</p></div><p className="small-print">故事与场景均为原创。视觉借鉴物件聚焦的密室解谜形式。进度保存在当前浏览器。</p></Panel>}
  {panel==='more'&&<Panel title="暂停片刻" kicker="PAUSE & OPTIONS" onClose={()=>setPanel(null)}><button className="option-row" onClick={()=>{setMusicEnabled(v=>{void audio.current?.setBackground(!v).catch(()=>{setMusicEnabled(false);notify('背景音乐暂时无法播放');});return !v;});}}><span><Volume2 size={17}/>背景音乐</span><span className={`toggle ${musicEnabled?'on':''}`} role="img" aria-label={musicEnabled?'已开启':'已关闭'}><i/></span></button><button className="option-row" disabled={!allFound} onClick={()=>beginCouncil()}><span><AudioLines size={17}/>{allFound?progress.completed?'重新集中推理':progress.councilDraft?'继续集中推理':'召集大家集中推理':'集中推理 · 待三条线索公开'}</span><ChevronRight size={17}/></button>{progress.deliberation&&<button className="option-row" onClick={()=>setPanel('finish')}><span><FileText size={17}/>查看上次集中推理记录</span><ChevronRight size={17}/></button>}<button className="option-row" onClick={()=>setPanel('history')}><span><AudioLines size={17}/>对话记录</span><ChevronRight size={17}/></button><button className="option-row" onClick={download}><span><ArrowDown size={17}/>导出调查记录</span><ChevronRight size={17}/></button><button className="option-row" onClick={()=>setPanel('about')}><span><Info size={17}/>试玩说明与语音状态</span><ChevronRight size={17}/></button><button className="option-row reset-row" onClick={reset}><span><RotateCcw size={17}/>重新体验第一幕</span><ChevronRight size={17}/></button></Panel>}
  {panel==='history'&&<Panel title="声音留下的记录" kicker="CONVERSATION LOG" onClose={()=>setPanel(null)}><div className="history-list">{history.map((m,i)=><article key={i}><span>{m.who}</span><p>{m.text}</p></article>)}</div></Panel>}
  {panel==='finish'&&<Panel title={progress.completed?'第一幕 · 已完成':'在熄灯之前'} kicker="ACT I · INVESTIGATION REVIEW" onClose={()=>setPanel(null)}><p className="reading-text">{progress.deliberation?narration['n17-act-one-end'].text:'你们听到了童谣，发现小木凳上的手印，也获得了许知音提供的待比对磁带。它们之间，似乎仍缺少一段联系。'}</p>{playing&&finishNarration.current.active&&<div className="finish-voice-status" role="status"><span>{preparing?'正在准备旁白…':'本幕旁白播放中'}</span><button className="text-link" onClick={stop}>停止播放</button></div>}{evidence.map(e=><div className="review-row" key={e.id}><Check size={16}/><span>{e.title}</span></div>)}<div className="note-box"><span>留给你的问题</span><p>谁重新播放了童谣？那只小木凳，最近被谁碰过？目前还没有足够的证据回答。</p></div>{progress.deliberation&&<div className="note-box council-record"><span>集中推理 · 你的暂定判断</span><p>{progress.deliberation.summary}</p><p>已记录6份陈述、{progress.deliberation.questions.length}次质询。其余5人的发言为演示内容，未汇总真实多人投票。</p></div>}<p className="small-print">本次Demo到此结束，后续幕未开放。</p><button className="panel-primary" disabled={!progress.deliberation} onClick={()=>{setProgress(p=>({...p,completed:true}));setPanel(null);notify('第一幕体验完成，调查记录已保留');}}>保留记录，回到场景<Check size={16}/></button></Panel>}
 </main>;
}
