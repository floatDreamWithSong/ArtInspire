import { Controller, Get, Post, Body, Query, Sse, UsePipes } from '@nestjs/common';
import { MastraService } from './mastra';
import { Observable } from 'rxjs';
import { 
  ChatRequestDto, 
  ChatResponseDto, 
  ChatRequestSchema,
} from './dto/chat.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validate.pipe';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('智能体')
@Controller('agent')
export class AgentController {
  constructor(
    private readonly mastraService: MastraService
  ) {}

  @Get('health')
  @ApiOperation({ summary: '健康检查' })
  @ApiResponse({ status: 200, description: '服务状态正常' })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'ArtInspire Wind in the Willows Agent'
    };
  }

  @Post('chat')
  @ApiOperation({ summary: '与角色聊天' })
  @ApiResponse({ status: 200, description: '聊天响应', type: Object })
  @UsePipes(new ZodValidationPipe(ChatRequestSchema))
  async chat(@Body() request: ChatRequestDto): Promise<ChatResponseDto> {
    const { message, character } = request;

    const reply = await this.mastraService.chatWithCharacter(message, character);
    
    return {
      reply,
      character,
      timestamp: new Date()
    };
  }

  @Sse('chat/stream')
  @ApiOperation({ summary: '流式聊天' })
  async streamChat(@Query(new ZodValidationPipe(ChatRequestSchema)) query: ChatRequestDto) {
    const { message, character } = query;

    const stream = await this.mastraService.streamChatWithCharacter(message, character);
    
    return new Observable((subscriber) => {
      stream.pipeTo(new WritableStream({
        write(chunk) {
          subscriber.next({ 
            content: chunk,
            timestamp: new Date().toISOString()
          });
        },
        close() {
          subscriber.complete();
        },
        abort(err) {
          subscriber.error(err);
        }
      }));
    });
  }

  @Get('characters')
  @ApiOperation({ summary: '获取可用角色列表' })
  @ApiResponse({ status: 200, description: '角色列表' })
  getCharacters() {
    return this.mastraService.getAvailableCharacters();
  }

  @Post('rag/init')
  @ApiOperation({ summary: '初始化RAG系统' })
  @ApiResponse({ status: 200, description: 'RAG初始化结果' })
  async initializeRag() {
    return await this.mastraService.initializeRag();
  }

  @Get('rag/status')
  @ApiOperation({ summary: '获取RAG状态' })
  @ApiResponse({ status: 200, description: 'RAG状态信息' })
  async getRagStatus() {
    return await this.mastraService.getRagStatus();
  }

  @Get('chat/test')
  @ApiOperation({ summary: '测试聊天功能' })
  @ApiResponse({ status: 200, description: '聊天测试结果' })
  async testChat(@Query('message') message: string) {
    return this.mastraService.syncChat(message);
  }

  @Get('test/rag/query')
  @ApiOperation({ summary: '测试RAG查询' })
  @ApiResponse({ status: 200, description: 'RAG查询测试结果' })
  async testRagQuery() {
    // 测试RAG效果，PgVector, 阿里 Embedding
    return this.mastraService.ragQueryTest();
  }
} 