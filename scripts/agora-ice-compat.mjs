import {readFile} from 'node:fs/promises';
// SDK 4.24.9's ICE option parser rejects Chromium's optional goog-sped-v1 token.
// Reuse its existing SDP token parser: preserve every option and all connection data.
const before='t.push(this.extractOneOrMore(e,E));try{this.consumeAttributeSpace(e)}';
const after='t.push(this.extract(e,this.consumeToken));try{this.consumeAttributeSpace(e)}';
export function patchAgoraIceOptions(source){
 if(source.split(before).length!==2)throw new Error('Agora ICE compatibility patch needs review for this SDK version.');
 return source.replace(before,after);
}
const isAgora=id=>!id.startsWith('\0')&&!id.includes('?')&&/agora-rtc-sdk-ng[/\\]AgoraRTC_N-production(?:\.esm)?\.(?:js|mjs)$/.test(id);
export function agoraIceCompat(){return {name:'agora-chromium-ice-options',enforce:'pre',transform(code,id){if(isAgora(id))return {code:patchAgoraIceOptions(code),map:null};}};}
export function agoraIceOptimizer(){return {name:'agora-chromium-ice-options',setup(build){build.onLoad({filter:/AgoraRTC_N-production(?:\.esm)?\.(?:js|mjs)$/},async args=>{if(isAgora(args.path))return {contents:patchAgoraIceOptions(await readFile(args.path,'utf8')),loader:'js'};});}};}
