export type EvidenceId='song'|'stool'|'tape';
export type Evidence={id:EvidenceId;number:string;title:string;kind:string;text:string;note:string};
export const evidence:Evidence[]=[
 {id:'song',number:'01',title:'广播里的童谣',kind:'声音线索',text:'墙上的旧广播播放了一首童谣。具体内容以广播录音为准，仍需核对录音来源与播放者。',note:'不能仅凭歌声确认在场人数、任何人的身份，或把联想当作事实。'},
 {id:'stool',number:'02',title:'小木凳上的手印',kind:'现场物证',text:'餐桌主位下藏着一只儿童用的小木凳。积灰中央，留着一道新鲜的小手印。',note:'只能判断有人近期碰过。手印是谁留下的、是否属于孩子，尚未确认。'},
 {id:'tape',number:'03',title:'等待比对的磁带',kind:'公开资料 · 许知音',text:'许知音公开了邀请函附带的磁带。它与今晚的广播是否同一版本，尚未完成比对。',note:'没有证据证明两份录音相同、不同或经过剪接，也不能据此确认制作者。'}
];
export const broadcastText='墙上的旧广播正在播放一首童谣。';
export const opening='雨把山路冲成灰白色。二十年后，你再次走进白榆儿童之家的餐厅。墙角那只停用多年的广播，忽然传来了电流声。';
export type Reply={text:string;audio:string;action?:'stool'|'replay';evidence?:EvidenceId;label?:string};
const privateRequest=/忽略|系统提示|所有.*秘密|其他.*剧本|凶手|谁杀|真相|第[二三四五]幕|录像|名册/;
/** Explicit requests for the public tape clue use the same authored disclosure in both host modes. */
export function requestsTapeDisclosure(question:string){
 return !privateRequest.test(question)&&/许知音|磁带|音轨/.test(question);
}
/** First-act deterministic script. No model is called and later-act facts are excluded. */
export function replyTo(question:string,known:EvidenceId[]):Reply {
 if(privateRequest.test(question))return {text:'现在仍在第一幕。我们只讨论已经公开的信息，其他角色的私人记忆需要由本人决定是否讲述。',audio:'boundary'};
 if(requestsTapeDisclosure(question))return {text:'【演示许知音主动公开】“我带来了邀请函附的磁带，它与今晚广播是否同版，还需要比对。”目前不足以判断录音的来源或剪接过程。',audio:'tape',evidence:'tape',label:'许知音 · 公开资料'};
 if(/重[播放听]|再[听播放]|播放|童谣.*内容/.test(question))return {text:'我们再听一遍。以录音中的实际内容为准，留意声音，也留意自己的联想。',audio:'replay',action:'replay'};
 if(/桌[下底]|凳|手印|查看.*餐桌|搜.*餐桌/.test(question))return {text:known.includes('stool')?'你们看见凳面灰尘上的手印了。它能说明近期有人触碰过，却还不能说明是谁。':'先把目光移到餐桌下面。主位下，似乎还藏着一只小木凳。',audio:known.includes('stool')?'stool-known':'stool',action:'stool'};
 if(/许知音|磁带|停顿|两[个种]版本|剪[接辑]|一样|不同/.test(question))return {text:'【演示许知音主动公开】“我带来了邀请函附的磁带，它与今晚广播是否同版，还需要比对。”目前不足以判断录音的来源或剪接过程。',audio:'tape',evidence:'tape',label:'许知音 · 公开资料'};
 if(/梁|院长|顾怀山|谁.*播|谁.*开/.test(question))return {text:'梁素琴：“钥匙在桌上，先坐吧。广播是谁开的？我没亲眼看见。顾院长说明早会把档案交出来。”',audio:'liang',label:'梁素琴'};
 if(/七|六|人数|多[一了]|几个|几人/.test(question))return {text:'请以当前广播录音为准。不能仅凭童谣确定在场人数或任何人的身份，我们还需要独立的记录或证词。',audio:'numbers'};
 if(/线索|总结|发现|知道|提示|卡住|下一步/.test(question))return {text:known.includes('stool')?'你们已发现童谣和小木凳。可以问问许知音，今晚的广播与她带来的磁带是否相同。':'广播已经响过。你可以重听童谣，或者检查餐桌下面，寻找实物证据。',audio:known.includes('stool')?'hint-tape':'hint-stool'};
 return {text:'你可以重听童谣，查看餐桌下的小木凳，或问许知音关于磁带的事。',audio:'fallback'};
}
