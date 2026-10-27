export type PlaybackOptions={retryOnGesture?:boolean;onStart?:()=>void;onEnded?:()=>void;kind?:'voice'|'music';leadInMs?:number};
// Invalidate browser-cached renders when the narration profile changes.
const VOICE_REVISION='nia-cast-v1-20261021';
function fadeVolume(audio:HTMLAudioElement,target:number,duration:number,done?:()=>void){
 const from=audio.volume,began=Date.now();
 const timer=setInterval(()=>{
  const t=Math.min(1,(Date.now()-began)/duration);
  audio.volume=from+(target-from)*(t*t*(3-2*t));
 },16);
 const end=setTimeout(()=>{clearInterval(timer);audio.volume=target;done?.();},duration);
 return ()=>{clearInterval(timer);clearTimeout(end);};
}

/** One foreground voice/song for the page. Background preference is independent of temporary silence. */
export class SceneAudio {
 private static instances=new Set<SceneAudio>();
 private static changingForeground=false;
 private background:HTMLAudioElement|null=null;
 private backgroundStart:Promise<void>|null=null;
 private backgroundFade:(()=>void)|null=null;
 private backgroundRestore:ReturnType<typeof setTimeout>|null=null;
 private backgroundTarget:number|null=null;
 private microphoneActive=false;
 private backgroundSuppressed=false;
 private player:HTMLAudioElement|null=null;
 private playerKind:'voice'|'music'|null=null;
 private clean:((immediate?:boolean)=>void)|null=null;
 private tails=new Set<()=>void>();
 muted=false;
 constructor(){SceneAudio.instances.add(this);}
 private static backgroundBlocked(){
  return [...this.instances].some(instance=>instance.backgroundSuppressed||instance.microphoneActive||(instance.player!==null&&instance.playerKind==='music'));
 }
 private cancelBackgroundFade(){this.backgroundFade?.();this.backgroundFade=null;if(this.backgroundRestore)clearTimeout(this.backgroundRestore);this.backgroundRestore=null;}
 private static updateBackgrounds(){
  if(this.changingForeground)return;
  const speaking=[...this.instances].some(instance=>instance.player!==null);
  const blocked=this.backgroundBlocked();
  for(const instance of this.instances){
   const music=instance.background;if(!music)continue;
   if(blocked){instance.cancelBackgroundFade();instance.backgroundTarget=null;music.pause();music.volume=0;continue;}
   const target=speaking?0.04:0.32;
   if(instance.backgroundTarget!==target){
    instance.cancelBackgroundFade();instance.backgroundTarget=target;
    const fade=()=>{if(instance.background!==music||this.backgroundBlocked())return;instance.backgroundFade=fadeVolume(music,target,speaking?180:700);};
    // A short hold prevents the score swelling between consecutive spoken lines.
    if(speaking)fade();else instance.backgroundRestore=setTimeout(fade,450);
   }
   if(!music.paused||instance.backgroundStart)continue;
   let retry=false;
   const pending=music.play().then(()=>{
    retry=true;
    if(instance.background!==music||this.backgroundBlocked())music.pause();
   }).catch((error:unknown)=>{
    retry=error instanceof Error&&error.name==='AbortError';throw error;
   }).finally(()=>{
    if(instance.backgroundStart!==pending)return;
    instance.backgroundStart=null;
    if(retry&&instance.background===music&&music.paused&&!this.backgroundBlocked())this.updateBackgrounds();
   });
   instance.backgroundStart=pending;
   void pending.catch(()=>{});
  }
 }
 setMicrophoneActive(active:boolean){
  this.microphoneActive=active;
  if(active)for(const instance of SceneAudio.instances){instance.stop(true);for(const finish of [...instance.tails])finish();}
  SceneAudio.updateBackgrounds();
 }
 setBackgroundSuppressed(active:boolean){this.backgroundSuppressed=active;SceneAudio.updateBackgrounds();}
 async setBackground(enabled:boolean){
  if(!enabled){this.cancelBackgroundFade();this.backgroundTarget=null;this.background?.pause();this.background?.remove();this.background=null;this.backgroundStart=null;return;}
  if(this.background)return;
  for(const instance of SceneAudio.instances)if(instance!==this)void instance.setBackground(false);
  const music=new Audio('/audio/background-music.mp3');music.volume=0;music.loop=true;music.muted=this.muted;music.hidden=true;music.setAttribute('aria-hidden','true');music.setAttribute('data-audio-kind','background');document.body.append(music);this.background=music;
  SceneAudio.updateBackgrounds();
  try{await this.backgroundStart;}catch{if(this.background===music){void this.setBackground(false);throw new Error('背景音乐暂时无法播放，请重试。');}}
 }
 setMuted(muted:boolean){this.muted=muted;if(this.player)this.player.muted=muted;if(this.background)this.background.muted=muted;if(muted)for(const finish of this.tails)finish();}
 stop(immediate=false){
  const clean=this.clean;this.clean=null;this.player=null;this.playerKind=null;
  clean?.(immediate||[...SceneAudio.instances].some(instance=>instance.microphoneActive));
  SceneAudio.updateBackgrounds();
 }
 play(name:string,progress?:(ratio:number)=>void,role?:string,options?:PlaybackOptions):Promise<void>{
  return this.playFile(`/api/tts/${encodeURIComponent(name)}?v=${VOICE_REVISION}${role?'&speaker='+encodeURIComponent(role):''}`,progress,options);
 }
 playFile(src:string,progress?:(ratio:number)=>void,options?:PlaybackOptions):Promise<void>{
  const switching=SceneAudio.changingForeground;SceneAudio.changingForeground=true;
  try{for(const instance of SceneAudio.instances)instance.stop();}finally{SceneAudio.changingForeground=switching;}
  const audio=new Audio(src);audio.volume=options?.kind==='music'?0:1;audio.muted=this.muted;audio.preload='auto';audio.hidden=true;audio.setAttribute('aria-hidden','true');audio.setAttribute('data-audio-kind',options?.kind||'voice');audio.setAttribute('data-audio-state','preparing');document.body.append(audio);
  this.player=audio;this.playerKind=options?.kind||'voice';SceneAudio.updateBackgrounds();
  return new Promise((resolve,reject)=>{
   let settled=false,cancelled=false,starting=false,started=false;
   let ramp:(()=>void)|null=null,lead:ReturnType<typeof setTimeout>|null=null,deadline:ReturnType<typeof setTimeout>|null=null;
   const removeGestures=()=>{document.removeEventListener('pointerdown',tryPlay,{capture:true});document.removeEventListener('keydown',tryPlay,{capture:true});};
   const clearTimers=()=>{if(lead)clearTimeout(lead);if(deadline)clearTimeout(deadline);ramp?.();ramp=null;};
   const finish=(error?:Error)=>{
    if(settled)return;settled=true;clearTimers();removeGestures();audio.pause();
    audio.removeEventListener('timeupdate',time);audio.removeEventListener('ended',end);audio.removeEventListener('error',fail);audio.remove();
    audio.removeAttribute('src');audio.load();this.tails.delete(finish);
    if(this.player===audio){this.player=null;this.playerKind=null;this.clean=null;}
    SceneAudio.updateBackgrounds();if(error)reject(error);else resolve();
   };
   const cancel=(immediate=false)=>{
    if(settled||cancelled)return;cancelled=true;clearTimers();removeGestures();
    if(immediate||!started||audio.paused){finish();return;}
    this.tails.add(finish);ramp=fadeVolume(audio,0,140,finish);
   };
   const end=()=>{
    if(settled||cancelled)return;
    const switching=SceneAudio.changingForeground;SceneAudio.changingForeground=true;
    try{finish();options?.onEnded?.();}finally{SceneAudio.changingForeground=switching;SceneAudio.updateBackgrounds();}
   };
   const time=()=>{
    if(audio.duration)progress?.(audio.currentTime/audio.duration);
    const remaining=audio.duration-audio.currentTime;
    const tail=0.7;
    if(options?.kind==='music'&&started&&!cancelled&&Number.isFinite(remaining)&&remaining>=0&&remaining<tail){ramp?.();ramp=null;audio.volume=Math.min(audio.volume,remaining/tail);}
   };
   const fail=()=>{if(!cancelled)finish(new Error('语音暂时无法播放，可继续阅读字幕或重新触发。'));};
   const tryPlay=()=>{
    if(settled||cancelled||starting)return;starting=true;
    deadline=setTimeout(()=>finish(new Error('语音加载超时，已取消播放。请重试或继续阅读字幕。')),18000);
    void audio.play().then(()=>{
     starting=false;if(settled||cancelled){audio.pause();return;}
     if(deadline)clearTimeout(deadline);deadline=null;started=true;removeGestures();audio.setAttribute('data-audio-state','playing');
     // Speech is already padded locally. Start at full level before play() so
     // asynchronous playback startup cannot swallow the first syllable.
     if(options?.kind==='music')ramp=fadeVolume(audio,1,1000);options?.onStart?.();
    }).catch((error:unknown)=>{
     starting=false;if(deadline)clearTimeout(deadline);deadline=null;if(settled||cancelled)return;
     if(options?.retryOnGesture&&error instanceof Error&&error.name==='NotAllowedError'){
      document.addEventListener('pointerdown',tryPlay,{capture:true});document.addEventListener('keydown',tryPlay,{capture:true});
     }else fail();
    });
   };
   this.clean=cancel;audio.addEventListener('timeupdate',time);audio.addEventListener('ended',end);audio.addEventListener('error',fail);
   // Subtitles appear before the voice; outgoing speech has time to fade out fully.
   lead=setTimeout(tryPlay,options?.leadInMs??(options?.kind==='music'?450:320));
  });
 }
 async destroy(){void this.setBackground(false);this.microphoneActive=false;this.stop(true);for(const finish of [...this.tails])finish();SceneAudio.instances.delete(this);SceneAudio.updateBackgrounds();}
}
