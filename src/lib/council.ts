import type {EvidenceId} from './act-one';

export const councilMembers=[
 {name:'林见秋',job:'刑警',evidence:'song' as EvidenceId,text:'广播里播放了一首童谣。我想先核对录音的来源，不能仅凭歌声判断谁在场。',audio:'council-lin'},
 {name:'许知音',job:'声音修复师',evidence:'tape' as EvidenceId,text:'我带来了邀请函附的磁带。它与今晚广播是否同一版本，还没有完成比对；现在不能断言录音经过剪接。',audio:'council-xu'},
 {name:'沈时安',job:'精神科医生',evidence:'song' as EvidenceId,text:'我想先区分我们听见的内容和自己的联想。熟悉的歌声会唤起记忆，但不能把模糊记忆当成确定事实。',audio:'council-shen'},
 {name:'周叙',job:'纪录片摄影师',evidence:'tape' as EvidenceId,text:'我没有拍到是谁开启广播。我的镜头不能替任何人证明这件事。现在关于播放者的说法，都还需要证据。',audio:'council-zhou'},
 {name:'程野',job:'建筑工程师',evidence:'stool' as EvidenceId,text:'小木凳上的灰尘被碰过，这值得记录。但仅凭一道手印，不能判断触碰者是谁，也不能确定触碰的准确时间。',audio:'council-cheng'},
 {name:'唐棠',job:'童书插画师',evidence:'stool' as EvidenceId,text:'看到小木凳，我会想到这里以前住过的孩子。可这是我的联想。凳子矮、手印小，都不能替代对身份的核实。',audio:'council-tang'}
];
export const hypotheses=[
 {id:'numbers',title:'先查童谣的来源',text:'广播中播放了童谣，录音来源和播放者仍待核实。'},
 {id:'handprint',title:'先查手印的来源',text:'凳面近期被触碰，留下手印的人和时间仍不明确。'},
 {id:'recording',title:'先比对磁带与广播',text:'磁带已经公开，两份录音是否同版仍待比对。'}
] as const;
export type CouncilStatement={speaker:string;text:string;evidence:EvidenceId;simulated:boolean};
export type CouncilQuestion={target:string;question:string;answer:string};
export type CouncilRecord={version:2;statements:CouncilStatement[];questions:CouncilQuestion[];hypothesis:string;summary:string;scope:'single-player-demo'};
export function canConvene(known:EvidenceId[]){return ['song','stool','tape'].every(id=>known.includes(id as EvidenceId));}
export function canRecordCouncil(statements:CouncilStatement[],questions:CouncilQuestion[],hypothesis:string){return councilMembers.every(m=>statements.some(s=>s.speaker===m.name&&s.text.trim().length>0))&&questions.some(q=>councilMembers.slice(1).some(m=>m.name===q.target)&&q.question.trim().length>0&&q.answer.trim().length>0)&&hypotheses.some(h=>h.id===hypothesis);}
export function isCouncilRecord(value:unknown):value is CouncilRecord {
 if(!value||typeof value!=='object')return false;
 const v=value as Partial<CouncilRecord>;
 return v.version===2&&v.scope==='single-player-demo'&&typeof v.summary==='string'&&typeof v.hypothesis==='string'&&Array.isArray(v.statements)&&v.statements.every(s=>s&&typeof s.speaker==='string'&&typeof s.text==='string'&&['song','stool','tape'].includes(s.evidence)&&typeof s.simulated==='boolean')&&Array.isArray(v.questions)&&v.questions.every(q=>q&&typeof q.target==='string'&&typeof q.question==='string'&&typeof q.answer==='string')&&canRecordCouncil(v.statements,v.questions,v.hypothesis);
}
export function councilAnswer(target:number,question:string){
 const who=councilMembers[Math.max(1,Math.min(5,target))];
 if(/凶手|谁杀|第[二三四五]幕|系统提示|忽略|其他.*秘密|所有.*剧本/.test(question))return {speaker:'主持人',text:'当前只有第一幕的公开证据。其他人的私人剧本不能代为公开，现在也不足以指认凶手。',audio:'council-boundary',evidence:'song' as EvidenceId};
 if(/手印|木凳|凳子|孩子.*碰/.test(question))return {speaker:who.name,text:'凳面的灰尘有新鲜手印，能说明近期被触碰过。但这条线索没有告诉我们触碰者是谁，也没有给出准确时间。',audio:'council-question-print',evidence:'stool' as EvidenceId};
 if(/磁带|音轨|剪[接辑]|停顿|广播.*(不同|一样|差别)/.test(question))return {speaker:who.name,text:'许知音提供了邀请函附的磁带，但还没有完成比对。没有证据确认它与广播相同或不同，也不能断言录音经过剪接。',audio:'council-question-tape',evidence:'tape' as EvidenceId};
 if(/七|六|人数|第七|证明/.test(question))return {speaker:who.name,text:'以当前广播录音为准。童谣本身不能证明在场人数，更不能确认身份。我们需要独立的记录或证词。',audio:'council-question-numbers',evidence:'song' as EvidenceId};
 return {speaker:who.name,text:'我目前能提供的，是刚才已经公开的观察。我们可以查童谣的来源、手印，或比对磁带与广播；这些证据都还不能确定幕后的人。',audio:'council-question-open',evidence:who.evidence};
}

