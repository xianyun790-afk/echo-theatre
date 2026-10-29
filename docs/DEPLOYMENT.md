# 《第七个孩子》第一、二幕 · 部署交接

交接日期：2026-10-28。游戏版本：0.2.8。交接包修订：1。

## 1. 本次交付与目标

将单人试玩部署在接收方的机器或服务器，返回其他人可访问的 HTTPS URL。请先确认访问范围：公司内网，或公网；内网域名同样需要浏览器信任的证书。`127.0.0.1` 只指访问者自己的机器，不能作为交付链接。

这是源码和必要资源的交付包，尚未在目标服务器安装或部署。包内为已验证的0.2.8源码和运行资源。正式域名、证书、系统和部署目录由接收方确定，下文以 Linux/macOS、`/opt/echo-theatre`、`game.example.com` 为占位示例。推荐部署在独立域名根路径；部署到子路径需要另外调整 Vite base 和 API 路径。

完整 ZIP 包含本说明、发给同事的消息、Nginx 示例，以及 `echo-theatre/` 工程：源码、锁文件、public 素材、82 份固定配音及 manifest、已解压的中文识别模型。请完整解压，保留隐藏目录 `.local-asr`。

未打包密钥、node_modules、Python 虚拟环境、测试录音和旧缓存。历史 `source.tar.gz` 仅为源码备份，缺少运行资源，请使用本次完整交接包。

## 2. 运行结构

| 部分 | 部署方式 | 路径/端口 |
| --- | --- | --- |
| React/Vite 前端 | `npm run build` 后由 Nginx 托管 dist | 同一 HTTPS 站点的 `/` |
| Python 固定配音/本地识别 | `.local-asr/venv/bin/python scripts/local_asr_server.py` | 127.0.0.1:4178；`/api/voice/status`、`/api/tts/…`、`/api/transcribe` |
| Node 实时主持人中转 | `node scripts/nia-server.mjs` | 127.0.0.1:4179；`/api/nia/status`、WebSocket `/api/nia/session` |

两项后端都必须单独常驻；Vite 构建不会包含它们。后端端口保持回环绑定，统一由同源 HTTPS 代理访问。

建议先用 Node.js 22、Python 3.12（本机已验证的版本系列）；目标机器需可安装 npm/PyPI 依赖。已有配音均为 WAV，可直接处理；若后续换成其他格式，Linux 建议安装 ffmpeg。

## 3. 安装与配置顺序

在完整解压后的工程目录执行：

```sh
cd /opt/echo-theatre
npm ci
python3 scripts/setup_local_asr.py
```

识别模型已包含，setup 会创建本机专用 venv 并安装 Vosk；不要复制另一台机器的 venv。即使使用 NIA 实时语音，当前 Python 服务仍在启动时加载 Vosk 模型，不能删掉。

### 必做：配置正式页面 Origin

当前代码只允许 `http://127.0.0.1:4177` 和 `http://localhost:4177`。正式部署前需修改：

- `scripts/nia-server.mjs` 顶部 `origins` 集合：加入实际页面 Origin，例如 `https://game.example.com`。
- `scripts/local_asr_server.py` 的 `do_GET` 配音、`do_POST` 识别两处 Origin 检查：加入同一个实际 Origin。也可改成从环境变量读取，并记录配置方式。

Origin 由协议、域名和非默认端口组成，不含路径或尾斜杠。内网地址也要按实际值配置。保留精确白名单，不使用通配，也不要在代理中伪造为 localhost。现有代码没有可直接设置的 `ALLOWED_ORIGINS` 环境变量，仅设置变量不会生效。

请将目标域名、修改文件和部署日期记录为部署修订（例如 `0.2.8-deploy.1`），保留原交接 ZIP 便于回退。

### 实时服务密钥

由接收方在服务器创建 `.env.local`，或向 Node 常驻进程注入环境变量：

```dotenv
NIA_ACCESS_KEY=实际的服务端AK
NIA_SECRET_KEY=实际的服务端SK
```

密钥需另行对接有效 NIA 账号、模型权限及额度。不得写入前端、`VITE_` 变量或 dist；`.env.local` 留在工程根目录，限制文件访问权限。根目录已有同名非空文件时，会优先于进程环境读取。`.env.example` 的旧 `SENSEAUDIO_API_KEY` 当前固定缓存播放不需要。

82 份固定剧情配音为预生成缓存，正常游戏不会为这些台词发起在线生成。实时主持人需要外部 NIA 服务；未配密钥时会走现有本地分支，不能视为完整实时部署验收通过。

### 构建与启动验证

```sh
npm test
npm run build
```

然后在两个终端分别启动服务，用于部署验证：

```sh
cd /opt/echo-theatre
.local-asr/venv/bin/python scripts/local_asr_server.py
```

```sh
cd /opt/echo-theatre
node scripts/nia-server.mjs
```

验证后用 systemd、PM2 或接收方现有进程管理工具托管这两个命令，设置正确工作目录、运行用户、凭据、日志、自动重启和开机启动。Python venv 路径须使用绝对路径。运行用户需要读取模型/配音，并可写 `.local-asr/senseaudio/playback`（首次播放时自动生成）。

