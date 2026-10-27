import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const [frontend,backend]=await Promise.all([read('../src/lib/narration.json').then(JSON.parse),read('../config/voices.json').then(JSON.parse)]);
test('all 17 scene narrations have matching subtitles and server-side synthesis text',()=>{
 assert.equal(Object.keys(frontend).length,17);
 for(const [id,clip] of Object.entries(frontend)){
  assert.equal(backend.clips[id]?.text,clip.text,id);
  assert.equal(backend.clips[id]?.role,'narrator_host',id);
 }
});
