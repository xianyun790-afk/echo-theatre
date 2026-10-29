import {actTwoDeduction} from '@/lib/act-two-deduction';
import type {ActTwoSave} from '@/lib/act-two';
export function ActTwoDeduction({save,onCompare}:{save:ActTwoSave;onCompare?:()=>void}){
 const r=actTwoDeduction(save);
 return <section className="a2-deduction" aria-label="你的推理反馈"><p className="a2-deduction-question">你的疑问：{r.question}</p><h3>{r.title}</h3><p>{r.response}</p><h4>可以援引的公开依据</h4>{r.supports.length?r.supports.map(c=><article key={c.id}><strong>{c.id==='RADIO02'?'录音':c.id==='ST_xu'?'许知音':c.id}</strong><p>{c.text}</p></article>):<p>当前还没有记录与这个方向相关的公开材料。</p>}<h4>还缺哪一环</h4><p>{r.missing}</p><h4>本幕现在能做的核对</h4><p>{r.next}</p>{onCompare&&<button className="text-link" onClick={onCompare}>打开公开时间线与原文</button>}</section>;
}
