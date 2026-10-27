import {test,beforeEach,afterEach,mock} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/lib/audio.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const {SceneAudio}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
class FakeAudio extends EventTarget {
 static last;static playbackError=null;static pending=null;
 constructor(src){super();this.src=src;this.volume=1;this.duration=26;this.currentTime=0;this.muted=false;this.paused=true;FakeAudio.last=this;}
 play(){this.playCalls=(this.playCalls||0)+1;if(FakeAudio.pending)return FakeAudio.pending;if(FakeAudio.playbackError)return Promise.reject(FakeAudio.playbackError);this.paused=false;return Promise.resolve();}
 pause(){this.paused=true;}
 setAttribute(){}
 removeAttribute(){}
 load(){this.aborted=true;}
 remove(){document.elements=document.elements.filter(element=>element!==this);}
}
class FakeDocument extends EventTarget {elements=[];body={append:element=>this.elements.push(element)};}
globalThis.Audio=FakeAudio;
let players=[];
function make(){const player=new SceneAudio();players.push(player);return player;}
async function advance(ms){let remaining=ms;do{const step=Math.min(16,remaining);mock.timers.tick(step);remaining-=step;for(let i=0;i<8;i++)await Promise.resolve();}while(remaining>0);}
async function end(track,promise){track.dispatchEvent(new Event('ended'));await promise;await advance(0);}
beforeEach(()=>{mock.timers.enable({apis:['setTimeout','setInterval','Date']});globalThis.document=new FakeDocument();FakeAudio.playbackError=null;FakeAudio.pending=null;players=[];});
afterEach(async()=>{for(const player of players)await player.destroy();mock.timers.reset();});

