import { Controller, Get, Post, Body, Query, Sse, UsePipes } from '@nestjs/common';
import { MastraService } from './mastra';
import { Observable } from 'rxjs';
import { 
  ChatRequestDto, 
  ChatResponseDto, 
  ChatRequestSchema,
  GetThreadsQueryDto,
  GetThreadsQuerySchema,
  GetThreadByIdQueryDto,
  GetThreadByIdQuerySchema,
  GetThreadMessagesQueryDto,
  GetThreadMessagesQuerySchema,
  CreateThreadRequestDto,
  CreateThreadRequestSchema,
  ThreadsResponseDto,
  ThreadResponseDto,
  ThreadMessagesResponseDto,
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
  @ApiResponse({ status: 200, description: '聊天响应', type: ChatResponseDto })
  @UsePipes(new ZodValidationPipe(ChatRequestSchema))
  async chat(@Body() request: ChatRequestDto): Promise<ChatResponseDto> {
    const { message, character } = request;
    const reply = await this.mastraService.chatWithCharacter(message, character);
    return {
      response: reply,
      character,
      timestamp: new Date().toISOString()
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

  // 聊天历史管理接口
  @Get('threads')
  @ApiOperation({ summary: '获取用户的聊天线程列表' })
  @ApiResponse({ status: 200, description: '线程列表', type: ThreadsResponseDto })
  async getUserThreads(@Query(new ZodValidationPipe(GetThreadsQuerySchema)) query: GetThreadsQueryDto): Promise<ThreadsResponseDto> {
    const { userId } = query;
    return await this.mastraService.getUserChatThreads(userId);
  }

  @Get('threads/:threadId')
  @ApiOperation({ summary: '获取特定线程的详细信息' })
  @ApiResponse({ status: 200, description: '线程详情', type: ThreadResponseDto })
  async getThreadById(@Query(new ZodValidationPipe(GetThreadByIdQuerySchema)) query: GetThreadByIdQueryDto): Promise<ThreadResponseDto> {
    const { threadId } = query;
    return await this.mastraService.getChatThreadById(threadId);
  }

  @Get('threads/:threadId/messages')
  @ApiOperation({ summary: '获取线程中的消息记录' })
  @ApiResponse({ status: 200, description: '消息记录', type: ThreadMessagesResponseDto })
  async getThreadMessages(@Query(new ZodValidationPipe(GetThreadMessagesQuerySchema)) query: GetThreadMessagesQueryDto): Promise<ThreadMessagesResponseDto> {
    const { threadId, userId, limit, searchQuery } = query;
    return await this.mastraService.getChatThreadMessages(threadId, { userId, limit, searchQuery });
  }

  @Post('threads')
  @ApiOperation({ summary: '创建新的聊天线程' })
  @ApiResponse({ status: 201, description: '线程创建成功', type: ThreadResponseDto })
  @UsePipes(new ZodValidationPipe(CreateThreadRequestSchema))
  async createThread(@Body() request: CreateThreadRequestDto): Promise<ThreadResponseDto> {
    const { userId, character, title } = request;
    return await this.mastraService.createChatThread(userId, character, title);
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