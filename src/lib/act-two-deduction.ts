import {type ActTwoSave,type ActTwoClueId} from './act-two';
/** A response to the player's question, using only recorded public observations. */
export function actTwoDeduction(s:ActTwoSave){
 const focus=s.deduction?.focus??s.focus,question=s.deduction?.question??s.question;
 const topic=/名册|人数|书写|写下|谁写|B02/i.test(question)?'register':/录音|磁带|音轨|门轴|油痕|B06/i.test(question)?'recording':/20:|21:|时间|撞击|停电|死亡|B01|B04|B05/i.test(question)?'time':focus;
 const ids:Record<string,ActTwoClueId[]>={time:['B01','B05','B04'],register:['B02'],recording:['B06']};
 const chosen=[...new Set([...(ids[topic]??[]),...(ids[focus]??[])])].filter(id=>s.known.includes(id));
 const brief:Record<string,string>={B01:'21:05全员回到大厅；21:07停电并听到二楼撞击。',B02:'名册可辨文字：“当晚实际在院人数：七。”',B04:'沈时安称20:50听到“东西还给我”，未看见说话对象。',B05:'周叙的20:46短镜头拍到顾怀山进入值班室。',B06:'程野看到门轴有新油痕，他去年加固时未给门轴上油。'};
 const supports:{id:string;text:string}[]=chosen.map(id=>({id,text:brief[id]}));
 if(topic==='register'&&s.recordingHeard)supports.push({id:'RADIO02',text:'录音里说“少报了一个人”；名册则写“当晚实际在院人数：七”。两份材料都提到了人数。'});
 if(topic==='recording'&&s.recordingHeard)supports.push({id:'RADIO02',text:'录音出现“不能数七”和“少报了一个人”。'});
 if(topic==='recording'&&s.statements.some(m=>m.id==='xu'))supports.push({id:'ST_xu',text:'许知音的公开陈述：她收到的磁带与今晚广播不是同一份音轨。'});
 const result=topic==='register'?{
  title:'人数记录值得继续核对',
  response:/谁|写|何时|什么时候|时间/.test(question)?'你把问题落在了登记人或写入时间上。这正是名册还缺的一环；眼前可先核对名册“七”与录音“少报一个人”的措辞。':'你抓住了两份人数记录之间的关联。先比较“实际在院”与“少报”各指什么，再提出需要查明的登记依据。',
  missing:'登记人、书写时间和原始登记依据。本试玩没有提供这些新材料，继续问主持人也不会解锁答案。',
  next:'现在可把B02的原文与录音最后一句并排核对，记下两者是否真指同一晚。',
 }:topic==='time'?{
  title:'时间问题已经有了比对锚点',
  response:/20:46|20:50|镜头|声音/.test(question)?'你的问题抓住了20:46镜头与20:50声音之间的空档。把周叙与沈时安两行放到同一时间轴上，可以看出目前的记录没有连续覆盖这段时间。':'你选择先拆开事件的先后顺序。20:46的镜头、20:50的声音与21:07的撞击来自不同观察，值得分别核对。',
  missing:'撞击发生过程的目击或连续记录，以及独立的死亡时间依据。这些材料在本试玩中尚未提供。',
  next:'现在可在时间线对齐20:46与20:50，再单独标出21:07；先写出中间哪一段没有连续记录。',
 }:{
  title:'声音与维护痕迹形成了两条查证线',
  response:/门轴|油|维护|谁/.test(question)?'你把追问放在维护痕迹上。程野的观察提供了新油痕这一线索；录音与磁带的差异则是另一条独立线索，可以分别列出来源。':'你注意到了音轨差异。把许知音的陈述、广播原文与门轴记录分开整理，可以避免把两条线过早接成一个故事。',
  missing:'录音制作人与录制日期、门轴维护人与维护时间。本试玩没有提供可继续解锁的相关档案。',
  next:'现在可回看许知音、程野的陈述与B06，分别记下“听到的”“看到的”和仍待确认的来源。',
 };
 return {...result,question,focus,supports:supports.slice(0,5),topic};
}
