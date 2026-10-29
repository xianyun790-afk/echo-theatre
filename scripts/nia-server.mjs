import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {WebSocket,WebSocketServer} from 'ws';
import {createNiaJwt,loadNiaCredentials,normalizeKnown,pipelineConfig,hostPrompt,NIA_MODEL,NIA_VOICE,NIA_VOICE_NAME} from './nia-config.mjs';
const origins=new Set(['http://127.0.0.1:4177','http://localhost:4177']);
export function startNiaServer(port=4179,{credentials=loadNiaCredentials,upstreamFactory=token=>new WebSocket('wss://nia.sensetime.com/biz/duplex/ws1?audio_only=true&jwt='+encodeURIComponent(token)),quiet=false}={}){
 const server=http.createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.url!=='/api/nia/status'||req.method!=='GET'){res.writeHead(404);res.end('{}');return;}
  const {ak,sk}=credentials();res.end(JSON.stringify({configured:Boolean(ak&&sk),provider:'NIA',transport:'websocket-pcm',model:NIA_MODEL,voice:NIA_VOICE_NAME,voice_id:NIA_VOICE}));
 });
 const wss=new WebSocketServer({noServer:true,maxPayload:32768});
 server.on('upgrade',(req,socket,head)=>{
  if(req.url!=='/api/nia/session'||!origins.has(req.headers.origin)||wss.clients.size>=4){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,client=>wss.emit('connection',client));
 });
 wss.on('connection',client=>{
  const send=message=>{if(client.readyState===WebSocket.OPEN)client.send(JSON.stringify(message));};
  const {ak,sk}=credentials();
  if(!ak||!sk){send({type:'LocalError',message:'NIA 尚未配置 AK/SK，请先完成本地服务端配置。'});client.close(1000);return;}
  const token=createNiaJwt(ak,sk);
  const upstream=upstreamFactory(token);
  let known=[],history=[],act=1,connected=false;
  const expires=setTimeout(()=>{send({type:'LocalError',message:'本轮实时会话已到10分钟，请重新连接。'});client.close(1000);upstream.close();},600000);
  const opening=setTimeout(()=>{if(!connected){send({type:'LocalError',message:'NIA 连接超时，请检查网络与 AK/SK。'});client.close(1000);upstream.close();}},15000);
  const forward=message=>{if(upstream.readyState===WebSocket.OPEN)upstream.send(JSON.stringify(message));};
  upstream.on('open',()=>{connected=true;clearTimeout(opening);send({type:'TransportReady'});});
  upstream.on('message',(data,isBinary)=>{
   if(isBinary)return;
   let message;try{message=JSON.parse(data.toString());}catch{return;}
   if(message.type==='Ping'){forward({type:'Pong'});return;}
   if(client.bufferedAmount>1024*1024){send({type:'LocalError',message:'语音接收网络拥堵，请重新连接。'});client.close(1000);upstream.close();return;}
   send(message);
  });
  upstream.on('error',()=>{send({type:'LocalError',message:'NIA 连接失败，请检查 AK/SK、模型权限与网络。'});client.close(1000);});
  upstream.on('close',()=>{if(client.readyState===WebSocket.OPEN){send({type:'LocalError',message:'NIA 实时连接已断开，请重新连接。'});client.close(1000);}});
  client.on('message',raw=>{
   let m;try{m=JSON.parse(raw.toString());}catch{return;}
   if(!m||typeof m!=='object'||Array.isArray(m))return;
   const request_id=typeof m.request_id==='string'?m.request_id.slice(0,80):undefined;
   switch(m.type){
    case 'GameContext': act=m.act===2?2:1;known=normalizeKnown(m.known,act);history=Array.isArray(m.history)?m.history:[];if(m.update)forward({type:'SetSystemPrompt',system_prompt:hostPrompt(known,history,act),request_id});break;
    case 'ConfigPipeline':forward({type:m.type,custom_config:pipelineConfig(known,history,act),request_id});break;
    case 'CreateSession':forward({type:m.type,request_id});break;
    case 'ConfigASR':forward({type:m.type,enable:true,request_id});break;
    case 'StartServing':case 'InterruptAgent':case 'Pong':forward({type:m.type});break;
    case 'PostMultimodalGenerate':if(typeof m.text==='string'&&m.text.trim()&&m.text.length<=300)forward({type:m.type,text:m.text,request_id});break;
    case 'InputBuffer':{
     if(typeof m.audio_segment!=='string'||m.audio_segment.length>13336||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(m.audio_segment))break;
     const bytes=Buffer.from(m.audio_segment,'base64');if(!bytes.length||bytes.length%2||bytes.length>10000)break;
     if(upstream.bufferedAmount>256000){send({type:'LocalError',message:'语音发送网络拥堵，请重试或输入问题。'});client.close(1000);upstream.close();break;}
     forward({type:'InputBuffer',audio_segment:m.audio_segment});break;
    }
    case 'FnReturn':if(typeof m.call_id==='string'&&['Success','NoSuchFn','Cancelled'].includes(m.status))forward({type:m.type,call_id:m.call_id,status:m.status,result:m.result});break;
   }
  });
  client.on('error',()=>{upstream.close();});
  client.on('close',()=>{clearTimeout(opening);clearTimeout(expires);upstream.close();});
 });
 server.listen(port,'127.0.0.1',()=>{if(!quiet)process.stdout.write(`Local NIA relay ready at http://127.0.0.1:${port}\n`);});
 return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)startNiaServer();
