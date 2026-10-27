# NIA 实时主持人

官方协议：[WebSocket + 声网 RTC](https://nia.sensetime.com/api-doc?doc=rtc#runtime)。接入模型 SenseNova-V7.0-omni，音色 male_ruyayichen_hs2（晚舟），ZH_CN 普通话，语速1.0。音色选择依据官方列表的沉稳、从容描述，已通过真实接口配置与固定台词生成验证。

## 本地配置

在项目 `.env.local` 已预留的两个字段填入 NIA 平台凭据：

```
NIA_ACCESS_KEY=你的AK
NIA_SECRET_KEY=你的SK
```

它们来自 https://nia.sensetime.com/api-platform/access-keys ，与旧 SenseAudio API Key 分开。不要加 VITE_ 前缀，不要提交密钥文件。服务读取配置时重新载入文件，填好后刷新网页即可。

启动：`npm run dev`。页面 http://127.0.0.1:4177 ，NIA relay为4179，现有本地ASR/TTS为4178。`scripts/dev.mjs` 同时启动并回收这些本地服务，复用已启动的服务。

## 使用与范围

配置完整后，常驻主持人输入框自动使用 NIA。麦克风按钮建立连续实时通话，可以打断；文字输入也通过 NIA 回答，但不申请麦克风。没有凭据时明确显示“NIA 待配置”，保留本地演示，不假装已连接模型。

通话期间背景音乐暂停。结束对话、触发本地旁白、打开弹窗、进入集中推理或组件退出时关闭麦克风与 RTC 连接。总静音也作用于模型回复。

本轮接入实时主持人的语音输入、模型回复、文本输入、ASR回显与流式字幕。开场童谣与背景音乐保留用户原文件。固定旁白、角色陈述与质询回应已改用7套 NIA 音色，共58条路径，生成后缓存在本机。没有接入真人多人房间。

开始语音对话后，麦克风通过 Agora/声网传至 NIA；前端界面与试玩说明已更新该说明。纯文字连接不采集麦克风。

## 协议与职责

- 浏览器连接本机 `/api/nia/session`。AK/SK只在relay读取；relay用HS256签发10分钟JWT，连接固定官方WS2地址。浏览器只获得RTC短期入会信息。
- 顺序：CreateSession → ConfigPipeline → ConfigASR → RequestAgoraChannelInfo → RequestAgoraToken → Agora join → StartServing/AudioAccepting。
- PostMultimodalGenerate发送文字；AsrTraceEnd记录玩家发言；ResponseTextSegment/End更新字幕；AgentStartPlay/End管理回复状态；InterruptAgent/ClearAgentAudio处理打断；RTC token到期前renewToken。
- relay覆盖客户端模型提示，仅注入白名单内已公开事实，关闭联网搜索与RAG。
- inspect_under_table工具只切视角，不自动收集手印；ask_xu_about_tape按第一幕既定演示公开磁带，不认定版本或来源。工具状态由游戏决定，模型自由回复不直接增加证据。
- relay仅监听127.0.0.1，WebSocket检查本地Origin，不支持任意上游、任意系统提示或任意工具。

## 验证状态

50项前端/Node测试及20项Python测试通过，生产构建通过；协议编排、鉴权签名、缺少凭据、跨站拒绝、流式文字、工具回填、打断、权限等待期间取消与资源释放已有自动化测试。网页已确认缺少凭据时显示“NIA 待配置”，文字输入仍可使用本地演示。真实账号已配置；已通过鉴权、创建会话、模型/音色配置、RTC凭证获取与网页入会；网页已收到真实模型的流式回复与41739字节的回复音频，字幕不重复，文字问答自然结束后RTC连接已自动关闭。控制台已领取实时音频交互集成版60分钟免费试用（服务期限3个月）。真人麦克风收音质量仍需用户实际说话体验。

当前Chromium的ICE选项含goog-sped-v1，固定Agora SDK 4.24.9的旧ICE字符解析会拒绝其中连字符。scripts/agora-ice-compat.mjs在Vite预构建和生产构建中只将该处改用SDK现有SDP token解析器，保留原始连接选项和完整SDP；未修改node_modules或浏览器全局API。已添加针对实际SDK源码的测试及版本变化时的明确失败保护。

真实模型ResponseEndTextStream会返回完整句子，已避免末尾字幕重复。纯文字问答的自然语音回复结束后自动关闭RTC，连续麦克风模式则继续监听。

## 角色音色与固定配音

配置：`config/nia-voices.json`。晚舟用于旁白与实时主持人；小栗→许知音，暖暖→梁素琴，云峥→沈时安，林舟→周叙，青木→程野，青禾→唐棠。所选7个 ID 在 ZH_CN 下均返回 VoiceTypeSet。文档所列如烟和星野分别返回 invalid voice_type，故未采用。匹配依据官方标签与原定角色方向，不代表已完成精确年龄或表演情绪的主观试听验收。

固定台词生成：`node scripts/nia-render.mjs`（也可按角色或 clip ID 筛选）。服务端使用 AK/SK 签名连接 WS1，依次 PostSayIt；切换前等待 SetVoiceType 应答，收齐音频并等 AgentEndPlay 后才保存。实测 WS1 使用 ResponseStart/EndAudioSegment 名称，区别于文档中的 AudioStream 命名。PCM16k 原始音频转32k后复用本地响度归一与头尾静音处理，保留完整音节。缓存键包含正文、角色、音色、模型、语言、语速。缺少或过期文件明确报错，不偷换回共享音色。

58条路径包含38条基础台词与20条按目标角色区分的质询回应。`scripts/nia_tts.py` 只读缓存，不在游戏中启动固定配音的付费生成；`/api/tts` 返回实际音色 ID。录音、模型与缓存都在忽略目录`.local-asr/nia/`，没有发布。已领取 WebSocket 纯音频60分钟免费试用（3个月）；生成结束自动断开。

试听页：http://127.0.0.1:4177/voice-audition.html 。58条路径的 HTTP、音色 ID、WAV 格式、长度、非静音和峰值检查见 `study/nia-cast-audit.json`；7条样本本地 Vosk 转写仅辅助检查内容，不等于人工听感验证。

## 当前内置浏览器复测限制

本次固定配音58条路径、7套音色均已验证可播放。实时主持人配置已同步晚舟，但当前内置浏览器复测在 Agora join 阶段返回 InvalidModificationError（RTCPeerConnection.setConfiguration），随后20秒超时；未收到回复音频。本轮没有把该错误当作音色权限问题或宣称实时通话已经修复。尝试保留 RTC 不可变配置字段未解决，相关实验补丁已撤回，保留原有经验证的 ICE token 解析修补。此前41739字节成功音频是上次云峥会话的历史证据，不作为本轮晚舟 RTC 的成功证据。固定缓存播放与独立试听页不经过 RTC，均可使用。
