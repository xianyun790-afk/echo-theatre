import {useEffect,useId,useRef,type ReactNode} from 'react';
import {X} from 'lucide-react';
export function Panel({title,kicker,children,onClose}:{title:string;kicker:string;children:ReactNode;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 const titleId=useId();
 const surfaceKey=kicker.toLowerCase().replace(/[^a-z0-9]+/g,'-');
 useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
 return <dialog ref={ref} className="panel" data-panel-kind={surfaceKey} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target!==e.currentTarget)return;const box=e.currentTarget.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)onClose();}} aria-labelledby={titleId}><div className="panel-inner"><header className="panel-header"><div><span className="eyebrow" data-type-surface={`panel-${surfaceKey}-eyebrow`}>{kicker}</span><h2 id={titleId} data-type-surface={`panel-${surfaceKey}-title`}>{title}</h2></div><button className="icon-button" aria-label="关闭面板" onClick={onClose}><X size={20}/></button></header><div className="panel-body">{children}</div><div className="archive-folio" aria-hidden="true"><span>白榆儿童之家 · 调查手记</span><i/><span>ACT I</span></div></div></dialog>;
}
