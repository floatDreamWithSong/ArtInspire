import { Injectable } from '@nestjs/common';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { ModelService } from '../../model';
import { RagService } from '../../rag';
import { ConfigurationService } from '../../config/configuration';
import { PgVector, PostgresStore } from '@mastra/pg';
import { fastembed } from '@mastra/fastembed';
import { CharacterType, CharacterConfig } from 'unmerged-projects/agent-project/src/mastra/agents';
import { charactersConfig } from 'src/modules/agent/constant/character';



@Injectable()
export class WindInWillowsAgentService {
  private agents: Map<CharacterType, Agent> = new Map();
  private memory: Memory;
  private characters: Record<CharacterType, CharacterConfig>;

  constructor(
    private readonly modelService: ModelService,
    private readonly ragService: RagService,
    private readonly configService: ConfigurationService,
  ) {
    this.characters = charactersConfig
    this.initializeMemory();
    this.initializeAgents();
  }

  private initializeMemory() {
    this.memory = new Memory({
      storage: new PostgresStore({
        connectionString: this.configService.pgVectorConfig.connectionString,
      }),
      vector: new PgVector({
        connectionString: this.configService.pgVectorConfig.connectionString,
      }),
      embedder: fastembed,
      options: {
        lastMessages: 10,
        semanticRecall: {
          topK: 5,
          messageRange: 3,
        },
        threads: {
          generateTitle: true,
        },
      },
    });
  }

  private initializeAgents() {
    Object.entries(this.characters).forEach(([type, config]) => {
      const agent = new Agent({
        name: config.name,
        instructions: `${config.instructions}

你需要基于提供的相关材料来回答问题，但要用你的角色性格来表达。
如果材料中没有相关信息，请诚实说明，但仍然用你的角色特点来安慰和支持孩子。
记住，你的主要任务是帮助和安慰有心理问题的小朋友，用温暖、理解和智慧来回应他们。`,
        model: this.modelService.getOpenAI()('qwen-turbo'),
        memory: this.memory,
      });

      this.agents.set(type as CharacterType, agent);
    });
  }

  async chatWithCharacter(
    message: string, 
    character: CharacterType, 
    threadId?: string,
    userId?: string
  ): Promise<string> {
    const agent = this.agents.get(character);
    if (!agent) {
      throw new Error(`角色 ${character} 不存在`);
    }

    // 先使用RAG搜索相关材料
    const ragResults = await this.ragService.textRagQuery(message);
    const contextMaterial = ragResults
      .map((result, index) => `参考材料${index + 1}: ${result.metadata?.text || ''}`)
      .join('\n\n');

    const characterConfig = this.characters[character];
    const enhancedPrompt = `作为${characterConfig.chineseName}（${characterConfig.name}），请基于以下材料回答孩子的问题：

【参考材料】
${contextMaterial}

【孩子的问题】
${message}

请用${characterConfig.chineseName}的性格特点（${characterConfig.personality}）来回答，要温暖、有同理心，并且适合孩子理解。`;

    const response = await agent.generate(enhancedPrompt, {
      threadId: threadId || `thread_${userId || 'anonymous'}_${character}`,
      resourceId: userId || 'anonymous',
      memoryOptions: {
        lastMessages: 5,
        semanticRecall: {
          topK: 3,
          messageRange: 2,
        },
      },
    });

    return response.text;
  }

  async streamChatWithCharacter(
    message: string, 
    character: CharacterType,
    threadId?: string,
    userId?: string
  ): Promise<ReadableStream> {
    const agent = this.agents.get(character);
    if (!agent) {
      throw new Error(`角色 ${character} 不存在`);
    }

    // RAG搜索
    const ragResults = await this.ragService.textRagQuery(message);
    const contextMaterial = ragResults
      .map((result, index) => `参考材料${index + 1}: ${result.metadata?.text || ''}`)
      .join('\n\n');

    const characterConfig = this.characters[character];
    const enhancedPrompt = `作为${characterConfig.chineseName}（${characterConfig.name}），请基于以下材料回答孩子的问题：

【参考材料】
${contextMaterial}

【孩子的问题】
${message}

请用${characterConfig.chineseName}的性格特点（${characterConfig.personality}）来回答，要温暖、有同理心，并且适合孩子理解。`;

    // 使用模型直接生成流式响应
    const model = this.modelService.getOpenAI()('qwen-turbo');
    const result = await model.doStream({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: [{ role: 'user', content: [{ type: 'text', text: enhancedPrompt }] }],
    });

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            if (chunk.type === 'text-delta') {
              controller.enqueue(chunk.textDelta);
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });
  }

  getCharacterInfo(character: CharacterType): CharacterConfig | null {
    return this.characters[character] || null;
  }

  getAllCharacters(): Record<CharacterType, CharacterConfig> {
    return this.characters;
  }

  getAgent(character: CharacterType): Agent | null {
    return this.agents.get(character) || null;
  }
} 