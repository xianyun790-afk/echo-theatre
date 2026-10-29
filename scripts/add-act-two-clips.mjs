// One-off script data synchronization; no network calls.
import {build} from 'esbuild';
import {readFileSync,writeFileSync} from 'node:fs';
const bundle=await build({entryPoints:['src/lib/act-two.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {actTwoMembers,actTwoBoundary,actTwoRecording}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const config=JSON.parse(readFileSync('config/voices.json','utf8'));
const lines={
 'a2-opening-1':['narrator_host','九点零七分，灯灭了。二楼传来沉重的撞击。你们跟着手机的光上楼，值班室的门紧闭。顾怀山没有回应。'],
 'a2-opening-2':['narrator_host','程野撞开门。顾怀山倒在广播台旁，耳机挂在颈侧，茶杯碎了，手下压着一本旧名册。林见秋检查后请人呼叫急救和警方。'],
 'a2-blackout':['narrator_host','21点05分，六个人都已回到大厅。两分钟后，全楼停电，二楼传来撞击。没有人看见声响是怎样产生的。'],
 'a2-register':['narrator_host','名册被茶水浸湿。一行字仍可辨认：当晚实际在院人数，七。值班室的门已被撞开。'],
 'a2-boundary':['narrator_host',actTwoBoundary],
 'a2-private-boundary':['narrator_host','现在只讨论第二幕已经公开的观察。其他人的私人剧本与后续幕尚未公开；请先核对眼前的名册、时间线和录音。'],
 'a2-hint':['narrator_host','先记录停电与名册，再依次听取六人的活动，最后收听旧录音。个人回忆、镜头和现场观察要分开记录；当前材料不足以结案。'],
 'a2-timeline-hint':['narrator_host','21点05分六人已经回到大厅，21点07分停电并传来撞击。个人活动是各自陈述，不是完整的不在场证明。请逐一听取，再把交叉观察对齐。'],
 'a2-recording-limit':['narrator_host','录音里出现不能数七和少报了一个人。录音没有确认人物身份，也没有给出录制时间，不能直接当作今晚的现场对话。'],
 'a2-statements':['narrator_host','先从林见秋开始，说说20点10分以后你去了哪里。其他人依次陈述。正文会留在这里，按下一位再继续。'],
 'a2-liang':['liang','山路有一处塌方，警方正在绕行。先到餐厅等。'],
 'a2-door':['narrator_host','走廊尽头，七号房的门不知何时开了一条缝。没有人看见是谁打开的。你已经整理出一条查证方向。本次试玩到这里，先保存调查记录。'],
 'a2-wet-shoes':['narrator_host','20点10分，顾怀山上楼时，我看见鞋底留下水痕。停车处到大厅有雨棚。'],
 'a2-oil':['narrator_host','七号房门轴上的新油痕，是程野公开的观察。有人维护过，不等于现在知道是谁，也不等于知道维护的时间。'],
};
for(const m of actTwoMembers)lines['a2-statement-'+m.id]=[m.role,m.text];
for(const [i,line] of actTwoRecording.entries())lines[line.clip]=[i%2===0?'tang':'xu',line.text];
for(const [id,[role,text]] of Object.entries(lines))config.clips[id]={role,text,id:id.toUpperCase()};
config.notes=(config.notes||'')+'；a2-前缀为第二幕固定演绎台词，按NIA角色映射预生成。';
writeFileSync('config/voices.json',JSON.stringify(config,null,2)+'\n');
console.log(Object.keys(lines).join(' '));
const {actTwoClues,actTwoEnding}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const facts=Object.fromEntries(actTwoClues.map(c=>[c.id,c.text+' '+c.limit]));
for(const m of actTwoMembers)facts['ST_'+m.id]=m.id==='lin'?'林见秋已提交个人活动陈述；以近期公开对话为准，不能把玩家猜测当成事实。':m.text;
facts.RADIO02=actTwoRecording.map(r=>r.who+'：'+r.text).join('；')+' 仅为旧录音内容，不确认声音身份及录制时间。';facts.ENDING02=actTwoEnding;
writeFileSync('config/act-two-public.json',JSON.stringify({facts},null,2)+'\n');
