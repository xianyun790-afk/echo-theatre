import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {patchAgoraIceOptions} from '../scripts/agora-ice-compat.mjs';
test('the pinned Agora bundle accepts the browser ICE extension without changing SDP values',async()=>{
 const source=await readFile(new URL('../node_modules/agora-rtc-sdk-ng/AgoraRTC_N-production.js',import.meta.url),'utf8');
 const patched=patchAgoraIceOptions(source);
 const method=patched.match(/parseIceOptions\(e\)\{.*?\}parseFingerprint/)[0].replace(/parseFingerprint$/,'');
 const Parser=Function('return class { '+method+' }')();
 const parser=new Parser();parser.attributes={};parser.atEnd=e=>e.cursor===e.text.length;
 parser.consumeToken=()=>{};
 parser.extract=(e,consume)=>{assert.equal(consume,parser.consumeToken);const match=/^[^ ]+/.exec(e.text.slice(e.cursor));e.cursor+=match[0].length;return match[0];};
 parser.consumeAttributeSpace=e=>{if(e.text[e.cursor]!==' ')throw Error('end');e.cursor++;};
 parser.parseIceOptions({text:'trickle goog-sped-v1',cursor:0});
 assert.deepEqual(parser.attributes.iceOptions,['trickle','goog-sped-v1']);
 assert.throws(()=>patchAgoraIceOptions('changed SDK source'),/needs review/);
});
