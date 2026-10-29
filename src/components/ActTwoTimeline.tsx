import {useState} from 'react';
import {actTwoMembers,type ActTwoSave} from '@/lib/act-two';
const times=['20:10','20:35','20:46','20:50','21:05','21:07'];
const minutes=(t:string)=>Number(t.slice(0,2))*60+Number(t.slice(3,5));
function placeAt(m:typeof actTwoMembers[number],time:string){
 const n=minutes(time),segment=m.timeline.find(([span])=>{const [a,b]=span.split('—');return n>=minutes(a)&&n<minutes(b);});
 return (segment?.[1]??'—').split('；')[0].replace('一楼靠窗休息区，戴耳机听带回的磁带','一楼窗边 · 听磁带').replace('室外有顶棚连廊检查渗水','室外有顶棚连廊').replace('一楼检查配电箱','一楼配电箱');
}
/** Shared columns; a player's private preset is never substituted for their submitted text. */
export function ActTwoTimeline({save}:{save:ActTwoSave}){
 const [highlight,setHighlight]=useState('20:46');
 const nodes=[{time:'20:35',text:save.statements.some(m=>m.id==='tang')?'唐棠称与林见秋交谈':'交谈陈述尚未公开'},{time:'20:46',text:save.known.includes('B05')?'镜头拍到顾怀山进入值班室':'镜头尚未公开'},{time:'20:50',text:save.known.includes('B04')?'沈时安听见“东西还给我”':'声音观察尚未公开'}];
 return <><p className="panel-lead">同一列是同一时刻。点击关键节点，再沿这一列比对各人的陈述。</p><div className="a2-time-nodes">{nodes.map(n=><button key={n.time} aria-pressed={highlight===n.time} onClick={()=>setHighlight(n.time)}><strong>{n.time}</strong><span>{n.text}</span></button>)}</div><div className="a2-time-scroll" tabIndex={0} aria-label="横向滚动比对六人时间线"><table className="a2-time-table"><caption>六人公开活动 · 共用时间轴</caption><thead><tr><th scope="col">陈述者</th>{times.map(t=><th key={t} scope="col" className={highlight===t?'highlight':''}>{t}</th>)}</tr></thead><tbody>{actTwoMembers.map(m=>{const statement=save.statements.find(v=>v.id===m.id);return <tr key={m.id}><th scope="row">{m.name}<small>{m.id==='lin'?'你的陈述':'角色陈述'}</small></th>{!statement?<td colSpan={4}>尚未陈述，行程未公开。</td>:m.id==='lin'?<td colSpan={4} className="a2-time-own"><small>按你提交的原文保留，未自动推定位置</small>{statement.text}</td>:times.slice(0,4).map(t=><td key={t} className={highlight===t?'highlight':''}>{placeAt(m,t)}{t==='20:35'&&m.id==='tang'&&<em>称与林见秋交谈</em>}{t==='20:46'&&m.id==='zhou'&&save.known.includes('B05')&&<em>拍到顾怀山入室</em>}{t==='20:50'&&m.id==='shen'&&save.known.includes('B04')&&<em>听见“东西还给我”</em>}</td>)}<td>{save.known.includes('B01')?'全员在大厅':'未记录'}</td><td>{save.known.includes('B01')?'停电 · 楼上传来撞击':'未记录'}</td></tr>;})}</tbody></table></div><details className="a2-paper-hint"><summary>查看比对提示与原文</summary><p>表格按各人陈述整理，单个时刻不代表整段时间都被目击。20:46镜头没有连续拍摄后续。</p>{save.known.includes('B05')&&<p>周叙拍摄站位在原资料中有“大厅”和“一楼楼梯口”两种表述；镜头所见动作单独列出。</p>}{save.statements.map(s=><article key={s.id}><strong>{actTwoMembers.find(m=>m.id===s.id)?.name}</strong><p>{s.text}</p></article>)}</details></>;
}
