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
import { AgentService } from './agent.service';
import { UserType } from 'src/common/decorators/user-type.decorator';

@ApiTags('智能体')
@Controller('agent')
export class AgentController {
  constructor(
    private readonly mastraService: MastraService,
    private readonly agentService: AgentService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: '健康检查' })
  @ApiResponse({ status: 200, description: '服务状态正常' })
  @UserType('onlyAdmin')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'ArtInspire Wind in the Willows Agent'
    };
  }

  @Post('chat')
  @ApiOperation({ summary: '与角色同步聊天' })
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
  @ApiOperation({ summary: '与角色流式聊天' })
  async streamChat(@Query(new ZodValidationPipe(ChatRequestSchema)) query: ChatRequestDto) {
    const { message, character } = query;
    const stream = await this.mastraService.streamChatWithCharacter(message, character);
    return new Observable((subscriber) => {
      void stream.pipeTo(new WritableStream({
        write(chunk: string) {
          subscriber.next({ 
            content: chunk,
            timestamp: new Date()
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

  @Get('test/chat')
  @UserType('beyondVisitor')
  @ApiOperation({ summary: '(测试用)对话', })
  @ApiResponse({ status: 200, description: '对话测试结果' })
  async testChat(@Query('message') message: string) {
    return this.mastraService.syncChat(message);
  }

  @Get('test/rag/query')
  @UserType('onlyAdmin')
  @ApiOperation({ summary: '(测试用)RAG查询效果' })
  @ApiResponse({ status: 200, description: 'RAG查询测试结果' })
  async testRagQuery(@Query('text') text: string) {
    return this.mastraService.ragQueryTest(text);
  }
} 