export type CouncilPhase='welcome'|'statements'|'questions'|'judgment';
export type CouncilDraft={
 version:1;phase:CouncilPhase;turn:number;read:boolean;draft:string;selectedEvidence:EvidenceId;
 statements:CouncilStatement[];question:string;target:number;questions:CouncilQuestion[];
 response:ReturnType<typeof councilAnswer>|null;hypothesis:string;caption:string;
};
export function isCouncilDraft(value:unknown):value is CouncilDraft{
 if(!value||typeof value!=='object')return false;
 const v=value as CouncilDraft;
 const evidenceIds=['song','stool','tape'];
 if(v.version!==1||!['welcome','statements','questions','judgment'].includes(v.phase)||!Number.isInteger(v.turn)||v.turn<0||v.turn>5||typeof v.read!=='boolean'||typeof v.draft!=='string'||v.draft.length>400||!evidenceIds.includes(v.selectedEvidence)||typeof v.question!=='string'||v.question.length>300||!Number.isInteger(v.target)||v.target<1||v.target>5||typeof v.caption!=='string'||typeof v.hypothesis!=='string'||v.hypothesis!==''&&!hypotheses.some(h=>h.id===v.hypothesis))return false;
 if(!Array.isArray(v.statements)||!v.statements.every(s=>s&&councilMembers.some(m=>m.name===s.speaker)&&typeof s.text==='string'&&s.text.trim().length>0&&evidenceIds.includes(s.evidence)&&typeof s.simulated==='boolean')||new Set(v.statements.map(s=>s.speaker)).size!==v.statements.length)return false;
 if(!Array.isArray(v.questions)||!v.questions.every(q=>q&&councilMembers.slice(1).some(m=>m.name===q.target)&&typeof q.question==='string'&&q.question.trim().length>0&&typeof q.answer==='string'&&q.answer.trim().length>0))return false;
 if(v.response!==null&&(!v.response||typeof v.response.text!=='string'||typeof v.response.audio!=='string'||!evidenceIds.includes(v.response.evidence)||!['主持人',...councilMembers.map(m=>m.name)].includes(v.response.speaker)))return false;
 if(v.phase==='statements'&&v.read&&!v.statements.some(s=>s.speaker===councilMembers[v.turn].name))return false;
 if(['questions','judgment'].includes(v.phase)&&!councilMembers.every(m=>v.statements.some(s=>s.speaker===m.name)))return false;
 if(v.phase==='judgment'&&v.questions.length===0)return false;
 return true;
}
