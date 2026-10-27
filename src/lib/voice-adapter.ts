/** Integration contract proposal, not the company's actual API. Never put permanent credentials in browser code. */
export type VoiceStatus='disconnected'|'connecting'|'listening'|'thinking'|'speaking'|'reconnecting'|'error';
export type VoiceEvent = {type:'transcript';text:string;final:boolean}|{type:'reply';text:string;utteranceId:string}|{type:'audio';chunk:ArrayBuffer;utteranceId:string}|{type:'status';status:VoiceStatus}|{type:'error';message:string};
export interface CompanyVoiceAdapter {
 connect(options:{sessionToken:string;roomId:string;playerId:string;signal:AbortSignal}):Promise<void>;
 sendAudio(chunk:ArrayBuffer):void;
 sendText(text:string):void;
 interrupt(utteranceId:string):void;
 onEvent(listener:(event:VoiceEvent)=>void):()=>void;
 disconnect():void;
}
export const integrationState={connected:false,reason:'等待公司接口文档和服务端授权服务；当前使用预设文本回复。'} as const;
