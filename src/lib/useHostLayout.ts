import {useLayoutEffect,type RefObject} from 'react';
/** Reserve the actual host height, including connection errors, above its fixed bottom dock. */
export function useHostLayout(root:RefObject<HTMLElement|null>,active:boolean){
 useLayoutEffect(()=>{
  const game=root.current;if(!game||!active)return;
  let host:Element|null=null;
  const update=()=>{if(host)game.style.setProperty('--host-height',`${host.getBoundingClientRect().height}px`);};
  const resize=new ResizeObserver(update);
  const find=()=>{const next=game.querySelector('.host-conversation');if(next===host)return;if(host)resize.unobserve(host);host=next;if(host){resize.observe(host);update();}};
  const mutations=new MutationObserver(find);mutations.observe(game,{childList:true,subtree:true});find();
  return()=>{resize.disconnect();mutations.disconnect();game.style.removeProperty('--host-height');};
 },[root,active]);
}