test('speech keeps the subtitle lead-in but reaches full volume before the initial consonant can begin',async()=>{
 const room=make();let starts=0,ratio=0;
 const done=room.play('stool',v=>ratio=v,undefined,{onStart:()=>starts++});const speech=FakeAudio.last;
 assert.equal(speech.volume,1);assert.equal(speech.paused,true);
 await advance(319);assert.equal(starts,0);
 await advance(1);assert.equal(starts,1);assert.equal(speech.paused,false);assert.equal(speech.volume,1);
 await advance(16);assert.equal(speech.volume,1);
 await advance(4);assert.equal(speech.volume,1);
 assert.match(speech.src,/\/api\/tts\/stool\?v=nia-cast-v1-/);
 speech.currentTime=13;speech.dispatchEvent(new Event('timeupdate'));assert.equal(ratio,.5);
 speech.currentTime=25.98;speech.dispatchEvent(new Event('timeupdate'));assert.equal(speech.volume,1);
 await end(speech,done);assert.equal(speech.paused,true);assert.equal(document.elements.length,0);
});
test('background fades in, ducks before the voice, holds through a brief gap and then restores smoothly',async()=>{
 const room=make();await room.setBackground(true);const music=FakeAudio.last;
 assert.equal(music.volume,0);assert.equal(music.loop,true);
 await advance(450);await advance(700);assert.equal(music.volume,.32);
 const done=room.play('stool');const speech=FakeAudio.last;
 await advance(180);assert.ok(Math.abs(music.volume-.04)<.00001);assert.equal(speech.paused,true);
 await advance(140);await end(speech,done);assert.ok(Math.abs(music.volume-.04)<.00001);
 await advance(449);assert.ok(Math.abs(music.volume-.04)<.00001);
 await advance(1);await advance(350);assert.ok(music.volume>.04&&music.volume<.32);
 await advance(350);assert.equal(music.volume,.32);
});
test('a new voice waits for the previous one to fade out and never overlaps it',async()=>{
 const room=make(),council=make();const first=room.play('stool');const old=FakeAudio.last;
 await advance(600);assert.equal(old.volume,1);assert.equal(old.paused,false);
 const second=council.play('council-xu');const next=FakeAudio.last;
 assert.equal(next.paused,true);await advance(70);assert.ok(old.volume>0&&old.volume<1);
 await advance(80);await first;assert.equal(old.paused,true);assert.equal(next.paused,true);
 await advance(170);assert.equal(next.paused,false);assert.equal(document.elements.includes(old),false);
 await end(next,second);
});
test('rapid scene changes cancel voices before they start and remove their pending media requests',async()=>{
 const room=make();let staleStarts=0;
 const old=room.play('n05-rain-window',undefined,undefined,{onStart:()=>staleStarts++});const stale=FakeAudio.last;
 const next=room.play('n06-old-cabinet');const current=FakeAudio.last;await old;
 await advance(2000);assert.equal(staleStarts,0);assert.equal(stale.playCalls||0,0);assert.equal(stale.aborted,true);assert.equal(current.paused,false);
 await end(current,next);
});
test('load timeout cancels a late voice so it cannot suddenly appear after the user has moved on',async()=>{
 const room=make();let resume,starts=0;FakeAudio.pending=new Promise(resolve=>resume=resolve);
 const done=room.play('stool',undefined,undefined,{onStart:()=>starts++});const speech=FakeAudio.last;
 const rejected=assert.rejects(done,/加载超时/);await advance(320);await advance(18000);await rejected;
 resume();await advance(0);assert.equal(starts,0);assert.equal(speech.paused,true);assert.equal(speech.aborted,true);
});
test('opening retries blocked autoplay on a gesture using the same track and no second start',async()=>{
 const room=make();let starts=0;FakeAudio.playbackError=Object.assign(new Error('gesture required'),{name:'NotAllowedError'});
 const done=room.playFile('/audio/opening-song.mp3',undefined,{kind:'music',retryOnGesture:true,onStart:()=>starts++});const song=FakeAudio.last;
 await advance(450);assert.equal(starts,0);FakeAudio.playbackError=null;
 document.dispatchEvent(new Event('pointerdown'));await advance(0);assert.equal(starts,1);assert.equal(song.playCalls,2);assert.equal(song.volume,0);
 await advance(1000);assert.equal(song.volume,1);song.currentTime=8;document.dispatchEvent(new Event('keydown'));await advance(0);assert.equal(song.playCalls,2);assert.equal(song.currentTime,8);
 await end(song,done);
});
test('cancelled opening removes gesture retries and cannot resurrect itself on a later click',async()=>{
 const room=make();FakeAudio.playbackError=Object.assign(new Error('gesture required'),{name:'NotAllowedError'});
 const done=room.playFile('/audio/opening-song.mp3',undefined,{retryOnGesture:true});const song=FakeAudio.last;
 await advance(320);room.stop();await done;FakeAudio.playbackError=null;
 document.dispatchEvent(new Event('pointerdown'));await advance(1000);assert.equal(song.playCalls,1);assert.equal(song.paused,true);
});
test('song and background remain exclusive; radio replay resumes the same background position',async()=>{
 const room=make();const done=room.playFile('/audio/opening-song.mp3',undefined,{kind:'music'});const song=FakeAudio.last;
 await room.setBackground(true);const music=FakeAudio.last;await advance(1500);
 assert.equal(music.paused,true);assert.equal(music.volume,0);assert.equal(song.paused,false);
 await end(song,done);await advance(450);await advance(700);assert.equal(music.paused,false);assert.equal(music.volume,.32);music.currentTime=9;
 const replay=room.playFile('/audio/opening-song.mp3',undefined,{kind:'music'});const radio=FakeAudio.last;
 assert.equal(music.paused,true);assert.equal(music.volume,0);await advance(450);await end(radio,replay);
 assert.equal(music.paused,false);assert.equal(music.currentTime,9);assert.equal(music.volume,0);
});
test('natural song completion chains narration once with no background surge; interruption does not chain',async()=>{
 const room=make();let narration,starts=0;await room.setBackground(true);const music=FakeAudio.last;
 const options={kind:'music',onEnded:()=>{starts++;narration=room.play('n01-return');}};
 const song=room.playFile('/audio/opening-song.mp3',undefined,options);const track=FakeAudio.last;
 await advance(450);await end(track,song);const speech=FakeAudio.last;
 assert.equal(starts,1);assert.equal(track.paused,true);assert.equal(music.volume,0);
 await advance(180);assert.ok(Math.abs(music.volume-.04)<.00001);assert.equal(speech.paused,true);
 track.dispatchEvent(new Event('ended'));assert.equal(starts,1);await advance(140);await end(speech,narration);
 const interrupted=room.playFile('/audio/opening-song.mp3',undefined,options);room.stop();await interrupted;assert.equal(starts,1);
});
test('microphone immediately silences music, current voice and outgoing fades, including across replies',async()=>{
 const room=make(),host=make();await room.setBackground(true);const music=FakeAudio.last;
 const first=room.play('stool');const old=FakeAudio.last;await advance(600);
 const second=host.play('hint-tape');const pending=FakeAudio.last;
 room.setMicrophoneActive(true);await first;await second;
 assert.equal(old.paused,true);assert.equal(pending.paused,true);assert.equal(music.paused,true);assert.equal(music.volume,0);
 const reply=host.play('hint-stool');const speech=FakeAudio.last;await advance(600);assert.equal(speech.paused,false);assert.equal(music.paused,true);
 await end(speech,reply);assert.equal(music.paused,true);room.setMicrophoneActive(false);await advance(450);await advance(700);assert.equal(music.volume,.32);
});
test('council stays silent between turns and restores the same background track only on leaving',async()=>{
 const room=make(),council=make();await room.setBackground(true);const music=FakeAudio.last;music.currentTime=12;
 council.setBackgroundSuppressed(true);const done=council.play('council-xu');const speech=FakeAudio.last;
 await advance(600);assert.equal(speech.paused,false);assert.equal(speech.muted,false);assert.equal(music.paused,true);
 await end(speech,done);await advance(2000);assert.equal(music.paused,true);await council.destroy();await advance(450);await advance(700);
 assert.equal(music.paused,false);assert.equal(music.volume,.32);assert.equal(music.currentTime,12);
});
test('temporary silence preserves background off and master mute preferences',async()=>{
 const room=make(),council=make();await room.setBackground(true);const music=FakeAudio.last;room.setMuted(true);
 council.setBackgroundSuppressed(true);await council.destroy();assert.equal(music.muted,true);
 const next=make();next.setBackgroundSuppressed(true);await room.setBackground(false);await next.destroy();await advance(2000);assert.equal(music.paused,true);assert.equal(document.elements.includes(music),false);
});
test('destroy removes pending starts, active fades, media elements and microphone suppression',async()=>{
 const room=make(),host=make();await room.setBackground(true);const music=FakeAudio.last;host.setMicrophoneActive(true);
 const done=host.play('stool');const speech=FakeAudio.last;await host.destroy();await done;await advance(1500);
 assert.equal(speech.playCalls||0,0);assert.equal(speech.aborted,true);assert.equal(music.volume,.32);
 await room.destroy();await advance(2000);assert.equal(document.elements.length,0);assert.equal(music.paused,true);
});
test('rejected playback reports an error without continuing or retrying background in a loop',async()=>{
 const room=make();FakeAudio.playbackError=new Error('unavailable');
 await assert.rejects(room.setBackground(true),/背景音乐/);const music=FakeAudio.last;await advance(2000);assert.equal(music.playCalls,1);
 const done=room.play('stool');const failure=assert.rejects(done,/无法播放/);await advance(320);await failure;
});
test('repeated background enable requests and changing owners never leave two loops playing',async()=>{
 const room=make(),other=make();await room.setBackground(true);const first=FakeAudio.last;
 await room.setBackground(true);assert.equal(FakeAudio.last,first);assert.equal(first.playCalls,1);
 await other.setBackground(true);const second=FakeAudio.last;assert.equal(first.paused,true);assert.equal(document.elements.includes(first),false);assert.equal(second.paused,false);
});
