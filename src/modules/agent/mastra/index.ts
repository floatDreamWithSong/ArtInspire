import { Injectable, Logger } from '@nestjs/common';
import { WindInWillowsAgentService } from './agents/wind-in-willows';
import { CharacterType } from 'unmerged-projects/agent-project/src/mastra/agents';
import { RagService } from './rag';
import { ModelService } from './model';

@Injectable()
export class MastraService {
  private readonly logger = new Logger(MastraService.name);

  constructor(
    private windInWillowsService: WindInWillowsAgentService,
    private ragService: RagService,
    private modelService: ModelService,
  ) {}

  // 柳林风声智能体相关方法
  async chatWithCharacter(message: string, character: CharacterType): Promise<string> {
    this.logger.log(`聊天请求 - 角色: ${character}, 消息: ${message}`);
    return await this.windInWillowsService.chatWithCharacter(message, character);
  }

  async streamChatWithCharacter(message: string, character: CharacterType): Promise<ReadableStream> {
    this.logger.log(`流式聊天请求 - 角色: ${character}, 消息: ${message}`);
    return await this.windInWillowsService.streamChatWithCharacter(message, character);
  }

  getAvailableCharacters() {
    return {
      characters: this.windInWillowsService.getAllCharacters(),
      count: Object.keys(this.windInWillowsService.getAllCharacters()).length,
    };
  }

  // RAG相关方法
  // async initializeRag() {
  //   try {
  //     this.logger.log('开始初始化RAG系统...');
      
  //     // 创建索引
  //     await this.ragService.initRag();
      
  //     // 导入《柳林风声》故事内容
  //     const { store } = await import('../constant/story');
  //     await this.ragService.updateRagByText(store);
      
  //     this.logger.log('RAG系统初始化完成');
  //     return { 
  //       success: true, 
  //       message: 'RAG系统初始化成功，已导入《柳林风声》故事内容' 
  //     };
  //   } catch (error) {
  //     this.logger.error('RAG初始化失败:', error);
  //     const errorMessage = error instanceof Error ? error.message : String(error);
  //     return { 
  //       success: false, 
  //       message: `RAG初始化失败: ${errorMessage}` 
  //     };
  //   }
  // }

  async getRagStatus() {
    try {
      // 测试RAG查询功能
      const testResults = await this.ragService.textRagQuery('河鼠');
      return {
        status: 'active',
        indexedContent: testResults.length > 0,
        lastTest: new Date().toISOString(),
        resultCount: testResults.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        status: 'error',
        error: errorMessage,
        lastTest: new Date().toISOString(),
      };
    }
  }

  // 通用聊天方法
  async syncChat(message: string) {
    try {
      const model = this.modelService.getOpenAI()('qwen-turbo');
      const { text } = await model.doGenerate({
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: [{ role: 'user', content: [{ type: 'text', text: message }] }],
      });
      return { response: text };
    } catch (error) {
      this.logger.error('同步聊天失败:', error);
      throw error;
    }
  }

  async ragQueryTest(testQuery : string) {
    const results = await this.ragService.textRagQuery(testQuery);
    return {
      query: testQuery,
      results: results,
      count: results.length,
    };
  }

  // 聊天历史管理方法
  async getUserChatThreads(userId: string) {
    this.logger.log(`获取用户聊天线程 - 用户ID: ${userId}`);
    try {
      const threads = await this.windInWillowsService.getUserThreads(userId);
      return {
        success: true,
        threads,
        count: threads.length,
      };
    } catch (error) {
      this.logger.error('获取用户聊天线程失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        threads: [],
        count: 0,
      };
    }
  }

  async getChatThreadById(threadId: string) {
    this.logger.log(`获取聊天线程详情 - 线程ID: ${threadId}`);
    try {
      const thread = await this.windInWillowsService.getThreadById(threadId);
      return {
        success: true,
        thread,
      };
    } catch (error) {
      this.logger.error('获取聊天线程详情失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        thread: null,
      };
    }
  }

  async getChatThreadMessages(
    threadId: string,
    options?: {
      userId?: string;
      limit?: number;
      searchQuery?: string;
    }
  ) {
    this.logger.log(`获取聊天消息记录 - 线程ID: ${threadId}, 选项:`, options);
    try {
      const result = await this.windInWillowsService.getThreadMessages(threadId, options);
      return {
        success: true,
        ...result,
        count: result.messages.length,
      };
    } catch (error) {
      this.logger.error('获取聊天消息记录失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        messages: [],
        uiMessages: [],
        count: 0,
      };
    }
  }

  async createChatThread(
    userId: string,
    character: CharacterType,
    title?: string
  ) {
    this.logger.log(`创建聊天线程 - 用户ID: ${userId}, 角色: ${character}, 标题: ${title}`);
    try {
      const thread = await this.windInWillowsService.createChatThread(userId, character, title);
      return {
        success: true,
        thread,
      };
    } catch (error) {
      this.logger.error('创建聊天线程失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        thread: null,
      };
    }
  }
} 