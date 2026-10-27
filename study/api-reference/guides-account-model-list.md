> ## Documentation Index
> Fetch the complete documentation index at: https://docs.senseaudio.cn/llms.txt
> Use this file to discover all available pages before exploring further.

# 模型列表

> 可调用的模型名称、能力与计费概览

> [!NOTE]
>
> 下表价格按「原价」与「优惠后」两档列出，**加粗数字**为当前生效的优惠价；若未列出优惠后价格，则等同于原价。完整计费规则详见 [API 计费](/guides/account/billing)。

## 文本生成

> 计费单位：**元 / 百万 Tokens**

### SenseAudio 自研模型

| 模型名称 | 模型 ID | 输入价格 | 输出价格 | 上下文长度 | 最大输入 | 最大输出 |
| - | - | - | - | - | - | - |
| SenseAudio-S2 | `senseaudio-s2` | 原价 15 优惠后 **5** | 原价 90 优惠后 **30** | 1M | — | 128K |
| SenseAudio-S2-Flash | `senseaudio-s2-flash` | 原价 4 优惠后 **2** | 原价 24 优惠后 **12** | 256K | 254K | 64K |
| SenseAudio-S2-Lite | `senseaudio-s2-lite` | 原价 2 优惠后 **1** | 原价 12 优惠后 **6** | 256K | 254K | 64K |

### SenseNova 模型

| 模型名称 | 模型 ID | 输入价格 | 输出价格 | 上下文长度 | 最大输入 | 最大输出 |
| - | - | - | - | - | - | - |
| SenseNova-6.8-Flash-Lite | `sensenova-6.8-flash-lite` | 原价 15 优惠后 **5** | 原价 90 优惠后 **30** | — | — | — |

### 其他通用模型

| 模型名称 | 模型 ID | 输入价格 | 输出价格 | 上下文长度 | 最大输入 | 最大输出 |
| - | - | - | - | - | - | - |
| Qwen3.8-27B | `qwen3.8-27b` | 3 | 12 | 256k | 254K | — |
| Qwen3.6-35B-A3B | `qwen3.6-35b-a3b` | 1.8 | 10.8 | 256K | 254K | 64K |
| DeepSeek-V4.1-Flash | `deepseek-v4.1-flash` | 2 | 8 | 1M | — | — |
| DeepSeek-V4-Flash-0731 | `deepseek-v4-flash-0731` | 2 | 8 | 1M | 616k | 384K |
| GLM-5.3-Flash | `glm-5.3-flash` | 0.8 | 2.8 | 1M | — | 128k |

相关接口：[Chat Completions](/api-reference/endpoint/llm/chat)、[文本生成介绍](/guides/llm/overview)。

## 语音合成

> 计费单位：**元 / 万字符**。1 个汉字 = 2 个字符；英文字母、希腊字母、标点、特殊符号、空格、回车等 = 1 个字符。

| 模型名称 | 模型 ID | 价格 | 备注 |
| - | - | - | - |
| SenseAudio-TTS-1.5 | `senseaudio-tts-1.5-260319` | 3.5 元 / 万字符 | 多情绪、多风格、多音字纠正、公式朗读 |
| SenseNova-TTS-2.0 | `sensenova-tts-2.0` | 3.5 元 / 万字符 | 多情绪、多风格、公式朗读 |

相关接口：[语音合成 API](/api-reference/endpoint/tts/synthesize)。

## 语音识别

> 计费单位：**元 / 小时**，按音频时长计费。

| 模型名称 | 模型 ID | 价格 | 适用场景 |
| - | - | - | - |
| SenseAudio-ASR-Lite-1.5 | `senseaudio-asr-lite-1.5-260319` | 0.9 元 / 小时 | 轻量、低成本识别 |
| SenseAudio-ASR-1.5 | `senseaudio-asr-1.5-260319` | 1.8 元 / 小时 | 通用识别 |
| SenseAudio-ASR-Pro-1.5 | `senseaudio-asr-pro-1.5-260319` | 3.6 元 / 小时 | 专业级高精度识别 |
| SenseAudio-ASR-DeepThink-1.5 | `senseaudio-asr-deepthink-1.5-260319` | 3.6 元 / 小时 | 深度推理增强识别 |
| SenseAudio-ASR-Stream-1.5 | `senseaudio-asr-stream-1.5-260910` | 3.6 元 / 小时 | 流式实时转写 |
| SenseAudio-ASR-Check-1.5 | `senseaudio-asr-check-1.5-260319` | 3.6 元 / 小时 | 复核 / 校对场景 |

相关接口：[语音识别转写](/api-reference/endpoint/asr/transcriptions)、[流式 ASR](/api-reference/endpoint/asr/realtime)、[语音识别介绍](/guides/asr/overview)。

## 同声传译

> 计费单位：**积分 / 秒**，按时长计费，不足 1 秒按 1 秒计时。

| 模型名称 | 模型 ID | 价格 | 适用场景 |
| - | - | - | - |
| SenseNova-LiveTranslate-1.0 | `sensenova-livetranslate-1.0` | 50 积分 / 秒 | 同声传译 |

