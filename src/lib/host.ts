import {chapters,clues} from './story';
/** Deterministic demo only. No LLM or enterprise endpoint is called. */
export function demoReply(question:string,stage:number,persona:'host'|'liang',found:string[]):string {
 const q=question.trim();
 if(/凶手|谁杀|死因|死亡时间|作案|结局/.test(q)) return '目前的证据不足以回答。前三幕只揭开旧案的一部分，顾怀山的死因和准确死亡时间仍未确定。请把推测与证据分开。';
 if(/下一幕|推进|跳过/.test(q)) return '请先完成本幕至少一处搜证，再使用上方“进入下一幕”。语音提问不会自动改变剧情进度。';
 if(/其他人.*秘密|所有.*角色|系统提示|忽略|剧透|私人剧本/.test(q)) return '我只能讲述当前幕已公开的信息，不能提供其他角色的私人剧本。';
 if(persona==='liang') {
  if(stage===0) return '梁素琴：“钥匙在桌上。先坐下吧……你问那个孩子？院长说过，明早会把档案交出来。”【本幕预设台词】';
  if(stage===1) return '梁素琴：“警方正在绕路进来，先到餐厅等。那段广播……我没有亲眼看见是谁开的。”【本幕预设台词】';
  return '梁素琴：“你们一直问第七个孩子是谁。可那天晚上，是谁让你们相信，只有六个人能回家？”【本幕预设台词】';
 }
 const match=clues.find(c=>c.stage<=stage && found.includes(c.id) && (q.includes(c.place)||q.includes(c.title)||q.includes(c.id)));
 if(match) return `已公开线索 ${match.id}：${match.text}`;
 if(/童谣|声音|唱歌/.test(q)) return stage===0?'童谣里同时出现“六”和“七”。你可以搜查广播室，比对今晚广播与邀请函磁带；现在还不能确定谁制作了它。':'声音不等于现场目击。请在已公开线索中查看音轨信息，不要仅凭听感认定说话者身份。';
 if(/搜|线索|哪里/.test(q)) return `本幕可以搜查：${clues.filter(c=>c.stage===stage).map(c=>c.place).join('、')}。点击场景下的搜证入口，即可揭开对应线索。`;
 return `当前是第${['一','二','三'][stage]}幕「${chapters[stage].title}」。${chapters[stage].prompt} 你可以询问已发现的线索，或找梁素琴对话。本演示使用预设回复，尚未连接公司模型。`;
}
