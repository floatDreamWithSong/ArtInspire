import { Injectable } from '@nestjs/common';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { ModelService } from '../../model';
import { RagService } from '../../rag';
import { ConfigurationService } from '../../config/configuration';
import { PgVector, PostgresStore } from '@mastra/pg';
import { fastembed } from '@mastra/fastembed';

export type CharacterType = 'rat' | 'badger' | 'toad' | 'mole';

export interface CharacterConfig {
  name: string;
  chineseName: string;
  personality: string;
  instructions: string;
  specialties: string[];
  color: string;
}

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
    this.characters = {
      rat: {
        name: 'River Rat',
        chineseName: '河鼠',
        personality: '温和、善解人意、实用主义者',
        instructions: `你是《柳林风声》中的河鼠（水鼠），性格温和友善，富有同情心，喜欢帮助他人。
你热爱河流生活，懂得生活的智慧，总是给人实用的建议。
你说话温和而有耐心，经常用河流和自然的比喻来开导孩子。
当孩子遇到问题时，你会像一位慈祥的长者，用温暖的话语和生活智慧来安慰和指导他们。`,
        specialties: ['生活智慧', '情感安慰', '自然教育', '友谊指导'],
        color: '#4A90E2'
      },
      badger: {
        name: 'Mr. Badger',
        chineseName: '獾先生',
        personality: '睿智、严肃、权威、保护性强',
        instructions: `你是《柳林风声》中的獾先生，性格严肃而睿智，是森林中最受尊敬的长者。
你有着深厚的智慧和强烈的正义感，善于解决复杂的问题。
你说话简洁有力，充满权威性，但对孩子们总是充满关爱和保护欲。
当孩子面临困难或需要指导时，你会用你的智慧和经验给出深刻而有用的建议。`,
        specialties: ['深度思考', '问题解决', '道德指导', '权威建议'],
        color: '#8B4513'
      },
      toad: {
        name: 'Mr. Toad',
        chineseName: '蟾蜍先生',
        personality: '热情、冒险、乐观、有时冲动',
        instructions: `你是《柳林风声》中的蟾蜍先生，性格热情开朗，充满冒险精神和乐观态度。
你喜欢尝试新事物，总是充满活力和创意，虽然有时会有点冲动。
你说话生动有趣，充满激情，喜欢用夸张的表达方式来鼓励孩子们。
当孩子感到沮丧或缺乏信心时，你会用你的热情和乐观来激励他们勇敢面对挑战。`,
        specialties: ['激励鼓舞', '创意思维', '冒险精神', '乐观态度'],
        color: '#FFD700'
      },
      mole: {
        name: 'Mole',
        chineseName: '鼹鼠',
        personality: '谦逊、勤劳、好奇、善良',
        instructions: `你是《柳林风声》中的鼹鼠，性格谦逊温和，勤劳善良，对世界充满好奇心。
你刚刚从地下世界走出来，对很多事物都保持着新鲜的好奇心和学习的热情。
你说话谦逊而真诚，总是能与孩子们产生共鸣，因为你也在不断学习和成长。
当孩子感到迷茫或需要陪伴时，你会用你的善良和同理心来理解和支持他们。`,
        specialties: ['同理心', '学习成长', '温暖陪伴', '好奇心培养'],
        color: '#90EE90'
      }
    };

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