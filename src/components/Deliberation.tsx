import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,FileText,Pause,Play,Send,Users} from 'lucide-react';
import {Wave} from './Wave';
import {SceneAudio} from '@/lib/audio';
import narration from '@/lib/narration.json';
import {voiceForSpeaker} from '@/lib/voices';
import {evidence,type EvidenceId} from '@/lib/act-one';
import {councilAnswer,councilMembers,hypotheses,canRecordCouncil,type CouncilQuestion,type CouncilRecord,type CouncilStatement,type CouncilDraft,type CouncilPhase} from '@/lib/council';

type Props={initialDraft?:CouncilDraft;onDraftChange:(draft:CouncilDraft)=>void;muted:boolean;suspended:boolean;onLeave:()=>void;onEvidence:(id:EvidenceId)=>void;onSpeaker:(seat:number,evidence:EvidenceId)=>void;onComplete:(record:CouncilRecord)=>void};
export function Deliberation({initialDraft,onDraftChange,muted,suspended,onLeave,onEvidence,onSpeaker,onComplete}:Props){
 const [preparing,setPreparing]=useState(false),[voiceSpeaker,setVoiceSpeaker]=useState('旁白');
 const [phase,setPhase]=useState<CouncilPhase>(initialDraft?.phase??'welcome'),[turn,setTurn]=useState(initialDraft?.turn??0),[playing,setPlaying]=useState(false),[read,setRead]=useState(initialDraft?.read??false);
 const [draft,setDraft]=useState(initialDraft?.draft??''),[selectedEvidence,setSelectedEvidence]=useState<EvidenceId>(initialDraft?.selectedEvidence??'song'),[statements,setStatements]=useState<CouncilStatement[]>(initialDraft?.statements??[]);
 const [question,setQuestion]=useState(initialDraft?.question??''),[target,setTarget]=useState(initialDraft?.target??1),[questions,setQuestions]=useState<CouncilQuestion[]>(initialDraft?.questions??[]),[response,setResponse]=useState<ReturnType<typeof councilAnswer>|null>(initialDraft?.response??null),[hypothesis,setHypothesis]=useState(initialDraft?.hypothesis??''),[error,setError]=useState('');
 const [caption,setCaption]=useState(initialDraft?.caption??'大家回到餐桌前。先陈述已经公开的观察，再互相追问。');
 const voice=useRef<SceneAudio|null>(null),generation=useRef(0),draftInput=useRef<HTMLTextAreaElement>(null);
 const member=councilMembers[turn],activeSeat=phase==='statements'?turn:phase==='questions'?target:-1;
 useEffect(()=>{voice.current=new SceneAudio();voice.current.setMuted(muted);if(!initialDraft||initialDraft.phase==='welcome')void guide('n13-at-the-table');return()=>{generation.current++;void voice.current?.destroy();};},[]);
 useLayoutEffect(()=>{onDraftChange({version:1,phase,turn,read,draft,selectedEvidence,statements,question,target,questions,response,hypothesis,caption});},[phase,turn,read,draft,selectedEvidence,statements,question,target,questions,response,hypothesis,caption,onDraftChange]);
 useEffect(()=>{voice.current?.setMuted(muted);},[muted]);
 useEffect(()=>{voice.current?.setBackgroundSuppressed(phase!=='welcome');},[phase]);
 useEffect(()=>{if(suspended){generation.current++;voice.current?.stop();setPlaying(false);setPreparing(false);}},[suspended]);
 useEffect(()=>{onSpeaker(activeSeat,selectedEvidence);},[activeSeat,selectedEvidence]);
 useEffect(()=>{if(phase==='statements'&&turn===0&&!read)draftInput.current?.focus();},[phase,turn]);
 async function play(audio:string,text:string,role?:string,speaker='旁白'){
  const token=++generation.current;setPlaying(true);setPreparing(true);setVoiceSpeaker(speaker);setError('');setCaption(text);
  try{await voice.current?.play(audio,undefined,role,{onStart:()=>{if(token===generation.current)setPreparing(false);}});}
  catch{if(token===generation.current)setError('语音无法播放，陈述文字仍可阅读。');}
  finally{if(token===generation.current){setPlaying(false);setPreparing(false);}}
  return token===generation.current;
 }
 function guide(id:keyof typeof narration){return play(id,narration[id].text);}
 function stop(){generation.current++;voice.current?.stop();setPlaying(false);setPreparing(false);}
 function noteStatement(speaker:string,text:string,ref:EvidenceId,simulated:boolean){setStatements(old=>[...old.filter(s=>s.speaker!==speaker),{speaker,text,evidence:ref,simulated}]);}
 function start(){voice.current?.setBackgroundSuppressed(true);setPhase('statements');setTurn(0);setRead(false);void guide('n14-statements-begin');}
 function submitOwn(){if(!draft.trim())return;noteStatement('林见秋',draft.trim(),selectedEvidence,false);setRead(true);void play('council-received','你的陈述已记录。接下来听取其他人的公开观察。');}
 function hearTurn(seat=turn){const speaker=councilMembers[seat];noteStatement(speaker.name,speaker.text,speaker.evidence,true);setSelectedEvidence(speaker.evidence);setRead(true);void play(speaker.audio,speaker.text,undefined,speaker.name);}
 function next(){if(!read||playing)return;if(turn<5){const n=turn+1;setTurn(n);hearTurn(n);}else{setPhase('questions');void guide('n15-questions-begin');}}
 function ask(q=question){if(!q.trim()||(playing&&response))return;const r=councilAnswer(target,q);setQuestions(old=>[...old,{target:councilMembers[target].name,question:q.trim(),answer:r.text}]);setResponse(r);setQuestion('');setSelectedEvidence(r.evidence);void play(r.audio,r.text,r.speaker==='主持人'?undefined:['narrator_host','xu','shen','zhou','cheng','tang'][target],r.speaker);}
 function beginJudgment(){setPhase('judgment');void guide('n16-judgment-begin');}
 function conclude(){
  const h=hypotheses.find(h=>h.id===hypothesis);
  if(!h||!canRecordCouncil(statements,questions,hypothesis))return;
  stop();onComplete({version:2,statements,questions,hypothesis,summary:h.text,scope:'single-player-demo'});
 }
 const current=evidence.find(e=>e.id===selectedEvidence)!;
 return <section className="council" aria-label="集中推理环节">
  <div className="council-heading"><span className="eyebrow">ACT I · ALL AT THE TABLE</span><h1 data-type-surface="council-title">集中推理</h1><div className="council-steps"><span className={phase==='welcome'||phase==='statements'?'active':''}>依次陈述</span><i/><span className={phase==='questions'?'active':''}>相互质询</span><i/><span className={phase==='judgment'?'active':''}>记录判断</span></div></div>
  <button className="council-leave" onClick={()=>{stop();onLeave();}}><ArrowLeft size={13}/>返回搜证</button>
  <div className="council-seats" aria-label="六个角色的本轮状态">{councilMembers.map((m,i)=><div key={m.name} className={`council-seat ${activeSeat===i?'active':''} ${statements.some(s=>s.speaker===m.name)?'spoken':''}`}><span className="seat-mark">{activeSeat===i&&playing?<Wave active/>:statements.some(s=>s.speaker===m.name)?<Check size={12}/>:String(i+1).padStart(2,'0')}</span><span>{m.name}</span><small>{i===0?'你':'演示角色'}</small></div>)}</div>
  <button className="table-evidence" onClick={()=>onEvidence(selectedEvidence)}><FileText size={14}/><span>桌面证据 · {current.title}</span><span>查看</span></button>
  <div className="council-content">
   {phase==='welcome'?<><div className="voice-meta"><Users size={14}/><span>所有人回到同一张桌前</span></div><p className="council-caption" aria-live="polite">{caption}</p><button className="primary-action" onClick={start}>开始轮流陈述<span className="action-end"><ArrowRight size={16}/></span></button><p className="council-demo-note">单人本地演示：你扮演林见秋，其余5个角色使用预设发言。</p></>:
   phase==='statements'?<><div className="voice-meta"><span className="voice-dot"/><span>{playing?`${voiceSpeaker} · ${preparing?'准备语音':'发言中'}`:member.name+(turn===0?' · 你的发言':' · 演示发言')}</span>{playing&&!preparing&&<Wave active/>}<span className="voice-origin">{turn+1} / 6 · {playing?'NIA · '+voiceForSpeaker(voiceSpeaker).name:'依次陈述'}</span></div>{turn===0&&!read?<><label className="statement-label" htmlFor="council-statement">你愿意公开哪一条观察？</label><textarea ref={draftInput} id="council-statement" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={400} placeholder="例如：我想先查广播中这首童谣的来源……"/><div className="citation-picker" aria-label="本次陈述引用的证据">{evidence.map(e=><button key={e.id} aria-pressed={selectedEvidence===e.id} className={selectedEvidence===e.id?'selected':''} onClick={()=>setSelectedEvidence(e.id)}>{e.number} {e.title}</button>)}</div><button className="primary-action" disabled={!draft.trim()} onClick={submitOwn}><Send size={15}/>公开我的陈述<span className="action-end"><ArrowRight size={16}/></span></button></>:<><p className="council-caption" aria-live="polite">{caption}</p>{playing?<button className="primary-action" onClick={stop}><Pause size={16}/>结束本轮发言</button>:read?<button className="primary-action" onClick={next}>{turn===5?'进入相互质询':'请下一位发言'}<span className="action-end"><ArrowRight size={16}/></span></button>:<button className="primary-action" onClick={()=>hearTurn()}><Play size={15}/>{`听取${member.name}的陈述`}<span className="action-end"><ArrowRight size={16}/></span></button>}</>}<p className="council-demo-note">仅公开本幕证据。其他人的私人记忆由本人决定是否透露。</p></>:
   phase==='questions'?<><div className="voice-meta"><span className="voice-dot"/><span>{preparing?'正在准备语音…':response?`${response.speaker} · 回应质询`:playing?'旁白 · 质询引导':'自由质询 · 围绕公开证据'}</span>{playing&&!preparing&&<Wave active/>}</div>{response?<><p className="asked-question">你问{questions.at(-1)?.target}：{questions.at(-1)?.question}</p><p className="council-caption" aria-live="polite">{response.text}</p>{playing?<button className="primary-action" onClick={stop}><Pause size={16}/>停止播放</button>:<><button className="primary-action" onClick={beginJudgment}>形成本轮判断<span className="action-end"><ArrowRight size={16}/></span></button><button className="quiet-action" onClick={()=>setResponse(null)}>继续追问其他人</button></>}</>:<>{playing&&<p className="council-caption" aria-live="polite">{caption}</p>}<div className="question-target"><label htmlFor="council-target">你要问谁</label><select id="council-target" value={target} onChange={e=>setTarget(Number(e.target.value))}>{councilMembers.slice(1).map((m,i)=><option key={m.name} value={i+1}>{m.name}</option>)}</select><span>其他玩家为预设回应演示</span></div><textarea aria-label="你的质询" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={300} placeholder="围绕已公开的证据提一个问题……"/><div className="question-suggestions">{['童谣能证明第七个人在场吗？','手印是谁留下的？','磁带和广播已经比对过了吗？'].map(q=><button key={q} onClick={()=>ask(q)}>{q}</button>)}</div><button className="primary-action" disabled={!question.trim()} onClick={()=>ask()}><Send size={15}/>提出质询<span className="action-end"><ArrowRight size={16}/></span></button></>}<p className="council-demo-note">本地质询不会触发真实玩家连麦；回复限于预设公开事实。</p></>:
   <><div className="voice-meta"><span className="voice-dot"/><span>{preparing?'正在准备语音…':'本轮优先验证哪一个疑点？'}</span></div>{playing&&<p className="council-caption" aria-live="polite">{caption}</p>}<div className="hypothesis-options" role="radiogroup" aria-label="本轮暂定判断">{hypotheses.map(h=><button key={h.id} role="radio" aria-checked={hypothesis===h.id} className={hypothesis===h.id?'selected':''} onClick={()=>setHypothesis(h.id)}><span className="hypothesis-radio">{hypothesis===h.id&&<i/>}</span><span><strong>{h.title}</strong><small>{h.text}</small></span></button>)}</div><button className="primary-action" disabled={!canRecordCouncil(statements,questions,hypothesis)} onClick={conclude}>记录本轮判断<span className="action-end"><Check size={16}/></span></button><p className="council-demo-note">这里只记录你的暂定判断。真实多人意见尚未接入，不代表全体一致或凶手指认。</p></>}
   {error&&<p role="alert" className="inline-error">{error}</p>}
  </div>
 </section>;
}
