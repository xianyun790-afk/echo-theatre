import {opening,type EvidenceId} from './act-one';
import {isCouncilDraft,isCouncilRecord,type CouncilDraft,type CouncilRecord} from './council';
export type Message={who:string;text:string};
export type Checkpoint={scene:'speaker'|'stool';view:'room'|'radio'|'stool'|'council'};
export type Progress={version:3;intro:'prologue'|'role'|'ready';known:EvidenceId[];completed:boolean;deliberation?:CouncilRecord;councilDraft?:CouncilDraft;history:Message[];checkpoint?:Checkpoint};
export function initialProgress():Progress{return {version:3,intro:'prologue',known:[],completed:false,history:[{who:'序幕',text:opening}]};}
export function hasSavedProgress(p:Progress){return p.intro==='ready';}
export function parseProgress(raw:string|null):Progress{
 const fresh=initialProgress();
 try{
  const v=JSON.parse(raw||'null');if(!v||typeof v!=='object'||Array.isArray(v))return fresh;
  const known:EvidenceId[]=Array.isArray(v.known)?[...new Set<EvidenceId>(v.known.filter((id:unknown)=>id==='song'||id==='stool'||id==='tape'))]:[];
  const deliberation=isCouncilRecord(v.deliberation)?v.deliberation:undefined;
  const councilDraft=isCouncilDraft(v.councilDraft)?v.councilDraft:undefined;
  const history:Message[]=Array.isArray(v.history)?v.history.filter((m:unknown):m is Message=>Boolean(m&&typeof m==='object'&&typeof (m as Message).who==='string'&&typeof (m as Message).text==='string')):[];
  const c=v.checkpoint;
  const validCheckpoint=c&&['speaker','stool'].includes(c.scene)&&['room','radio','stool','council'].includes(c.view);
  // Old autoplay could save only the song before the player ever opened the door.
  const intro:Progress['intro']=['prologue','role','ready'].includes(v.intro)?v.intro:validCheckpoint||known.some(id=>id!=='song')||deliberation||councilDraft?'ready':'prologue';
  const checkpoint:Checkpoint|undefined=intro!=='ready'?undefined:validCheckpoint?{scene:c.scene,view:c.view}:{scene:'speaker',view:councilDraft?'council':'room'};
  return {version:3,intro,known,completed:v.completed===true&&Boolean(deliberation),deliberation,councilDraft,history:history.length?history:fresh.history,checkpoint};
 }catch{return fresh;}
}
