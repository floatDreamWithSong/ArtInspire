import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Configurations } from 'src/common/config';

@Injectable()
export class WsConnectionManager {
  private readonly logger = new Logger(WsConnectionManager.name);
  private activeConnections = 0;
  private get MAX_CONNECTIONS() {
    return Configurations.TTS_MAX_CONNECTIONS;
  }

  /**
   * 尝试获取一个连接
   * @returns true 如果成功获取连接，false 如果已达到最大连接数
   */
  acquireConnection(): boolean {
    if (this.activeConnections >= this.MAX_CONNECTIONS) {
      this.logger.warn(
        `Connection limit reached: ${this.activeConnections}/${this.MAX_CONNECTIONS}`,
      );
      return false;
    }

    this.activeConnections++;
    this.logger.log(
      `Connection acquired: ${this.activeConnections}/${this.MAX_CONNECTIONS}`,
    );
    return true;
  }

  /**
   * 释放一个连接
   */
  releaseConnection(): void {
    if (this.activeConnections > 0) {
      this.activeConnections--;
      this.logger.log(
        `Connection released: ${this.activeConnections}/${this.MAX_CONNECTIONS}`,
      );
    } else {
      this.logger.warn('Attempted to release connection when count is already 0');
    }
  }

  /**
   * 获取当前活跃连接数
   */
  getActiveConnectionCount(): number {
    return this.activeConnections;
  }

  /**
   * 获取最大连接数
   */
  getMaxConnections(): number {
    return this.MAX_CONNECTIONS;
  }
}

