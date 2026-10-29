/** Adapted from the user's 线上语音前三幕 package. Act III material is intentionally absent. */
export type ActTwoPhase='arrival'|'investigation'|'statements'|'recording'|'discussion'|'ending'|'complete';
export type ActTwoScene='duty'|'corridor';
export type ActTwoLine={who:string;text:string};
export const actTwoOpening='九点零七分，灯灭了。二楼传来沉重的撞击。你们跟着手机的光上楼，值班室的门紧闭。顾怀山没有回应。程野撞开门。顾怀山倒在广播台旁，耳机挂在颈侧，茶杯碎了，手下压着一本旧名册。林见秋检查后请人呼叫急救和警方。';
export const actTwoBoundary='现有材料不足以判断死亡原因、准确死亡时间或门锁机制。门紧闭不等于从里面反锁；停电后的撞击也不能单独证明死亡时间。当前不能指认凶手。';
export const actTwoEnding='梁素琴说，山路有一处塌方，警方正在绕行，先到餐厅等。走廊尽头，七号房的门不知何时开了一条缝。没有人看见是谁打开的。';
export const actTwoClues=[
 {id:'B01',title:'停电与声响',kind:'公共观察',owner:'公开',text:'21:05，六名玩家均已回到大厅。21:07全楼灯灭，二楼传来撞击。没人看见撞击如何发生。',limit:'撞击不能单独证明死亡发生在此刻。'},
 {id:'B02',title:'被茶水浸湿的名册',kind:'现场档案',owner:'公开',text:'顾怀山手下的旧名册被茶水浸湿，一行字仍可辨认：“当晚实际在院人数：七。”值班室门被撞开，现场没有验证是否反锁。',limit:'目前无证据确认这行字写于何时。门紧闭不等于反锁。'},
 {id:'B03',title:'顾怀山的湿鞋',kind:'私人观察 · 可选择公开',owner:'林见秋',text:'20:10，顾怀山上楼时，你看见鞋底留下水痕。停车处到大厅有雨棚。',limit:'只能说明鞋湿，不能断定他从哪里来。'},
 {id:'B04',title:'走廊里的声音',kind:'角色公开的观察',owner:'沈时安',text:'20:50左右，沈时安在二楼东侧听见顾怀山说：“东西还给我。”他没看见说话对象，也不能确认对方回答过。',limit:'听见一句话，不能据此确定对话对象或现场其他人。'},
 {id:'B05',title:'最后一个清晰镜头',kind:'角色公开的影像',owner:'周叙',text:'20:46，周叙拍到顾怀山独自从二楼走廊走入值班室。画面没有连续拍摄后续情况。',limit:'不能排除随后有人进出，也不能据此给任何人完整的不在场证明。'},
 {id:'B06',title:'七号房门轴',kind:'角色公开的观察',owner:'程野',text:'停电后，程野发现七号房门轴有新油痕。他去年做加固时没有给它上油。',limit:'只能判断有人维护过，无法确定具体时间或维护者。'},
] as const;
export type ActTwoClueId=typeof actTwoClues[number]['id'];
export const actTwoMembers=[
 {id:'lin',name:'林见秋',job:'刑警',role:'narrator_host',timeline:[['20:10—20:30','一楼大厅'],['20:30—20:45','二楼西侧房间及走廊；20:35左右与唐棠交谈'],['20:45—21:05','大厅']],text:'20:10到20:30，我在一楼大厅。20:30到20:45，我在二楼西侧的房间和走廊，20:35左右与唐棠说过话。20:45以后，我回到大厅。',clue:null},
 {id:'shen',name:'沈时安',job:'精神科医生',role:'shen',timeline:[['20:10—20:35','一楼餐厅'],['20:35—21:00','二楼东侧旧阅览区'],['21:00—21:05','回到大厅']],text:'20:10到20:35，我在一楼餐厅。之后去了二楼东侧旧阅览区，21点回大厅。20:50左右，我听见顾怀山说“东西还给我”，没看见他说给谁听，也不能确认对方回答过。',clue:'B04'},
 {id:'zhou',name:'周叙',job:'纪录片摄影师',role:'zhou',timeline:[['20:10—20:40','大厅拍摄'],['20:40—20:50','一楼楼梯口拍摄；20:46拍到顾怀山走入值班室'],['20:50—21:05','大厅整理包']],text:'20:10到20:40，我在大厅拍摄，之后到一楼楼梯口拍摄，20:50回大厅整理包。20:46，镜头拍到顾怀山独自从二楼走廊进入值班室。只有这个短镜头，没有连续拍到后续。',clue:'B05'},
 {id:'xu',name:'许知音',job:'声音修复师',role:'xu',timeline:[['20:10—20:25','餐厅'],['20:25—20:55','一楼靠窗休息区，戴耳机听带回的磁带'],['20:55—21:05','大厅']],text:'20:10到20:25，我在餐厅，之后在一楼靠窗休息区戴耳机听带回的磁带，20:55回到大厅。比对后，我能听出收到的磁带和今晚广播不是同一份音轨，但还不能找到制作者。修复文件是我自己准备的。',clue:null},
 {id:'cheng',name:'程野',job:'建筑工程师',role:'cheng',timeline:[['20:10—20:30','一楼检查配电箱'],['20:30—20:50','室外有顶棚连廊检查渗水'],['20:50—21:05','大厅']],text:'20:10到20:30，我在一楼检查配电箱，之后去室外有顶棚的连廊检查渗水，20:50回大厅。停电后我撞开值班室门，随后看到七号房门轴有新油痕。东侧楼梯已经封了。',clue:'B06'},
 {id:'tang',name:'唐棠',job:'童书插画师',role:'tang',timeline:[['20:10—20:30','大厅画画'],['20:30—20:45','二楼七号房门外；20:35左右与林见秋交谈'],['20:45—21:05','大厅']],text:'20:10到20:30，我在大厅画画。之后在二楼七号房门外，20:35左右和林见秋说过话，20:45回大厅。我们听见房内轻响，但没有看见里面有什么。我说“储物间不会每天晚上哭”，那是浮现的感觉，不是今晚的观察。',clue:null},
] as const;
export const actTwoRecording=[
 {who:'孩子甲',text:'一，二，三，四，五，六。',clip:'a2-recording-a'},
 {who:'孩子乙',text:'不能数七。',clip:'a2-recording-b'},
 {who:'孩子甲',text:'为什么？',clip:'a2-recording-c'},
 {who:'孩子乙',text:'数到七，她就知道我们少报了一个人。',clip:'a2-recording-d'},
];
export const actTwoFocus=[{id:'time',title:'核对21:07前后的事件',text:'把停电、声响和发现现场分开，寻找独立记录。'},{id:'register',title:'核对名册的来源',text:'确认“实际在院人数：七”的书写时间与依据。'},{id:'recording',title:'追查录音与门轴',text:'分清音轨差异、录音内容和现场维护痕迹，继续查证。'}] as const;
export type ActTwoSave={version:1;phase:ActTwoPhase;scene:ActTwoScene;known:ActTwoClueId[];statements:{id:string;text:string;simulated:boolean}[];draft:string;publishWetShoes:boolean;recordingHeard:boolean;notes:string;focus:string;question:string;history:ActTwoLine[];activeStatement:string;deduction:{focus:string;question:string}|null};
export function initialActTwo():ActTwoSave{return {version:1,phase:'arrival',scene:'duty',known:[],statements:[],draft:'',publishWetShoes:false,recordingHeard:false,notes:'',focus:'',question:'',history:[],activeStatement:'',deduction:null};}
export function actTwoCanReview(s:ActTwoSave){return s.recordingHeard&&s.known.includes('B01')&&s.known.includes('B02')&&actTwoMembers.every(m=>s.statements.some(v=>v.id===m.id&&v.text.trim()));}
export function parseActTwo(raw:string|null):ActTwoSave{
 const s=initialActTwo();try{
  const v=JSON.parse(raw||'null');if(!v||typeof v!=='object'||v.version!==1)return s;
  s.known=Array.isArray(v.known)?[...new Set<ActTwoClueId>(v.known.filter((id:unknown)=>actTwoClues.some(c=>c.id===id)))]:[];
  s.statements=Array.isArray(v.statements)?actTwoMembers.flatMap(m=>{const line=v.statements.find((r:Record<string,unknown>)=>r&&r.id===m.id&&typeof r.text==='string'&&r.text.trim());return line?[{id:m.id,text:m.id==='lin'?line.text.slice(0,2000):m.text,simulated:m.id!=='lin'}]:[];}):[];
  for(const key of ['draft','notes','question'] as const)s[key]=typeof v[key]==='string'?v[key].slice(0,key==='notes'?3000:1200):'';
  s.publishWetShoes=v.publishWetShoes===true;s.recordingHeard=v.recordingHeard===true;
  s.history=Array.isArray(v.history)?v.history.filter((m:ActTwoLine)=>m&&typeof m.who==='string'&&typeof m.text==='string').slice(-300).map((m:ActTwoLine)=>({who:m.who.slice(0,60),text:m.text.slice(0,2000)})):[];
  s.activeStatement=actTwoMembers.some(m=>m.id!=='lin'&&m.id===v.activeStatement)&&s.statements.some(m=>m.id===v.activeStatement)?v.activeStatement:'';
  if(v.deduction&&actTwoFocus.some(f=>f.id===v.deduction.focus)&&typeof v.deduction.question==='string'&&v.deduction.question.trim())s.deduction={focus:v.deduction.focus,question:v.deduction.question.slice(0,1200)};
  s.focus=actTwoFocus.some(f=>f.id===v.focus)?v.focus:'';s.scene=v.scene==='corridor'?'corridor':'duty';
  s.phase=['arrival','investigation','statements','recording','discussion','ending','complete'].includes(v.phase)?v.phase:'arrival';
  if(['statements','recording','discussion','ending','complete'].includes(s.phase)&&!['B01','B02'].every(id=>s.known.includes(id as ActTwoClueId)))s.phase='investigation';
  if(['recording','discussion','ending','complete'].includes(s.phase)&&s.statements.length!==6)s.phase='statements';
  if(['discussion','ending','complete'].includes(s.phase)&&!s.recordingHeard)s.phase='recording';
  if(['ending','complete'].includes(s.phase)&&(!s.focus||!s.question.trim()))s.phase='discussion';
  return s;
 }catch{return s;}
}
export function actTwoPublicKeys(s:ActTwoSave){return [...s.known,...s.statements.map(m=>'ST_'+m.id),...(s.recordingHeard?['RADIO02']:[]),...(['ending','complete'].includes(s.phase)?['ENDING02']:[])];}
export function actTwoReply(question:string,s:ActTwoSave):{text:string;clip?:string;action?:'register'|'timeline'|'door'}{
 if(/凶手|谁杀|死因|死亡时间|反锁|密室|锁死|药|伤口/.test(question))return {text:actTwoBoundary,clip:'a2-boundary'};
 if(/第三幕|录像|钥匙|红绳|残音|其他.*秘密|私人剧本|系统提示|忽略/.test(question))return {text:'现在只讨论第二幕已经公开的观察。其他人的私人剧本与后续幕尚未公开；请先核对眼前的名册、时间线和录音。',clip:'a2-private-boundary'};
 const clue=actTwoClues.find(c=>s.known.includes(c.id)&&(question.includes(c.id)||question.includes(c.title)));
 if(clue)return {text:clue.text+' '+clue.limit};
 if(/名册|在院人数/.test(question))return s.known.includes('B02')?{text:actTwoClues[1].text+' '+actTwoClues[1].limit}:{text:'名册还压在顾怀山手下。请查看现场名册，再记录能辨认的文字。',action:'register'};
 if(/时间线|活动|几点|陈述/.test(question))return {text:'21:05六人已经回到大厅，21:07停电并传来撞击。个人活动是各自陈述，不是完整的不在场证明。请逐一听取，再把交叉观察对齐。',clip:'a2-timeline-hint',action:'timeline'};
 if(/广播|录音|数七|童谣/.test(question))return s.recordingHeard?{text:'录音里出现“不能数七”和“少报了一个人”。录音没有确认人物身份，也没有给出录制时间，不能直接当作今晚的现场对话。',clip:'a2-recording-limit'}:{text:'完成六人的活动陈述后，再收听第二幕广播。录音尚未公开，先查看名册与停电记录。',clip:'a2-hint'};
 if(/七号房|门轴|油痕/.test(question))return s.known.includes('B06')?{text:actTwoClues[5].text+' '+actTwoClues[5].limit,action:'door'}:{text:'七号房尚未进入。可以先请程野陈述停电后的观察，再讨论门轴；当前不要推断开门者。',clip:'a2-hint'};
 return {text:'先记录停电与名册，再依次听取六人的活动，最后收听旧录音。个人回忆、镜头和现场观察要分开记录；当前材料不足以结案。',clip:'a2-hint'};
}
