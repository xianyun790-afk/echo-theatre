> ## Documentation Index
> Fetch the complete documentation index at: https://docs.senseaudio.cn/llms.txt
> Use this file to discover all available pages before exploring further.

# 查询可用音色



## OpenAPI

````yaml POST /v1/get_voice
openapi: 3.1.0
info:
  title: SenseAudio Open Platform API
  description: >-
    SenseAudio 开放平台
    API，覆盖语音合成、音频生成、语音识别、音色能力、音乐生成、图片生成、视频生成、智能体与大语言模型等能力。未显式说明的字段为依据素材文档推断。
  version: 1.0.0
servers:
  - url: https://api.senseaudio.cn
    description: 生产环境
security:
  - bearerAuth: []
paths:
  /v1/get_voice:
    post:
      tags:
        - Voice
      summary: 查询可用音色
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GetVoiceRequest'
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GetVoiceResponse'
components:
  schemas:
    GetVoiceRequest:
      type: object
      required:
        - voice_type
      properties:
        voice_type:
          type: string
          enum:
            - system
            - voice_clone
            - voice_generation
            - all
    GetVoiceResponse:
      type: object
      properties:
        system_voice:
          type: array
          items:
            $ref: '#/components/schemas/VoiceListItem'
        voice_cloning:
          type: array
          items:
            $ref: '#/components/schemas/VoiceListItem'
        voice_generation:
          type: array
          items:
            $ref: '#/components/schemas/VoiceListItem'
        base_resp:
          $ref: '#/components/schemas/BaseResp'
    VoiceListItem:
      type: object
      properties:
        voice_id:
          type: string
        voice_name:
          type: string
        description:
          type: array
          items:
            type: string
        created_time:
          type: string
    BaseResp:
      type: object
      description: 通用状态结构
      properties:
        status_code:
          type: integer
          description: 0 表示成功，非 0 表示失败
        status_msg:
          type: string
          description: 状态详情
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: API_KEY
      description: 格式：`Bearer <API_KEY>`

````

This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.