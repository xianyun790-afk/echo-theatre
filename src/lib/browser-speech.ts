type SpeechResult={isFinal:boolean;[index:number]:{transcript:string}};
type SpeechEvent={results:ArrayLike<SpeechResult>};
export interface RecognitionEngine {
 lang:string;continuous:boolean;interimResults:boolean;maxAlternatives:number;
 onstart:(()=>void)|null;onresult:((event:SpeechEvent)=>void)|null;
 onerror:((event:{error:string})=>void)|null;onend:(()=>void)|null;
 start():void;abort():void;
}
export type RecognitionConstructor=new()=>RecognitionEngine;
export type SpeechState='idle'|'starting'|'listening';
type Callbacks={onState:(state:SpeechState)=>void;onInterim:(text:string)=>void;onFinal:(text:string)=>void;onError:(message:string)=>void};
export function recognitionConstructor():RecognitionConstructor|undefined {
 const browser=window as unknown as {SpeechRecognition?:RecognitionConstructor;webkitSpeechRecognition?:RecognitionConstructor};
 return browser.SpeechRecognition??browser.webkitSpeechRecognition;
}
const errors:Record<string,string>={
 'not-allowed':'麦克风或语音识别权限未开启。允许后可重试，也可以直接输入。',
 'service-not-allowed':'当前浏览器不允许使用语音识别服务，请直接输入问题。',
 'audio-capture':'没有找到可用的麦克风，请检查设备后重试。',
 'network':'浏览器语音识别服务连接失败，请重试或直接输入。',
 'no-speech':'没有听清你的问题，请再说一次，也可以直接输入。',
 'language-not-supported':'当前识别服务不支持中文，请直接输入问题。'
};

/** Real browser ASR only. Each completed utterance is submitted once. */
export class BrowserSpeechSession {
 private engine:RecognitionEngine|null=null;
 private generation=0;
 constructor(private callbacks:Callbacks,private Engine?:RecognitionConstructor){}
 start(){
  if(this.engine)return;
  if(!this.Engine){this.callbacks.onError('当前浏览器不支持语音识别。文字可直接发送，公司语音接口尚未接入。');return;}
  const engine=new this.Engine(),token=++this.generation;this.engine=engine;
  engine.lang='zh-CN';engine.continuous=false;engine.interimResults=true;engine.maxAlternatives=1;
  const current=()=>token===this.generation&&this.engine===engine;
  engine.onstart=()=>{if(current())this.callbacks.onState('listening');};
  engine.onresult=event=>{
   if(!current())return;let final='',interim='';
   for(let i=0;i<event.results.length;i++){const result=event.results[i];if(result.isFinal)final+=result[0]?.transcript??'';else interim+=result[0]?.transcript??'';}
   this.callbacks.onInterim((final+interim).trim());
   if(final.trim()){this.stop();this.callbacks.onFinal(final.trim());}
  };
  engine.onerror=event=>{if(!current())return;this.stop();if(event.error!=='aborted')this.callbacks.onError(errors[event.error]??'语音识别暂时不可用，请重试或直接输入。');};
  engine.onend=()=>{if(!current())return;this.stop();this.callbacks.onError(errors['no-speech']);};
  this.callbacks.onState('starting');
  try{engine.start();}catch{this.stop();this.callbacks.onError('无法启动语音识别，请检查浏览器权限后重试。');}
 }
 stop(){
  this.generation++;const engine=this.engine;this.engine=null;
  if(engine){engine.onstart=null;engine.onresult=null;engine.onerror=null;engine.onend=null;try{engine.abort();}catch{}}
  this.callbacks.onState('idle');
 }
}