开发调试可使用 `npm run dev -- --port 4177 --strictPort`，它会尝试拉起本地后端；正式交付采用 dist + 常驻后端 + HTTPS 代理。

## 4. HTTPS 与网络

按随附 `nginx.example.conf` 替换域名、证书路径和 dist 路径，合并到现有 Nginx 配置，运行 `nginx -t` 成功后再按接收方流程重载。该文件是待适配示例，未在目标机器验证。

- 前端和 API 使用相同 HTTPS Origin。
- `/api/nia/` 转给 4179，其中 `/api/nia/session` 需要 WebSocket Upgrade，超时至少覆盖 10 分钟会话。
- 其他 `/api/` 转给 4178；路径保持原样，不要剥离 `/api/`。
- 远程浏览器麦克风需要 HTTPS；普通内网 IP 的 HTTP 页面不满足条件。
- 服务器需可连 `wss://nia.sensetime.com/biz/duplex/ws1`。
- 0.2.8浏览器音频经同源WebSocket中转至NIA WS1，不再需要Agora RTC入会。请在目标网络实测ASR、文字及PCM回复音频。
- 请使用锁文件及现有构建配置；旧Agora依赖暂保留，但当前浏览器运行路径不加载该SDK。

## 5. 验收清单

先检查服务器回环接口，再用实际用户网络检查部署域名：

```sh
curl --fail http://127.0.0.1:4178/api/voice/status
curl --fail http://127.0.0.1:4179/api/nia/status
curl --fail https://game.example.com/api/voice/status
curl --fail https://game.example.com/api/nia/status
```

预期 Python 返回 `ready: true`，其中 `tts.configured: true`、`cached_clips: 82`；Node 返回 `configured: true`。这些只证明本地服务及配置可读取，不能证明第三方凭据有效或完整语音链路成功。

在实际 HTTPS 页面，用桌面 Chrome/Edge 实测：

- [ ] 首页及三维场景可打开，字体、图片、童谣和背景音乐加载正常。
- [ ] 固定剧情配音可播放，控制台没有相关 403/404/502。
- [ ] 三条线索可收集；明确要求公开许知音磁带时第三条线索稳定入库。
- [ ] 允许麦克风后可与主持人对话，能实际听到回应；验证 NIA WS1 的识别、流式字幕与实际语音回复。
- [ ] 集中推理可重听、停止童谣，关闭证据后无残留播放。
- [ ] 草稿、发言、质询、判断在刷新后恢复，完成记录可查看、导出。
- [ ] 关闭启动终端后服务继续运行，模拟重启或按管理流程重启后可访问。

请交回：最终 URL、内网/公网访问范围、版本/部署修订、启动和重启方式、日志位置、上述验收结果及未解决问题。凭据通过双方认可的单独渠道对接。

## 6. 当前验证与边界

0.2.8 本机已有 85 项 Node 测试通过，类型检查与生产构建成功，并完成主要桌面流程回归。已在桌面Chrome通过真实NIA文字问答，以及合成语音经浏览器麦克风输入的ASR与模型音频回复验证；目标网络的真人麦克风识别和声音听感仍需本次部署验收。

0.2.8已增加实时服务报错后的本地识别/预设回应备用入口，页面明确区分模式。第二幕已验证390×844手机布局，麦克风与发送按钮可直接操作；仍需在目标手机的真实麦克风环境验收。

这是单人第一、二幕演示，其他角色为预设内容，不是多人联机。第二幕入口为?act=2，第三幕尚未开放。进度保存在浏览器 localStorage，没有服务端账号存档；更换域名、浏览器或设备不会自动带入原本 localhost 的进度。

源码内 CHANGELOG.md 保留 0.2.8 版本记录；旧 README 的 localhost 启动命令仅用于开发。部署以本交接说明为准。







## 0.2.8第二幕语音输入

本包包含第一、二幕、既有语音修复、第二幕体验改进、第一幕前情及集中推理语音输入。本次为第二幕活动陈述与待追问问题补上语音转文字；识别结果追加到可编辑草稿，明确点击后才提交，不自动公开私人线索。支持取消和手动结束，切换资料、场景或离开时自动关闭麦克风。桌面语音按钮固定在提交区，手机紧跟输入框。试玩仍止于七号房门外，第三幕尚未开放。

从0.2.7升级只需更新本版源码、安装依赖并重建前端；复用原Python识别服务，无需修改NIA后端、配音或缓存。新机器按上述完整部署流程启动前后端。保留密钥、白名单和浏览器进度。

请按《第二幕语音输入验收说明.md》检查两处麦克风、转写草稿、追加原文、取消与错误保留、修改时丢弃迟到结果、切换资料或查证方向后释放麦克风、明确提交和刷新恢复。桌面1280×720、手机390×844交互及真实Vosk转写路径已验证；Node85项及生产构建通过。真实转写验收使用测试音频模拟麦克风，部署后请按目标设备检查实际录音与权限。

回退到0.2.7源码重建前端即可，配音无需更换，已保存文字和调查记录兼容。
