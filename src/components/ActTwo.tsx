import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,ChevronRight,Clock,Download,FileText,HelpCircle,Mic,Pause,Play,Radio,RotateCcw,Search,Volume2,VolumeX} from 'lucide-react';
import {Panel} from './ui/Panel';
import {ActTwoTimeline} from './ActTwoTimeline';
import {ActTwoDeduction} from './ActTwoDeduction';
import {actTwoDeduction} from '@/lib/act-two-deduction';
import {HostConversation} from './HostConversation';
import {SpeechDraftInput} from './SpeechDraftInput';
import {ActTwoScene,type ActTwoTarget} from './ActTwoScene';
import voiceScripts from '../../config/voices.json';
import {SceneAudio} from '@/lib/audio';
import type {NiaAction} from '@/lib/nia-session';
import {actTwoOpening,actTwoEnding,actTwoBoundary,actTwoClues,actTwoMembers,actTwoRecording,actTwoFocus,initialActTwo,parseActTwo,actTwoCanReview,actTwoPublicKeys,actTwoReply,type ActTwoSave,type ActTwoClueId,type ActTwoLine} from '@/lib/act-two';
const scope=new URLSearchParams(location.search).get('qa');
const SAVE='echo-act-two-v1'+(scope?'-qa-'+scope:'');
function restore(){try{return parseActTwo(localStorage.getItem(SAVE));}catch{return initialActTwo();}}
const phases=[['arrival','停电'],['investigation','现场'],['statements','陈述'],['recording','录音'],['discussion','核对'],['ending','门缝'],['complete','记录']];
export function ActTwo({onBack}:{onBack:()=>void}){
 const [save,setSave]=useState<ActTwoSave>(restore),[panel,setPanel]=useState<'evidence'|'script'|'timeline'|'history'|'review'|'help'|'reset'|'conversation'|'deduction'|'scene'|'recordingText'|null>(null);
 const [selected,setSelected]=useState<ActTwoClueId|null>(null),[focus,setFocus]=useState<ActTwoTarget|null>(null),[conversationTimeline,setConversationTimeline]=useState(false);
 const [current,setCurrent]=useState<ActTwoLine>(()=>save.history.at(-1)||{who:'第二幕 · 主持人',text:'20:10之后，众人曾分开活动。21:05，六人已经回到大厅。两分钟后，灯灭了。'});
 const [playing,setPlaying]=useState(false),[muted,setMuted]=useState(false),[error,setError]=useState(''),[saveError,setSaveError]=useState(''),[captionOpen,setCaptionOpen]=useState(false);
 const [dictating,setDictating]=useState(false),[speechTools,setSpeechTools]=useState<HTMLDivElement|null>(null);
 const [wideLayout,setWideLayout]=useState(()=>window.matchMedia('(min-width:701px)').matches);
 useEffect(()=>{const media=window.matchMedia('(min-width:701px)'),sync=()=>setWideLayout(media.matches);media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);},[]);
 const dictatingRef=useRef(false);
 const taskBody=useRef<HTMLDivElement>(null);
 const audio=useRef<SceneAudio|null>(null),operation=useRef(0),state=useRef(save),busy=useRef(false),alive=useRef(true);state.current=save;
 const voiceInputActive=useCallback((active:boolean)=>{dictatingRef.current=active;setDictating(active);audio.current?.setMicrophoneActive(active);},[]);
 useEffect(()=>{alive.current=true;audio.current=new SceneAudio();return()=>{alive.current=false;operation.current++;void audio.current?.destroy();};},[]);
 useLayoutEffect(()=>{try{localStorage.setItem(SAVE,JSON.stringify(save));setSaveError('');}catch{setSaveError('浏览器无法保存进度，请先导出记录。');}},[save]);
 useEffect(()=>{if(panel)stop();if(panel!=='conversation')setConversationTimeline(false);},[panel]);
 useEffect(()=>{if(!busy.current&&save.phase!=='investigation')setCaptionOpen(false);},[save.phase]);
 useLayoutEffect(()=>{if(taskBody.current){taskBody.current.scrollTop=0;if(save.phase==='statements'&&save.activeStatement&&innerWidth<=700)taskBody.current.scrollIntoView({block:'start'});}},[save.phase,save.activeStatement]);
 const tell=(who:string,text:string)=>{setCaptionOpen(true);setCurrent({who,text});setSave(s=>({...s,history:[...s.history,{who,text}]}));};
 function stop(){operation.current++;busy.current=false;audio.current?.stop(true);setPlaying(false);}
 async function sequence(lines:{who:string;text:string;clip?:string}[],onComplete?:()=>void){
  stop();const token=operation.current;busy.current=true;setPlaying(true);setError('');
  for(const line of lines){
   if(token!==operation.current||!alive.current)return;
   tell(line.who,line.text);
   if(line.clip)try{await audio.current?.play(line.clip);}catch(e){if(token===operation.current){setError(e instanceof Error?e.message:'语音暂不可用，请阅读文字后继续。');busy.current=false;setPlaying(false);}return;}
  }
  if(token!==operation.current||!alive.current)return;busy.current=false;setPlaying(false);onComplete?.();
 }
 const add=(id:ActTwoClueId)=>setSave(s=>s.known.includes(id)?s:{...s,known:[...s.known,id]});
 function start(){
  void sequence([{who:'旁白',text:'九点零七分，灯灭了。二楼传来沉重的撞击。你们跟着手机的光上楼，值班室的门紧闭。顾怀山没有回应。',clip:'a2-opening-1'},{who:'旁白',text:'程野撞开门。顾怀山倒在广播台旁，耳机挂在颈侧，茶杯碎了，手下压着一本旧名册。林见秋检查后请人呼叫急救和警方。',clip:'a2-opening-2'}],()=>setSave(s=>({...s,phase:'investigation'})));
 }
 function inspect(target:ActTwoTarget){
  if(target==='door'){if(state.current.known.includes('B06')){setFocus('door');setSave(s=>({...s,scene:'corridor'}));setSelected('B06');setPanel('evidence');return;}setPanel('scene');setSave(s=>({...s,scene:'corridor'}));setFocus('door');tell('现场观察',state.current.known.includes('B06')?'七号房门轴有新油痕。维护者和具体时间仍不确定。':'七号房的门还未进入。先完成值班室调查，听听大家的活动陈述。');return;}
  if(target==='radio'){
   setSave(s=>({...s,scene:'duty'}));setFocus('radio');
   setPanel('scene');return;
  }
  if(target==='blackout'){setSelected('B01');setPanel('evidence');return;}
  setSave(s=>({...s,scene:'duty'}));setFocus('register');setSelected('B02');setPanel('evidence');
 }
 function record(id:ActTwoClueId){
  if(!['B01','B02','B03'].includes(id))return;
  add(id);setPanel(null);const clue=actTwoClues.find(c=>c.id===id)!;
  void sequence([{who:id==='B03'?'林见秋 · 自愿公开':'旁白',text:clue.text,clip:id==='B01'?'a2-blackout':id==='B02'?'a2-register':'a2-wet-shoes'}]);
 }
 function beginStatements(){stop();setSave(s=>({...s,phase:'statements'}));void sequence([{who:'主持人',text:'先从林见秋开始，说说20:10以后你去了哪里。其余角色按原稿作演示陈述。正文会留在这里，按下一位再继续。',clip:'a2-statements'}]);}
 function submitLin(){
  const s=state.current;if(dictatingRef.current||!s.draft.trim())return;stop();
  const text=s.draft.trim();setSave(p=>({...p,statements:[...p.statements.filter(v=>v.id!=='lin'),{id:'lin',text,simulated:false}],known:p.publishWetShoes&&!p.known.includes('B03')?[...p.known,'B03']:p.known}));
  tell('你 · 林见秋',text+(s.publishWetShoes?'\n我另外公开B03：'+actTwoClues[2].text+' '+actTwoClues[2].limit:''));
 }
 function hearMember(id:string,play=true){
  const m=actTwoMembers.find(m=>m.id===id);if(!m||m.id==='lin')return;stop();
  setSave(s=>({...s,activeStatement:id,statements:s.statements.some(v=>v.id===id)?s.statements:[...s.statements,{id,text:m.text,simulated:true}],known:m.clue&&!s.known.includes(m.clue)?[...s.known,m.clue]:s.known}));
  if(play)void sequence([{who:m.name+' · 演示陈述',text:m.text,clip:'a2-statement-'+m.id}]);else tell(m.name+' · 陈述正文',m.text);
 }
 function playRecording(){
  setFocus('radio');setSave(s=>({...s,scene:'duty'}));
  void sequence(actTwoRecording.map(l=>({who:l.who+' · 原稿文本演绎',text:l.text,clip:l.clip})),()=>setSave(s=>({...s,recordingHeard:true,phase:['recording','statements'].includes(s.phase)?'discussion':s.phase})));
 }
 function recordTranscript(){stop();tell('录音文本 · 已阅读',actTwoRecording.map(l=>l.who+'：'+l.text).join('\n'));setSave(s=>({...s,recordingHeard:true,phase:'discussion'}));}
 function submitDeduction(){const s=state.current;if(dictatingRef.current||!actTwoCanReview(s)||!s.focus||!s.question.trim())return;setSave(p=>({...p,deduction:{focus:s.focus,question:s.question.trim()}}));setPanel('deduction');}
 function finishDiscussion(){
  const s=state.current;if(!actTwoCanReview(s)||!s.deduction||s.deduction.focus!==s.focus||s.deduction.question!==s.question.trim())return;
  stop();setSave(s=>({...s,phase:'ending',scene:'corridor'}));setFocus('door');
  void sequence([{who:'梁素琴',text:'山路有一处塌方，警方正在绕行。先到餐厅等。',clip:'a2-liang'},{who:'旁白',text:'走廊尽头，七号房的门不知何时开了一条缝。没有人看见是谁打开的。你已经整理出一条查证方向。本次试玩到这里，先保存调查记录。',clip:'a2-door'}]);
 }
 function openTimeline(){if(panel==='conversation')setConversationTimeline(true);else setPanel('timeline');}
 function action(name:NiaAction):Record<string,unknown>{
  if(name==='inspect_duty_room'){setSave(s=>({...s,scene:'duty'}));setFocus('register');return {content:'视角已移至值班室名册；尚未自动记录B02，请玩家点击查看并记录。'};}
  if(name==='inspect_seventh_door'){setSave(s=>({...s,scene:'corridor'}));setFocus('door');return {content:['ending','complete'].includes(state.current.phase)?'视角移至门缝，没有看见开门者，尚未进入房内。':'视角移至七号房外，尚未开门或进入房间；不能推进阶段。'};}
  if(name==='review_act_two_timeline'){openTimeline();return {content:'已展开当前公开陈述时间线；未陈述角色的行程不公开，个人记忆不是完整不在场证明。'};}
  return {content:'这个操作不属于第二幕。请查看名册、七号房外走廊或已公开时间线。'};
 }
 function ask(text:string){
  stop();tell('你 · 林见秋',text);const reply=actTwoReply(text,state.current);
  if(reply.action==='timeline')openTimeline();else if(reply.action==='register'){setFocus('register');setSave(s=>({...s,scene:'duty'}));}else if(reply.action==='door'){setFocus('door');setSave(s=>({...s,scene:'corridor'}));}
  const scripted=reply.clip?(voiceScripts.clips as Record<string,{text:string}>)[reply.clip]:null;
  void sequence([{who:'主持人 · 本地预设',text:scripted?.text??reply.text,clip:reply.clip}]);
 }
 function download(){const blob=new Blob([JSON.stringify({title:'第七个孩子 · 第二幕',gameVersion:'0.2.8',scope:'单人演示；其他角色为原稿预设陈述；当前不可结案',...save,deductionFeedback:save.deduction||['ending','complete'].includes(save.phase)?actTwoDeduction(save):null,publicEvidence:actTwoClues.filter(c=>save.known.includes(c.id))},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='第七个孩子-第二幕调查记录.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const next=actTwoMembers.find(m=>!save.statements.some(v=>v.id===m.id));
 const activeMember=actTwoMembers.find(m=>m.id===save.activeStatement);
 const lastQuestion=save.history.filter(m=>m.who==='你 · 林见秋').at(-1);
 const both=save.known.includes('B01')&&save.known.includes('B02');
 const doorOpen=['ending','complete'].includes(save.phase),selectedClue=actTwoClues.find(c=>c.id===selected);
 const currentPhase=phases.findIndex(([p])=>p===save.phase);
 const pendingClue=!save.known.includes('B02')?'B02':!save.known.includes('B01')?'B01':null;
 const guidance=save.phase==='arrival'?'先了解停电后发生了什么。':save.phase==='investigation'?(pendingClue==='B02'?'先查看桌上的旧名册，再把观察记入证据本。':pendingClue==='B01'?'名册已记录。接下来核对停电和撞击的时间。':'两条现场记录已齐，接下来听大家怎么说。'):save.phase==='statements'?(next?.id==='lin'?'说出或写下自己的活动；确认后再提交。':next?'正文留在当前页；点击下一位才会切换角色。':'六人的陈述已齐，下一步是旧广播。'):save.phase==='recording'?'听完四句对白，或展开文本阅读后继续。':save.phase==='discussion'?'选一个查证方向，再说出或写下想追问的问题。':save.phase==='complete'?'本幕已完成，调查记录可以查看和导出。':'本次试玩到七号房门外，先保存已完成的查证方向。';
 const primary=save.phase==='statements'?{label:next?.id==='lin'?'提交我的陈述':activeMember?(next?'下一位 · '+next.name:'陈述已齐，查看广播'):next?'阅读'+next.name+'陈述':'陈述已齐，查看广播',run:()=>{if(next?.id==='lin')submitLin();else if(next)hearMember(next.id,false);else{stop();setSave(s=>({...s,phase:'recording',activeStatement:''}));}},disabled:next?.id==='lin'&&!save.draft.trim()}:playing?{label:'停止语音，阅读文字',run:()=>{stop();if(taskBody.current)taskBody.current.scrollTop=0;},disabled:false}:save.phase==='arrival'?{label:'听停电后的经过',run:start,disabled:false}:save.phase==='investigation'?{label:pendingClue==='B02'?'查看旧名册':pendingClue==='B01'?'查看停电记录':'听取六人的活动',run:()=>pendingClue?inspect(pendingClue==='B02'?'register':'blackout'):beginStatements(),disabled:false}:save.phase==='recording'?{label:'收听这段录音',run:playRecording,disabled:false}:save.phase==='discussion'?{label:save.deduction?'查看推理回应':'提交疑问，查看回应',run:submitDeduction,disabled:!save.focus||!save.question.trim()||!actTwoCanReview(save)}:{label:save.phase==='complete'?'查看第二幕记录':'完成本幕，保留记录',run:()=>{stop();setSave(s=>({...s,phase:'complete'}));setPanel('review');},disabled:false};
 return <main className={`game act-two-game phase-${save.phase}`}>
  <ActTwoScene scene={save.scene} focus={focus} doorOpen={doorOpen} enabled={save.phase!=='arrival'} onInteract={target=>{if(save.phase!=='arrival')inspect(target);}}/>
  <div className="a2-shade" aria-hidden="true"/><div className="scene-grain a2-grain" aria-hidden="true"/>
  <header className="topbar a2-topbar"><button className="game-brand" onClick={()=>{stop();onBack();}} aria-label="返回第一幕"><span className="brand-symbol"><Radio size={19}/></span><span><span className="brand-name">第七个孩子</span><span className="brand-sub">THE SEVENTH CHILD</span></span></button><div className="location">白榆儿童之家<span>/</span>{save.scene==='duty'?'二楼 · 值班室':'二楼 · 七号房外'}</div><div className="top-tools"><span className="demo-label"><i/>单人试玩</span><button className="icon-button" aria-label={muted?'打开声音':'静音'} onClick={()=>setMuted(v=>{audio.current?.setMuted(!v);return !v;})}>{muted?<VolumeX size={19}/>:<Volume2 size={19}/>}</button><button className="icon-button" aria-label="第二幕试玩说明" onClick={()=>setPanel('help')}><HelpCircle size={19}/></button></div></header>
  <div className="a2-main">
   <section className="a2-stage" aria-label="第二幕场景">
    <div className="a2-chapter"><div className="chapter-number">第二幕<span>02 / 02 · 试玩</span></div><h1>七号房没有人</h1><p>21:07 · 停电之后</p><p className="a2-scope">试玩包含第一、二幕，止于七号房门外；第三幕尚未开放。</p></div>
    <div className="a2-scene-space">
     <div className="a2-scene-label"><span>{save.scene==='duty'?'值 班 室':'第 七 号 房'}</span><small>{save.scene==='duty'?'顾怀山倒下的地方':'尚未进入房内'}</small></div>
     {save.phase!=='arrival'&&<details className="a2-explore"><summary><Search size={13}/>自由查看场景</summary><div><button aria-pressed={save.scene==='duty'} onClick={()=>{stop();setSave(s=>({...s,scene:'duty'}));setFocus(null);}}>值班室</button><button aria-pressed={save.scene==='corridor'} onClick={()=>{stop();setSave(s=>({...s,scene:'corridor'}));setFocus('door');}}>七号房外</button></div></details>}
    </div>
    <p className="a2-scene-note">{save.phase==='arrival'?'灯灭了。楼上传来一声沉重的撞击。':save.scene==='duty'?'手机的光照向桌面。先记下你能确认的事实。':'走廊尽头，第七扇门。门内的事还未公开。'}</p>
   </section>
   <section className="a2-flow" aria-label="第二幕当前任务">
    <div className="a2-flow-top"><span>当前目标</span><button onClick={()=>setPanel('help')} aria-label="查看本幕流程">{Math.min(currentPhase+1,6)} / 6 · {phases[currentPhase]?.[1]}<ChevronRight size={12}/></button></div>
    <div className="a2-progress" aria-label={`本幕进度：${Math.min(currentPhase+1,6)} / 6`}>{phases.slice(0,6).map(([p],i)=><i key={p} className={i<=currentPhase?'reached':''}/>)}</div>
    <p className="a2-guidance"><span>接下来</span>{guidance}</p>
    <div className="a2-task-body" ref={taskBody}>
    {save.phase==='arrival'&&<><span className="a2-eyebrow">21:05 · 全员回到大厅</span><h2>两分钟后，灯灭了。</h2><p>六个人曾在20:10后分开活动。此刻，楼上传来一声沉重的撞击。</p><p className="a2-muted">继续扮演林见秋，从这一声撞击开始。</p>{playing&&<button className="text-link" onClick={()=>{stop();tell('旁白 · 阅读模式',actTwoOpening);setSave(s=>({...s,phase:'investigation'}));}}>停止语音，阅读后继续</button>}{!playing&&<button className="text-link" onClick={()=>{tell('旁白 · 阅读模式',actTwoOpening);setSave(s=>({...s,phase:'investigation'}));}}>直接阅读现场经过</button>}</>}
    {save.phase==='investigation'&&<><span className="a2-eyebrow">现场记录 · {save.known.filter(id=>id==='B01'||id==='B02').length} / 2</span><h2>{pendingClue==='B02'?'先看看这本旧名册。':pendingClue==='B01'?'再核对停电的经过。':'现场已经记下。'}</h2><p>{pendingClue==='B02'?'茶水浸湿的纸页上，有一行关于人数的记录。':pendingClue==='B01'?'灯灭与撞击发生在同一时刻。先分清听见的和推测的。':'接下来，从林见秋开始，听取六人20:10以后的活动。'}</p><p className="a2-muted">{both?'已收进证据本，可随时从底栏回看。':'查看后点击「记录这条线索」，就能继续。'}</p></>}
    {save.phase==='statements'&&<><span className="a2-eyebrow">活动陈述 · {save.statements.length} / 6</span><h2>{activeMember?activeMember.name+'的陈述':next?next.name+'，轮到你了。':'六份陈述，已经记下。'}</h2>{activeMember?<section className="a2-statement-reading" aria-label={activeMember.name+'的陈述正文'}><p>{activeMember.text}</p><div className="a2-statement-controls">{playing?<button className="text-link" onClick={()=>{stop();if(taskBody.current)taskBody.current.scrollTop=0;}}><Pause size={13}/>停止播放</button>:<button className="text-link" onClick={()=>hearMember(activeMember.id)}><Play size={13}/>播放这段陈述</button>}<button className="text-link" onClick={()=>setPanel('timeline')}><Clock size={13}/>放入时间线比对</button></div><details className="a2-reading"><summary>需要一点比对提示？</summary><p>先找这个人在哪一段时间离开大厅，再对照别人的同一时刻。陈述原文和证据本会保留，随时可以回看。</p></details></section>:next?.id==='lin'?<><div className="a2-field"><label htmlFor="a2-statement">你的活动陈述</label><SpeechDraftInput controlsTarget={wideLayout?speechTools:null} key="a2-statement" id="a2-statement" label="林见秋的活动陈述" value={save.draft} maxLength={1200} onChange={text=>setSave(s=>({...s,draft:text}))} placeholder="记录自己的位置、时间与能确认的观察…" suspended={panel!==null} context={'statement-'+save.scene} onStart={()=>{stop();setCaptionOpen(false);}} onActiveChange={voiceInputActive}/></div><button className="text-link" disabled={dictating} onClick={()=>setSave(s=>({...s,draft:actTwoMembers[0].text}))}>从我的角色本填入活动</button><label className="a2-check"><input type="checkbox" checked={save.publishWetShoes} onChange={e=>setSave(s=>({...s,publishWetShoes:e.target.checked}))}/>同时公开B03 · 顾怀山的湿鞋</label></>:next?<><p>{next.job} · 演示角色</p><p>点击下方按钮，展开这位角色的完整陈述。</p><button className="text-link" onClick={()=>hearMember(next.id)}>听取{next.name}陈述</button></>:<p>可打开时间线，在同一列比较各人的活动。</p>}</>}
    {save.phase==='recording'&&<><span className="a2-eyebrow">广播录音 · 原稿文本演绎</span><h2>“不能数七。”</h2><p>两个孩子的声音，从广播里传来。</p><button className="text-link" onClick={()=>setPanel('recordingText')}>阅读完整录音文本</button></>}
    {save.phase==='discussion'&&<><span className="a2-eyebrow">核对与追问</span><h2>七个人，写在哪一页？</h2><div className="a2-focus-options">{actTwoFocus.map(f=><button key={f.id} aria-pressed={save.focus===f.id} onClick={()=>setSave(s=>({...s,focus:f.id,deduction:null}))}><span>{save.focus===f.id?'●':'○'}</span><strong>{f.title}</strong></button>)}</div><div className="a2-field"><label htmlFor="a2-question">你还想问什么？</label><SpeechDraftInput controlsTarget={wideLayout?speechTools:null} key="a2-question" id="a2-question" label="第二幕待追问的问题" maxLength={1200} value={save.question} onChange={text=>setSave(s=>({...s,question:text,deduction:null}))} placeholder="例如：名册上的这行字，是谁在什么时候写下的？" suspended={panel!==null} context={'question-'+save.scene+'-'+save.focus} onStart={()=>{stop();setCaptionOpen(false);}} onActiveChange={voiceInputActive}/></div><details className="a2-reading"><summary>需要核对资料？</summary><div className="a2-inline-actions"><button className="text-link" onClick={()=>setPanel('timeline')}>活动时间线</button><button className="text-link" disabled={dictating} onClick={playRecording}>重听录音</button></div></details></>}
    {doorOpen&&<><span className="a2-eyebrow">第二幕收束 · 七号房外</span><h2>门，开了一条缝。</h2><p>梁素琴说警方正在绕行。走廊尽头，七号房的门不知何时开了。</p><p className="a2-muted">本次试玩到此结束，第三幕尚未开放。你已整理现场、六人陈述、旧录音，并提出自己的查证方向。</p><blockquote>{save.question}</blockquote><button className="text-link" onClick={()=>void sequence([{who:'梁素琴',text:'山路有一处塌方，警方正在绕行。先到餐厅等。',clip:'a2-liang'},{who:'旁白',text:actTwoEnding,clip:'a2-door'}])}>重听本幕结尾</button></>}
    {save.history.length>0&&!(save.phase==='statements'&&activeMember)&&<details className="a2-caption" open={captionOpen} onToggle={e=>setCaptionOpen(e.currentTarget.open)}><summary><span className={playing?'a2-pulse':''}/>{playing?'正在播放':'最新记录'} · {current.who}<ChevronRight size={12}/></summary><p aria-live="polite">{current.text}</p><button className="text-link" onClick={()=>setPanel('history')}>全部对话记录</button></details>}
    {error&&<p className="inline-error" role="alert">{error}</p>}
    </div>
    <div className="a2-task-action"><div className="a2-dictation-slot" ref={setSpeechTools}/><button className="primary-action" aria-label={playing&&save.phase!=='statements'?'停止第二幕语音':undefined} onClick={primary.run} disabled={dictating||primary.disabled}>{playing&&save.phase!=='statements'?<Pause size={16}/>:<ArrowRight size={16}/>}<span>{primary.label}</span></button></div>
   </section>
  </div>
  <footer className="a2-footer"><span>林见秋<small>{saveError?'进度未保存':'进度已自动保存'}</small></span><nav aria-label="第二幕辅助工具"><button onClick={()=>{setSelected(null);setPanel('evidence');}}><FileText size={15}/>证据本 <small>{save.known.length}</small></button><button onClick={()=>setPanel('timeline')}><Clock size={15}/>时间线</button><button onClick={()=>setPanel('script')}><BookOpen size={15}/>我的剧本</button>{save.phase!=='arrival'&&<button className="a2-host-launch" onClick={()=>setPanel('conversation')}><Mic size={15}/>问主持人</button>}</nav></footer>
  {panel==='recordingText'&&<Panel title="广播录音 · 完整文本" kicker="ACT II · RECORDING TEXT" onClose={()=>setPanel(null)}><div className="a2-transcript">{actTwoRecording.map(l=><p key={l.clip}><small>{l.who}</small>{l.text}</p>)}</div><button className="panel-primary" onClick={()=>{setPanel(null);recordTranscript();}}>已阅读完整文本，继续核对<ArrowRight size={15}/></button></Panel>}
  {panel==='deduction'&&<Panel title="你的疑问，有了哪些依据？" kicker="ACT II · DEDUCTION" onClose={()=>setPanel(null)}><ActTwoDeduction save={save} onCompare={()=>setPanel('timeline')}/><button className="panel-primary" onClick={()=>{setPanel(null);finishDiscussion();}}>保留这个方向，走到走廊<ArrowRight size={15}/></button><button className="text-link" onClick={()=>setPanel(null)}>返回，修改我的疑问</button></Panel>}
  {panel==='scene'&&<Panel title={focus==='radio'?'广播台近景':'七号房门轴近景'} kicker="ACT II · SCENE OBSERVATION" onClose={()=>setPanel(null)}>{focus==='radio'?<><p className="reading-text">顾怀山倒在广播台旁，耳机挂在颈侧。桌上有碎茶杯，旧名册压在他手下。</p><button className="text-link" onClick={()=>inspect('register')}>查看桌上的旧名册</button>{actTwoMembers.every(m=>save.statements.some(v=>v.id===m.id))?<button className="panel-primary" onClick={()=>{setPanel(null);playRecording();}}>播放广播录音</button>:<p className="small-print">先听取六人的活动陈述，再核对广播内容。</p>}</>:<><p className="reading-text">你走到七号房外，查看门轴和门框。门内还未进入。</p><p className="small-print">门轴的维护记录可以与程野的陈述相互核对。</p></>}</Panel>}
  {panel==='conversation'&&<Panel title="问问主持人" kicker="ACT II · HOST" onClose={()=>{stop();setPanel(null);}}><div className="a2-host-reading"><p className="panel-lead">点击麦克风直接说话，会自动转成文字；也可以输入问题。</p>{lastQuestion&&<div className="a2-user-transcript" aria-live="polite"><span>你的原话</span><p>{lastQuestion.text}</p></div>}<div className="a2-host-caption" aria-live="polite"><span>{current.who}</span><p>{current.text}</p></div>{conversationTimeline&&<section className="a2-host-timeline" aria-label="对话中的公开时间线"><header><h3>20:10以后，他们去了哪里</h3><button className="text-link" onClick={()=>setConversationTimeline(false)}>收起时间线</button></header><div tabIndex={0} aria-label="滚动查看已公开活动"><ActTwoTimeline save={save}/></div></section>}</div><div className="a2-conversation"><HostConversation act={2} busy={playing} suspended={false} context={'act-two-'+save.scene} known={actTwoPublicKeys(save)} history={save.history} muted={muted} onLiveLine={(who,text,complete)=>{setCurrent({who,text});if(complete)setSave(s=>({...s,history:[...s.history,{who,text}]}));}} onNiaAction={action} onAsk={ask} onInterrupt={stop} onVoiceActiveChange={active=>audio.current?.setMicrophoneActive(active)}/></div><p className="small-print">关闭面板即结束语音。其他角色由剧本预设演示。</p></Panel>}
  {saveError&&<div className="toast" role="status">{saveError}</div>}
  {panel==='evidence'&&<Panel title={selectedClue?.title||'第二幕 · 已公开线索'} kicker="ACT II · EVIDENCE ARCHIVE" onClose={()=>{setPanel(null);setSelected(null);}}>{selectedClue?<><button className="text-link" onClick={()=>setSelected(null)}><ArrowLeft size={13}/>返回证据本</button><span className="evidence-kind">{selectedClue.id} · {selectedClue.owner}</span>{selectedClue.id==='B03'&&!save.known.includes('B03')&&<p className="small-print">当前仅你可见，尚未公开给主持人。</p>}<p className="reading-text">{selectedClue.text}</p><details className="a2-paper-hint"><summary>需要推理提示？</summary><p>{selectedClue.limit}</p></details>{!save.known.includes(selectedClue.id)&&['B01','B02','B03'].includes(selectedClue.id)&&<button className="panel-primary" onClick={()=>record(selectedClue.id)}>{selectedClue.id==='B03'?'自愿公开这条私人观察':'记录这条线索'}<Check size={15}/></button>}{save.known.includes(selectedClue.id)&&<p className="small-print">已收进本幕公开证据本。</p>}</>:<>{save.known.length?actTwoClues.filter(c=>save.known.includes(c.id)).map(c=><button className="evidence-row" key={c.id} onClick={()=>setSelected(c.id)}><span>{c.id}</span><div><small>{c.kind}</small><h3>{c.title}</h3></div><ChevronRight size={15}/></button>):<p className="reading-text">先查看停电记录和旧名册。角色私有观察不会自动出现在公开证据本。</p>}<p className="small-print">已公开 {save.known.length} 条。B03由你选择公开；B04、B05、B06随对应角色陈述公开。</p></>}</Panel>}
  {panel==='script'&&<Panel title="林见秋 · 第二幕" kicker="ACT II · PRIVATE SCRIPT" onClose={()=>setPanel(null)}><div className="role-description">31岁 · 刑警<span>仅你的视角</span></div><h3 className="reading-heading">你的真实活动</h3>{actTwoMembers[0].timeline.map(([time,place])=><div className="a2-paper-time" key={time}><strong>{time}</strong><p>{place}</p></div>)}<p className="small-print">这是你自己的记忆，不代表全程有人目击。21:05全员回到大厅；21:07停电。</p><h3 className="reading-heading">你能提供的信息</h3><p className="reading-text">你发现星期日值日表上的名字被刮掉。顾怀山上楼时鞋是湿的。先谈观察，不要用职业身份宣布别人有罪。</p><div className="note-box"><span>B03 · 只有你知道</span><p>{actTwoClues[2].text} {actTwoClues[2].limit}</p></div><button className="panel-primary" onClick={()=>{setSelected('B03');setPanel('evidence');}}>{save.known.includes('B03')?'查看已公开的B03':'选择是否公开B03'}<ChevronRight size={15}/></button><p className="small-print">不会展示其他人的私人角色本。单人本地演示没有多人权限服务。</p></Panel>}
  {panel==='timeline'&&<Panel title="20:10以后，他们去了哪里" kicker="ACT II · PUBLIC TIMELINE" onClose={()=>setPanel(null)}><ActTwoTimeline save={save}/></Panel>}
  {panel==='history'&&<Panel title="第二幕 · 对话记录" kicker="ACT II · CONVERSATION" onClose={()=>setPanel(null)}><div className="history-list">{save.history.map((m,i)=><article key={i}><span>{m.who}</span><p>{m.text}</p></article>)}</div></Panel>}
  {panel==='review'&&<Panel title="第二幕 · 调查记录" kicker="ACT II · INVESTIGATION REVIEW" onClose={()=>setPanel(null)}><p className="reading-text">本幕已完成：现场记录、六份陈述、一段录音和你的查证方向。本次试玩止于七号房门外，第三幕尚未开放。</p><div className="note-box"><span>你选择继续核对</span><p>{actTwoFocus.find(f=>f.id===save.focus)?.title}</p><p>{save.question}</p></div><h3 className="reading-heading">本幕公开记录</h3>{actTwoClues.filter(c=>save.known.includes(c.id)).map(c=><div className="review-row" key={c.id}><Check size={14}/><span>{c.id} · {c.title}</span></div>)}<ActTwoDeduction save={save}/><p className="small-print">本次试玩完成：现场记录、六份活动陈述、广播与一条查证方向已保存。第三幕尚未开放。</p><button className="panel-primary" onClick={download}><Download size={15}/>导出第二幕记录</button><button className="text-link" onClick={()=>setPanel('history')}>查看对话记录</button></Panel>}
  {panel==='help'&&<Panel title="第二幕 · 试玩说明" kicker="ACT II · GUIDE" onClose={()=>setPanel(null)}><p className="reading-text">本次试玩包含第一、二幕，终点是七号房门外。第三幕尚未开放；本幕目标是整理线索、比较陈述并提出一条有依据的查证方向。</p><p className="panel-lead">按右侧「当前目标」一步步继续。底栏的资料和主持人可随时打开。</p><ol className="a2-route">{phases.slice(0,6).map(([p,label],i)=><li key={p} className={i===Math.min(currentPhase,5)?'active':''}><span>{i<currentPhase?<Check size={14}/>:i+1}</span><div><strong>{label}</strong><p>{['了解停电后发生的事','查看并记录名册和停电经过','先提交自己，再听其他五人','收听广播或阅读完整文本','选择方向，写下待追问的问题','保存本幕调查记录'][i]}</p></div></li>)}</ol><div className="note-box"><span>语音与资料</span><p>固定台词预先使用NIA角色音色合成；广播对白为原稿文本演绎。配置实时服务时，语音与文字提问连接第二幕主持人，仅带入本幕公开线索，不提交林见秋未公开的私人观察。</p></div><button className="option-row" onClick={()=>setPanel('history')}><span><FileText size={15}/>查看对话记录</span><ChevronRight size={15}/></button><button className="option-row" onClick={download}><span><Download size={15}/>导出第二幕记录</span></button><button className="option-row" onClick={()=>setPanel('reset')}><span><RotateCcw size={15}/>重新体验第二幕</span></button></Panel>}
  {panel==='reset'&&<Panel title="重新体验第二幕？" kicker="ACT II · RESTART" onClose={()=>setPanel(null)}><p className="reading-text">这会清空当前浏览器的第二幕进度。第一幕记录保留。</p><button className="panel-primary" onClick={()=>{stop();setSave(initialActTwo());setFocus(null);setCurrent({who:'第二幕 · 主持人',text:'21:05，六人已经回到大厅。两分钟后，灯灭了。'});setPanel(null);}}>清空第二幕并重新开始</button><button className="text-link" onClick={()=>setPanel(null)}>保留当前进度</button></Panel>}
 </main>;
}
