/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Configurations } from 'src/common/config';
import WebSocket from 'ws';
import { randomUUID as uuidv4 } from 'crypto';
import {
  StartConnection,
  FinishConnection,
  StartSession,
  FinishSession,
  TaskRequest,
  ReceiveMessage,
  WaitForEvent,
  EventType,
  MsgType,
} from 'src/common/utils/tts/protocols';

interface TtsSession {
  sessionId: string;
  ws: WebSocket;
  voice: string;
  audioChunks: Uint8Array[];
  isActive: boolean;
}

@Injectable()
export class TtsService implements OnModuleInit {
  private readonly logger = new Logger(TtsService.name);
  private sessions = new Map<string, TtsSession>();

  onModuleInit() {
    this.logger.log('TTS Service initialized');
  }

  /**
   * 创建与火山引擎TTS服务的WebSocket连接
   */
  async createConnection(resourceId: string, connectId: string): Promise<WebSocket> {
    const headers = {
      'X-Api-App-Key': Configurations.TTS_APPID,
      'X-Api-Access-Key': Configurations.TTS_ACCESS_TOKEN,
      'X-Api-Resource-Id': resourceId,
      'X-Api-Connect-Id': connectId,
      'X-Control-Require-Usage-Tokens-Return': 'true',
    };

    const ws = new WebSocket(Configurations.TTS_ENDPOINT, {
      headers,
      skipUTF8Validation: true,
    });

    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      ws.on('open', async () => {
        try {
          await StartConnection(ws);
          await WaitForEvent(
            ws,
            MsgType.FullServerResponse,
            EventType.ConnectionStarted,
          );
          this.logger.log('TTS WebSocket connection established');
          resolve(ws);
        } catch (error) {
          this.logger.error('Failed to start TTS connection:', error);
          ws.close();
          reject(error);
        }
      });

      ws.on('error', (error) => {
        this.logger.error('TTS WebSocket error:', error);
        reject(error);
      });
    });
  }

  /**
   * 开始TTS会话
   */
  async startSession(ws: WebSocket, text: string, voice: string): Promise<string> {
    const sessionId = uuidv4();

    const requestTemplate = {
      user: {
        uid: uuidv4(),
      },
      req_params: {
        speaker: voice,
        audio_params: {
          format: 'pcm',
          sample_rate: 24000,
          enable_timestamp: true,
        },
        additions: JSON.stringify({
          disable_markdown_filter: true,
          enable_word_timestamps: true,
        }),
      },
    };

    // 按句号分割文本，如果没有句号则整个文本作为一句
    let sentences = text.split('。').filter((s) => s.trim().length > 0);
    if (sentences.length === 0) {
      sentences = [text.trim()];
    }
    if (sentences.length === 0 || sentences[0].length === 0) {
      throw new Error('Text cannot be empty');
    }

    const session: TtsSession = {
      sessionId,
      ws,
      voice,
      audioChunks: [],
      isActive: true,
    };

    this.sessions.set(sessionId, session);

    // 为每个句子创建会话
    for (let i = 0; i < sentences.length; i++) {
      const sentenceSessionId = `${sessionId}_${i}`;

      await StartSession(
        ws,
        new TextEncoder().encode(
          JSON.stringify({
            ...requestTemplate,
            event: EventType.StartSession,
          }),
        ),
        sentenceSessionId,
      );

      await WaitForEvent(
        ws,
        MsgType.FullServerResponse,
        EventType.SessionStarted,
      );

      // 逐字符发送
      for (const char of sentences[i]) {
        await TaskRequest(
          ws,
          new TextEncoder().encode(
            JSON.stringify({
              ...requestTemplate,
              req_params: {
                ...requestTemplate.req_params,
                text: char,
              },
              event: EventType.TaskRequest,
            }),
          ),
          sentenceSessionId,
        );
      }

      await FinishSession(ws, sentenceSessionId);

      // 接收音频数据
      const sentenceAudio: Uint8Array[] = [];
      while (true) {
        const msg = await ReceiveMessage(ws);

        if (msg.type === MsgType.AudioOnlyServer) {
          sentenceAudio.push(msg.payload);
        } else if (
          msg.type === MsgType.FullServerResponse &&
          msg.event === EventType.SessionFinished
        ) {
          break;
        }
      }

      // 合并音频
      if (sentenceAudio.length > 0) {
        const totalLength = sentenceAudio.reduce(
          (sum, chunk) => sum + chunk.length,
          0,
        );
        const mergedAudio = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of sentenceAudio) {
          mergedAudio.set(chunk, offset);
          offset += chunk.length;
        }
        session.audioChunks.push(mergedAudio);
      }
    }

    return sessionId;
  }

  /**
   * 完成TTS会话并返回音频数据
   */
  finishSession(sessionId: string): Buffer {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.audioChunks.length === 0) {
      throw new Error('No audio data received');
    }

    // 合并所有音频块
    const totalLength = session.audioChunks.reduce(
      (sum, chunk) => sum + chunk.length,
      0,
    );
    const mergedAudio = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of session.audioChunks) {
      mergedAudio.set(chunk, offset);
      offset += chunk.length;
    }

    this.sessions.delete(sessionId);
    return Buffer.from(mergedAudio);
  }

  /**
   * 关闭连接
   */
  async closeConnection(ws: WebSocket): Promise<void> {
    try {
      await FinishConnection(ws);
      await WaitForEvent(
        ws,
        MsgType.FullServerResponse,
        EventType.ConnectionFinished,
      );
      ws.close();
    } catch (error) {
      this.logger.error('Error closing TTS connection:', error);
      ws.close();
    }
  }

  /**
   * 清理会话
   */
  cleanupSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

