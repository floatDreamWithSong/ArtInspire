import { charactersConfig } from "src/modules/agent/constant/character";
import { CharacterType, CharacterConfig } from "unmerged-projects/agent-project/src/mastra/agents";
import { ConfigurationService } from "../../config/configuration";
import { ModelService } from "../../model";
import { RagService } from "../../rag";
import { Memory } from "@mastra/memory";
import { Agent } from "@mastra/core/agent";

export class WindInWillowsAgent {
  protected agents: Map<CharacterType, Agent> = new Map();
  protected characters: Record<CharacterType, CharacterConfig>;
  protected modelService: ModelService
  protected ragService: RagService
  protected configService: ConfigurationService
  constructor(
    private _modelService: ModelService,
    private _ragService: RagService,
    private _configService: ConfigurationService,
  ) {
    this.modelService = _modelService
    this.ragService = _ragService
    this.configService = _configService

    this.characters = charactersConfig
    this.initializeAgents();
  }
  protected initializeAgents(memory?: Memory) {
    Object.entries(this.characters).forEach(([type, config]) => {
      const agent = new Agent({
        name: config.name,
        instructions: `${config.instructions}

你需要基于提供的相关信息来回答问题，但要用你的角色性格来表达。
如果材料中没有相关信息，请诚实说明，但仍然用你的角色特点来安慰和支持孩子。
你的主要任务是帮助和安慰有心理问题的小朋友，用温暖、理解和智慧来回应他们。`,
        model: this.modelService.getOpenAI()('qwen-turbo'),
        memory,
      });

      this.agents.set(type as CharacterType, agent);
    });
  }

  /**
   * 准备对话上下文，包括RAG检索和提示词构建
   */
  protected async prepareConversationContext(
    message: string,
    character: CharacterType
  ): Promise<{
    agent: Agent;
    enhancedPrompt: string;
  }> {
    const agent = this.agents.get(character);
    if (!agent) {
      throw new Error(`角色 ${character} 不存在`);
    }

    // RAG搜索相关材料
    const ragResults = await this.ragService.textRagQuery(message);
    const contextMaterial = ragResults
      .map((result, index) => `参考材料${index + 1}: ${result.metadata?.text || ''}`)
      .join('\n\n');

    const characterConfig = this.characters[character];
    const enhancedPrompt = `作为${characterConfig.chineseName}（${characterConfig.name}），请基于以下材料回答孩子的问题：

【参考材料】
${contextMaterial}

请用${characterConfig.chineseName}的性格特点（${characterConfig.personality}）来回答，要温暖、有同理心，并且适合孩子理解。`;

    return {
      agent,
      enhancedPrompt,
    };
  }

  public getAllCharacters(): Record<CharacterType, CharacterConfig> {
    return this.characters;
  }

  public async streamChatWithCharacter(
    message: string,
    character: CharacterType,
    threadId: string,
    userId: string,
    recordHistory: boolean = true
  ): Promise<ReadableStream> {
    const { agent, enhancedPrompt } = await this.prepareConversationContext(message, character);
    // 使用agent的stream方法进行流式对话
    const stream = await agent.stream([{
      role: 'system',
      content: enhancedPrompt
    }, {
      role: 'user',
      content: message
    }], {
      threadId: threadId || `thread_${userId || 'anonymous'}_${character}`,
      resourceId: userId || 'anonymous',
      memoryOptions: recordHistory ? {
        lastMessages: 10,
        semanticRecall: {
          topK: 3,
          messageRange: 2,
        },
      } : void 0,
    });

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream.textStream) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });
  }
}