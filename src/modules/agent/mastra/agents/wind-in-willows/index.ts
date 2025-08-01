import { Injectable } from '@nestjs/common';
import { Memory } from '@mastra/memory';
import { ModelService } from '../../model';
import { RagService } from '../../rag';
import { ConfigurationService } from '../../config/configuration';
import { PgVector, PostgresStore } from '@mastra/pg';
import { fastembed } from '@mastra/fastembed';
import { WindInWillowsAgent } from './base';



@Injectable()
export class WindInWillowsAgentService extends WindInWillowsAgent {
  private memory: Memory;

  constructor(
    protected modelService: ModelService,
    protected ragService: RagService,
    protected configService: ConfigurationService,
  ) {
    const _memory = new Memory({
      storage: new PostgresStore({
        connectionString: configService.pgVectorConfig.connectionString,
      }),
      vector: new PgVector({
        connectionString: configService.pgVectorConfig.connectionString,
      }),
      embedder: fastembed,
      options: {
        lastMessages: 10,
        semanticRecall: {
          topK: 3,
          messageRange: 4,
        },
        threads: {
          generateTitle: false,
        },
      },
    });
    super(modelService, ragService, configService, _memory)
    this.memory = _memory
  }

  private assertMemo() {
    if (!this.memory) {
      throw new Error('Memory 系统未初始化');
    }
  }

  /**
   * 获取用户的所有聊天线程
   */
  async getUserThreads(userId: number): Promise<Array<{
    id: string;
    resourceId: string;
    title?: string;
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, unknown>;
  }>> {
    if (!this.memory) {
      throw new Error('Memory 系统未初始化');
    }

    const threads = await this.memory.getThreadsByResourceId({
      resourceId: userId.toString(),
    });

    return threads;
  }

  /**
   * 获取特定线程的信息(调试用)
   */
  async getThreadById(threadId: string): Promise<{
    id: string;
    resourceId: string;
    title?: string;
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, unknown>;
  } | null> {
    this.assertMemo()

    const thread = await this.memory.getThreadById({ threadId });
    return thread;
  }

  /**
   * 获取线程中的聊天消息记录
   */
  async getThreadMessages(
    threadId: string,
    userId: number,
    limit?: number,
    searchQuery?: string,
    beforeId?: string  // 获取指定消息ID之前的消息，用于分页
  ): Promise<{
    messages: any[];
    uiMessages: any[];
  }> {
    this.assertMemo()

    // 如果有 beforeId，使用 include 参数获取该消息之前的内容
    if (beforeId && !searchQuery) {
      const result = await this.memory.query({
        resourceId: userId.toString(),
        threadId,
        selectBy: {
          last: 0,
          include: [{
            id: beforeId,
            withPreviousMessages: limit || 20,  // 获取该消息之前的消息，默认20条
            withNextMessages: 0  // 不包含后续消息
          }],
        },
      });
      
      return result;
    }

    // 原有的查询逻辑
    const result = await this.memory.query(
      {
        resourceId: userId.toString(),
        threadId,
        selectBy: {
          last: limit || 20,  // 默认20条
          vectorSearchString: searchQuery,
        },
        threadConfig: searchQuery ? {
          semanticRecall: {
            topK: 3,
            messageRange: 2,
          },
        } : void 0,
      }
    );
    return result;
  }

  async deleteThread(threadId: string) {
    this.assertMemo()

    await this.memory.deleteThread(threadId);
  }
}

@Injectable()
export class WindInWillowsAgentServiceForVisitor extends WindInWillowsAgent {
  constructor(
    protected modelService: ModelService,
    protected ragService: RagService,
    protected configService: ConfigurationService,
  ) {
    super(modelService, ragService, configService)
  }
}