相关接口：[同声传译 API](/api-reference/endpoint/simultaneous-interpretation/websocket)、[同声传译介绍](/guides/simultaneous-interpretation/overview)、[同声传译计费](/guides/account/billing)。

## 人声分离

> 计费单位：**元 / 秒**，按音频时长计费（按秒计费，不足 1 秒按 1 秒计时）。

| 模型名称 | 模型 ID | 价格 | 适用场景 |
| - | - | - | - |
| SenseAudio-Voice-Isolation | `senseaudio-voice-isolation-1.0-260319` | 0.04 元 / 秒 | 人声分离 |
| SenseAudio-Voice-Isolation | `senseaudio-voice-isolation-1.5` | 0.04 元 / 秒 | 人声分离 |

相关接口：[人声分离介绍](/guides/voice-isolation/overview)、[同步人声分离](/api-reference/endpoint/voice-isolation/sync)、[异步人声分离](/api-reference/endpoint/voice-isolation/async)。

## 音乐生成

> 计费单位：**元 / 首**

| 模型名称 | 模型 ID | 原价 | 优惠后 |
| - | - | - | - |
| SenseAudio-Music-2.0 | `senseaudio-music-2.0-260626` | 1 元 / 首 | **0.5 元 / 首** |

相关接口：[歌词生成](/api-reference/endpoint/music/lyrics-create)、[歌词改写](/api-reference/endpoint/music/lyrics-revise)、[歌曲生成 V2](/api-reference/endpoint/music/song-create-v2)。

## 音效生成

> 计费单位：**0.08 元 / 组**，创作台默认生成 4 条。

| 模型名称 | 模型 ID | 原价 | 优惠后 |
| - | - | - | - |
| SenseAudio-Sound-Effect-1.0 | `senseaudio-sfx-1.0-260626` | 0.08 元 / 组 | — |

相关接口：[音效生成](/api-reference/endpoint/sfx/create)。

## 音频生成

> 计费单位：**积分 / 秒**。按生成音频时长计费，每生成 1 秒音频消耗 85 积分；按 1 元 = 5,000 积分换算，约为 0.017 元 / 秒。

| 模型名称 | 模型 ID | 原价 | 优惠后 |
| - | - | - | - |
| SenseAudio-A1 | `senseaudio-a1` | 0.017 元 / 秒 | — |

相关指南：[音频生成介绍](/guides/audio/overview)。

## 视频生成

> 计费单位：**元 / 秒**，按生成视频时长计费，不同分辨率分级定价。

| 模型名称 | 模型 ID | 分辨率 | 原价 | 优惠后 |
| - | - | - | - | - |
| Doubao-Seedance-2.0 | `doubao-seedance-2-0-260128` | 480P | 1 元 / 秒 | **0.5 元 / 秒** |
| Doubao-Seedance-2.0 | `doubao-seedance-2-0-260128` | 720P | 2 元 / 秒 | **1 元 / 秒** |
| Doubao-Seedance-2.0 | `doubao-seedance-2-0-260128` | 1080P | 6.2 元 / 秒 | **3.1 元 / 秒** |

相关接口：[创建视频任务](/api-reference/endpoint/video/create)。

## 图片生成

> 计费单位：**元 / 张**。SenseAudio-Image-2.0 按输出图分辨率（宽 × 高）阶梯计费：宽 × 高 ≤ 3,000,000 按 ≤1.5K 档；宽 × 高大于 3,000,000 按 2K 档。可选尺寸见 [同步图片生成](/api-reference/endpoint/image/sync) / [异步图片生成](/api-reference/endpoint/image/async)。

| 模型名称 | 模型 ID | 分辨率 | 原价 | 优惠后 |
| - | - | - | - | - |
| SenseAudio-Image-2.0 | `senseaudio-image-2.0-260319` | ≤1.5K | 1 元 / 张 | **0.5 元 / 张** |
| SenseAudio-Image-2.0 | `senseaudio-image-2.0-260319` | 2K | — | **0.8 元 / 张** |
| Doubao-Seedream-5.0-Lite | `doubao-seedream-5-0-260128` | — | 0.5 元 / 张 | **0.22 元 / 张** |
| SenseNova-U1-Fast | `sensenova-u1-fast` | — | 0.5 元 / 张 | — |

相关接口：[异步图片生成](/api-reference/endpoint/image/async)、[同步图片生成](/api-reference/endpoint/image/sync)。

## 端到端语音模型

> 计费单位：**元 / 分钟**，按实时语音会话中的音频时长计费。

| 模型名称 | 模型 ID | 原价 | 优惠后 |
| - | - | - | - |
| SenseAudio-Realtime-1.0 | `senseaudio-realtime-1.0` | 0.6 元 / 分钟 | — |

相关接口：[端到端实时语音模型](/api-reference/endpoint/tts/end-to-end-wss)。

## 相关资源

> **[快速接入](/guides/account/quick-access)**
>
> 获取 API Key 并完成首个请求。

> **[API 计费](/guides/account/billing)**
>
> 查看各项能力的计费规则。

> **[API 参考](/api-reference/introduction)**
>
> 浏览全部 API 端点与参数说明。

> **[音色列表](/guides/voice/catalog)**
>
> 查看系统音色清单与权限规则。


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.