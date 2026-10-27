import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const python=fileURLToPath(new URL('../.local-asr/venv/bin/python',import.meta.url));
const processes=[];
let niaReady=false;try{niaReady=(await fetch('http://127.0.0.1:4179/api/nia/status')).ok;}catch{}
if(!niaReady){const nia=spawn(process.execPath,['scripts/nia-server.mjs'],{cwd:root,stdio:'inherit'});processes.push(nia);}
let ready=false;try{ready=(await(await fetch('http://127.0.0.1:4178/api/voice/status')).json()).ready===true;}catch{}
if(!ready&&existsSync(python)){
 const asr=spawn(python,['scripts/local_asr_server.py'],{cwd:root,stdio:'inherit'});processes.push(asr);
 asr.on('exit',code=>{if(code)console.error('Local voice service exited. Text input remains available.');});
}else if(!ready)console.warn('Local voice service is not installed. Run scripts/setup_local_asr.py first.');
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1',...process.argv.slice(2)],{cwd:root,stdio:'inherit'});processes.push(vite);
function stop(){for(const child of processes)child.kill('SIGTERM');}
process.on('SIGINT',stop);process.on('SIGTERM',stop);vite.on('exit',code=>{stop();process.exit(code??0);});
