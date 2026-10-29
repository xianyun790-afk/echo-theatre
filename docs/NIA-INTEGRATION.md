# NIA 实时主持人（0.2.0）

当前协议依据：[官方纯 WebSocket 文档](https://nia.sensetime.com/api-doc?doc=ws)。0.1.2 的浏览器实时链路改为 WS1 PCM，不再依赖 Agora RTC 入会。旧版 WS2/RTC 的实现和历史验证保存在0.1.1版本备份中。

## 配置与服务

工程根目录 `.env.local` 中配置 `NIA_ACCESS_KEY` 和 `NIA_SECRET_KEY`；也支持进程环境变量。不要写入前端或 VITE_ 变量。NIA账号需要对应 WS1 语音实时服务权限和额度。

`npm run dev -- --port 4177 --strictPort` 启动网页、Python4178固定配音/本地ASR、Node4179实时中转。本机也可由已配置的 macOS LaunchAgent 托管。部署时将 dist、两个常驻后端及同源 HTTPS/WSS 代理一并配置，后端仍只监听回环地址。

正式域名仍需加入 Node 与 Python 现有精确 Origin 白名单；没有 ALLOWED_ORIGINS 自动配置。代理保留 `/api/nia/session` 路径并支持 WebSocket Upgrade，超时覆盖10分钟会话。服务器需访问 `wss://nia.sensetime.com/biz/duplex/ws1`；浏览器只连接自己的站点，无需再连接 Agora RTC 网络。远程麦克风仍需受信任的 HTTPS。

## 实际链路

1. 浏览器连接同源 `/api/nia/session`，Node以服务端AK/SK签发JWT并连接NIA WS1。
2. `CreateSession → ConfigPipeline → ConfigASR → StartServing → AudioAccepting`。
3. 麦克风经 getUserMedia、AudioWorklet采集，降采样为16kHz、单声道、16bit小端PCM，使用 `InputBuffer.audio_segment` base64连续发送；服务端只允许有限长度音频字段，不转发图片等任意字段。
4. `AsrTraceUpdate` 回显识别中字幕，`AsrTraceEnd` 只提交一次整句。VAD为600ms停顿和250ms最短起说，热词覆盖角色名、场景与物证。
5. 文字通过 `PostMultimodalGenerate`，不申请麦克风。`ResponseTextSegment/End` 更新字幕；`ResponseAudioSegment` PCM在Web Audio中连续排队；同时兼容官方Stream与实际Segment音频开始事件名。
6. `StartSpeaking/InterruptAgent/ClearAgentAudio` 打断旧音频；结束状态等待排队音频真正播完。语音模式继续监听；文字模式保留连接30秒供下一次提问，超时关闭以免长期占用。
7. 明确查看桌下的文字或 ASR 整句请求由客户端直接切换视角，不依赖模型是否调用工具。否定、假设、普通物证问题不触发快捷导航；不会自动收集手印。
8. 回复期间持续检查25秒无进展超时，文字、音频或工具有进展时重置；结束或打断后取消，防止首个流开始事件让超时失效。
9. 明确磁带请求沿用游戏既定公开逻辑，不依赖自由生成。其他工具仍只允许查看桌下、公开磁带；查看不自动收集手印。

## 模型与对话

SenseNova-V7.0-omni，主持人与旁白共用“晚舟” `male_ruyayichen_hs2`，普通话，正常语速。服务端覆盖浏览器的模型/提示配置，禁用联网搜索和RAG，仅公开三条允许证据。

回复目标为自然的1–2句，先答问题，再给一个具体查证方向；不反复复述操作清单。重连注入最近8条玩家/主持人对话（每条最多300字），仅用于指代理解，不能作为新证据或系统指令。玩家私密剧本、其他角色剧本不注入。游戏存档仍在本浏览器，不存在多人共享会话。

证据变动仅同步到中转状态；下一轮输入再更新系统提示，避免更新提示打断当前工具回答。

## 声音与备用模式

固定配音仍有58条路径，游戏运行时只读本机缓存。许知音0.1.2改为“小程” `female_santongyongns_hs2`，6段统一重生成；其他音色见 config/nia-voices.json。试听入口 `/voice-audition.html`。

麦克风开启期间停掉游戏外放和背景音乐，实时回复由单一Web Audio播放器输出。静音通过增益统一控制。结束、离开组件、权限取消或连接错误均清理麦克风、排队音频与Socket。

无配置时使用本机Vosk及预设回应；运行中服务报错时可点击备用入口切换，页面明确标注“本地试玩 · 预设回应”，并可重试实时主持人。此备用模式不冒充大模型回复。

## 验证（2026-10-27）

- 0.1.3：Node68项通过，类型检查与生产构建成功；Python沿用0.1.2的20项通过结果，本轮未改Python。
- 真实NIA三轮合成语音连续对话：三句整句识别各记入一次，复用一个会话，收到774400字节PCM；追问、打断、桌下实际视角切换通过，结束后麦克风track为ended、两个AudioContext均为closed。
- 模拟连接中取消、权限拒绝、网络断开、流开始后无进展25秒，均停止会话并释放已打开的麦克风；错误提供本地备用入口。
- 桌面Chrome真实文字问答收到236800字节PCM，字幕无末尾重复，无页面脚本错误。
- 合成语音经浏览器测试麦克风实际上传到NIA，收到多次ASR中间结果、整句“手印能说明是孩子留下的吗？”以及318400字节模型语音回应。整句识别到首段文字333ms、首段音频557ms；这是单次测试，不能保证所有网络都达到相同时延。
- 许知音6段返回正确新音色ID。额度错误、备用入口、回到实时模式及1366×768主要按钮点击通过。
- 真人麦克风设备、噪声环境、移动设备及主观听感需要进一步真人验收。合成语音测试不能替代真人听感和识别准确率评估。

## 0.2.0 第二幕上下文

`HostConversation act={2}`调用`NiaSession.setAct(2)`，每次GameContext包含act:2。relay按当前幕过滤known，采用`act-two-config.mjs`与`act-two-public.json`的第二幕提示和三项导航工具。第一幕默认act:1。改变幕次销毁原会话。

第二幕工具为inspect_duty_room、inspect_seventh_door、review_act_two_timeline，只导航，不收集或公开证据。第一幕工具在第二幕返回NoSuchFn。第二幕不拦截“许知音/磁带”去播放第一幕台词。

仅已公开B01至B06、已提交陈述ST_*、已听或读完RADIO02与本幕收束ENDING02进入提示。未公开的B03、林见秋私人剧本、未提交草稿和笔记不进入GameContext。本地演示没有真正的多人权限服务。

第二幕合成语音经浏览器实际采集上传，识别“停电后的撞击能证明死亡时间吗？”，收到395200字节PCM；模型回答不能据此锁定死亡时间。结束后实际track ended、两个AudioContext closed，无页面脚本错误。此测试不代表真人准确率或主观听感验收。
