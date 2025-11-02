import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, OnModuleDestroy, UnauthorizedException } from '@nestjs/common';
import { Server } from 'ws';
import { TtsService } from './tts.service';
import { WsConnectionManager } from 'src/common/utils/tts/ws-connection-manager';
import { JwtUtils } from 'src/common/utils/jwt/jwt.service';
import {
  FrontMessage,
  OpenRequest,
  TtsRequest,
  AuthResponse,
  TtsError,
  TtsEnd,
} from 'src/types/tts';
import { JwtPayload } from 'src/types/jwt';
import { WebSocket } from 'ws';

interface ClientSocket extends WebSocket {
  user?: JwtPayload;
}

interface ClientConnection {
  ws: ClientSocket;
  user?: JwtPayload;
  ttsWs?: WebSocket;
  sessionId?: string;
  authenticated: boolean;
  order: number;
  resourceId?: string;
  connectId?: string;
  createdAt: number; // 连接创建时间戳（毫秒）
  lastActivityAt: number; // 最后活动时间戳（毫秒）
}

@WebSocketGateway({
  path: '/tts',
  transports: ['websocket'],
})
export class TtsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TtsGateway.name);
  private clients = new Map<ClientSocket, ClientConnection>();
  private orderCounter = 0;
  private readonly IDLE_TIMEOUT = 30_000; // 30秒空闲超时（毫秒）
  private readonly MAX_CONNECTION_TIME = 600_000; // 10分钟最大连接时间（毫秒）
  private timeoutCheckInterval?: NodeJS.Timeout;

  constructor(
    private readonly ttsService: TtsService,
    private readonly connectionManager: WsConnectionManager,
    private readonly jwtUtils: JwtUtils,
  ) {}

  afterInit() {
    this.logger.log('TTS WebSocket Gateway initialized');
    // 启动定时器检查连接超时（每10秒检查一次）
    this.timeoutCheckInterval = setInterval(() => {
      this.checkConnectionTimeouts();
    }, 10000);
    this.logger.log(
      `Connection timeout monitor started (idle: ${this.IDLE_TIMEOUT / 1000}s, max: ${this.MAX_CONNECTION_TIME / 1000}s)`,
    );
  }

  /**
   * 检查并关闭超时的连接
   */
  private checkConnectionTimeouts() {
    const now = Date.now();
    const clientsToClose: ClientSocket[] = [];

    for (const [client, connection] of this.clients.entries()) {
      const idleTime = now - connection.lastActivityAt;
      const connectionAge = now - connection.createdAt;

      // 检查空闲超时（30秒无消息）
      if (idleTime > this.IDLE_TIMEOUT) {
        this.logger.warn(
          `Connection idle timeout: ${idleTime / 1000}s (client: ${connection.order})`,
        );
        clientsToClose.push(client);
        continue;
      }

      // 检查最大连接时间（10分钟）
      if (connectionAge > this.MAX_CONNECTION_TIME) {
        this.logger.warn(
          `Connection max time exceeded: ${connectionAge / 1000}s (client: ${connection.order})`,
        );
        clientsToClose.push(client);
      }
    }

    // 关闭超时的连接
    for (const client of clientsToClose) {
      this.closeConnectionWithReason(client, '连接超时已关闭');
    }
  }

  /**
   * 关闭连接并发送原因
   */
  private closeConnectionWithReason(client: ClientSocket, reason: string) {
    const connection = this.clients.get(client);
    if (!connection) {
      return;
    }

    try {
      const errorMsg: TtsError = {
        type: 'backend-error',
        message: reason,
      };
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(errorMsg));
      }
    } catch (error) {
      this.logger.error('Error sending timeout message:', error);
    }

    // 清理连接
    this.cleanupConnection(client);
  }

  /**
   * 清理连接资源
   */
  private cleanupConnection(client: ClientSocket) {
    const connection = this.clients.get(client);
    if (connection) {
      // 清理TTS连接
      if (connection.ttsWs) {
        this.ttsService.closeConnection(connection.ttsWs).catch((err) => {
          this.logger.error('Error closing TTS connection:', err);
        });
      }

      // 清理会话
      if (connection.sessionId) {
        this.ttsService.cleanupSession(connection.sessionId);
      }

      this.clients.delete(client);
      this.connectionManager.releaseConnection();
      this.logger.log(
        `Connection cleaned up. Remaining: ${this.connectionManager.getActiveConnectionCount()}`,
      );
    }

    // 关闭WebSocket连接
    if (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING) {
      client.close();
    }
  }

  /**
   * 更新连接的最后活动时间
   */
  private updateLastActivity(connection: ClientConnection) {
    connection.lastActivityAt = Date.now();
  }

  onModuleDestroy() {
    // 清理定时器
    if (this.timeoutCheckInterval) {
      clearInterval(this.timeoutCheckInterval);
      this.logger.log('Connection timeout monitor stopped');
    }

    // 关闭所有连接
    for (const client of this.clients.keys()) {
      this.cleanupConnection(client);
    }
  }

  handleConnection(client: ClientSocket) {
    this.logger.log(`Client attempting to connect`);

    // 检查并发限制
    if (!this.connectionManager.acquireConnection()) {
      this.logger.warn('Connection rejected: server at capacity');
      const errorMsg: TtsError = {
        type: 'backend-error',
        message: '服务器繁忙，当前使用人数较多，请稍后再试',
      };
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(errorMsg));
      }
      client.close();
      return;
    }

    // 初始化客户端连接
    const now = Date.now();
    const connection: ClientConnection = {
      ws: client,
      authenticated: false,
      order: this.orderCounter++,
      createdAt: now,
      lastActivityAt: now,
    };
    this.clients.set(client, connection);

    // 设置消息处理器（原生ws适配器需要手动处理消息）
    client.on('message', (data: Buffer | string) => {
      // 更新最后活动时间
      this.updateLastActivity(connection);

      // 判断是文本消息还是二进制消息
      if (Buffer.isBuffer(data)) {
        // 检查是否是二进制消息（音频数据，第一个字节是0x01）
        if (data.length > 0 && data[0] === 0x01) {
          // 二进制音频消息（客户端发送音频，暂不支持）
          this.logger.warn('Received binary audio message from client (not supported)');
        } else {
          // 文本消息（JSON）
          this.handleClientMessage(client, data.toString('utf8'));
        }
      } else {
        // 文本消息
        this.handleClientMessage(client, data);
      }
    });

    this.logger.log(
      `Client connected. Total: ${this.connectionManager.getActiveConnectionCount()}`,
    );
  }

  private handleClientMessage(client: ClientSocket, data: string) {
    const connection = this.clients.get(client);
    if (!connection) {
      this.logger.warn('Message from unknown client');
      return;
    }

    try {
      const parsedData = JSON.parse(data) as FrontMessage;
      const message: FrontMessage = parsedData;

      this.logger.log(`Received message type: ${message.type}`);

      // 处理认证消息
      if (message.type === 'front-auth') {
        this.handleAuthMessage(client, connection, message);
        return;
      }

      // 处理TTS请求（需要认证）
      if (message.type === 'front-tts') {
        void this.handleTtsRequest(client, connection, message);
        return;
      }

      const unknownMessage = message as { type?: string };
      this.logger.warn(`Unknown message type: ${unknownMessage.type || 'unknown'}`);
    } catch (error) {
      this.logger.error('Error handling message:', error);
      const errorMsg: TtsError = {
        type: 'backend-error',
        message: error instanceof Error ? error.message : '处理消息时发生错误',
      };
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(errorMsg));
        this.updateLastActivity(connection);
      }
    }
  }


  handleDisconnect(client: ClientSocket) {
    this.cleanupConnection(client);
    this.logger.log(
      `Client disconnected. Remaining: ${this.connectionManager.getActiveConnectionCount()}`,
    );
  }

  private handleAuthMessage(
    client: ClientSocket,
    connection: ClientConnection,
    message: OpenRequest,
  ) {
    try {
      // 验证token
      if (!message.token) {
        throw new UnauthorizedException('Token未提供');
      }
      if (!message.resourceId) {
        throw new UnauthorizedException('Resource ID未提供');
      }
      if (!message.connectId) {
        throw new UnauthorizedException('Connect ID未提供');
      }

      const payload = this.jwtUtils.verify(message.token);

      // 保存用户信息和连接参数
      connection.authenticated = true;
      connection.user = payload;
      connection.resourceId = message.resourceId;
      connection.connectId = message.connectId;
      client.user = payload;

      // 发送认证成功响应
      const authResponse: AuthResponse = {
        type: 'backend-auth',
      };
      client.send(JSON.stringify(authResponse));
      this.updateLastActivity(connection); // 更新最后活动时间

      this.logger.log(
        `Client authenticated: ${payload.uid}, resourceId: ${message.resourceId}, connectId: ${message.connectId}`,
      );
    } catch (error) {
      this.logger.error('Authentication failed:', error);
      const errorMsg: TtsError = {
        type: 'backend-error',
        message:
          error instanceof UnauthorizedException
            ? error.message
            : '认证失败，请检查token',
      };
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(errorMsg));
      }
      this.cleanupConnection(client);
    }
  }

  private async handleTtsRequest(
    client: ClientSocket,
    connection: ClientConnection,
    message: TtsRequest,
  ) {
    // 检查认证状态
    if (!connection.authenticated || !client.user) {
      const errorMsg: TtsError = {
        type: 'backend-error',
        message: '未认证，请先完成认证',
      };
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(errorMsg));
        this.updateLastActivity(connection);
      }
      return;
    }

    try {
      // 验证 connectId
      if (!message.connectId) {
        throw new Error('Connect ID未提供');
      }

      // 验证连接是否已认证并保存了 resourceId
      if (!connection.resourceId || !connection.connectId) {
        throw new Error('未认证或认证信息不完整');
      }

      // 验证 connectId 是否匹配
      if (message.connectId !== connection.connectId) {
        throw new Error('Connect ID不匹配');
      }

      // 创建或复用TTS连接
      if (!connection.ttsWs) {
        connection.ttsWs = await this.ttsService.createConnection(
          connection.resourceId,
          connection.connectId,
        );
      }

      // 启动TTS会话
      const sessionId = await this.ttsService.startSession(
        connection.ttsWs,
        message.text,
        message.voice,
      );
      connection.sessionId = sessionId;

      // 获取音频数据
      const audioBuffer = this.ttsService.finishSession(sessionId);
      connection.sessionId = undefined;

      // 将音频分成多个块发送（使用二进制传输）
      const chunkSize = 16384; // 16KB per chunk (二进制传输可以更大)
      let order = 0;

      for (let i = 0; i < audioBuffer.length; i += chunkSize) {
        const chunk = audioBuffer.slice(i, i + chunkSize);

        // 发送二进制消息格式：
        // [1 byte: message type (0x01 = audio)]
        // [4 bytes: order (big-endian uint32)]
        // [audio bytes: PCM audio data]

        const headerSize = 1 + 4; // type + order
        const totalSize = headerSize + chunk.length;

        const binaryMsg = Buffer.allocUnsafe(totalSize);
        let offset = 0;

        // 消息类型：0x01 = 音频块
        binaryMsg[offset++] = 0x01;

        // Order (4 bytes, big-endian)
        binaryMsg.writeUInt32BE(order++, offset);
        offset += 4;

        // Audio data
        chunk.copy(binaryMsg, offset);

        // 发送二进制消息
        if (client.readyState === WebSocket.OPEN) {
          client.send(binaryMsg);
          this.updateLastActivity(connection); // 更新最后活动时间（发送消息也算活动）
        }
      }

      // 发送结束消息（文本格式）
      const endMsg: TtsEnd = {
        type: 'backend-end',
      };
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(endMsg));
        this.updateLastActivity(connection);
      }
    } catch (error) {
      this.logger.error('TTS request failed:', error);
      const errorMsg: TtsError = {
        type: 'backend-error',
        message: error instanceof Error ? error.message : 'TTS处理失败',
      };
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(errorMsg));
        this.updateLastActivity(connection);
      }

      // 清理会话
      if (connection.sessionId) {
        this.ttsService.cleanupSession(connection.sessionId);
        connection.sessionId = undefined;
      }
    }
  }
}

