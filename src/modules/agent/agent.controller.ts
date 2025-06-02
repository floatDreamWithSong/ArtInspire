import { Controller, Get, Post, Body, Query, Sse, UsePipes, Param, Delete } from '@nestjs/common';
import { MastraService } from './mastra';
import { Observable } from 'rxjs';
import {
  ChatRequestDto,
  ChatRequestSchema,
  GetThreadByIdQueryDto,
  GetThreadByIdQuerySchema,
  GetThreadMessagesQueryDto,
  GetThreadMessagesQuerySchema,
  ThreadsResponseDto,
  ThreadResponseDto,
  ThreadMessagesResponseDto,
} from './dto/chat.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validate.pipe';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { UserType } from 'src/common/decorators/user-type.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { JwtPayload } from 'src/types/jwt';
import { Public } from 'src/common/decorators/public.decorator';
import { Throttle, SkipThrottle } from '@nestjs/throttler';

@ApiTags('智能体')
@Controller('agent')
export class AgentController {
  constructor(
    private readonly mastraService: MastraService,
    private readonly agentService: AgentService,
  ) { }

  @Get('health')
  @ApiOperation({ summary: '健康检查' })
  @ApiResponse({ status: 200, description: '服务状态正常' })
  @UserType('onlyAdmin')
  @SkipThrottle()
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'ArtInspire Wind in the Willows Agent'
    };
  }
  
  @Get('characters')
  @ApiOperation({ summary: '获取可用角色列表' })
  @ApiResponse({ status: 200, description: '角色列表' })
  getCharacters() {
    return this.mastraService.getAvailableCharacters();
  }
  // @Post('chat')
  // @ApiOperation({ summary: '与角色同步聊天' })
  // @ApiResponse({ status: 200, description: '聊天响应', type: ChatResponseDto })
  // @UsePipes(new ZodValidationPipe(ChatRequestSchema))
  // async chat(@Body() request: ChatRequestDto): Promise<ChatResponseDto> {
  //   const { message, character } = request;
  //   const reply = await this.mastraService.chatWithCharacter(message, character);
  //   return {
  //     response: reply,
  //     character,
  //     timestamp: new Date().toISOString()
  //   };
  // }

  @Sse('chat/stream')
  @ApiOperation({ summary: '与角色流式聊天' })
  @Throttle({ burst: { limit: 10, ttl: 60000 } })
  async streamChat(@Query(new ZodValidationPipe(ChatRequestSchema)) query: ChatRequestDto, @User() user: JwtPayload) {
    const { message, character, threadId } = query;
    const stream = await this.mastraService.streamChatWithCharacter(message, character, threadId, user.uid);
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

  @Sse('chat/stream/visitor')
  @ApiOperation({ summary: '(游客)与角色流式聊天' })
  @Public()
  @Throttle({ burst: { limit: 4, ttl: 60000, } })
  async streamChatForVisitor(@Query(new ZodValidationPipe(ChatRequestSchema)) query: ChatRequestDto) {
    const { message, character, threadId } = query;
    const stream = await this.mastraService.streamChatWithCharacter(message, character, threadId);
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


  // 聊天历史管理接口
  @Get('threads')
  @ApiOperation({ summary: '获取用户的聊天线程列表' })
  @ApiResponse({ status: 200, description: '线程列表', type: ThreadsResponseDto })
  async getUserThreads(@User() user: JwtPayload): Promise<ThreadsResponseDto> {
    const { uid: userId } = user;
    return await this.mastraService.getUserChatThreads(userId);
  }

  @Get('threads/:threadId')
  @ApiOperation({ summary: '获取特定线程的详细信息' })
  @ApiResponse({ status: 200, description: '线程详情', type: ThreadResponseDto })
  async getThreadById(@Param(new ZodValidationPipe(GetThreadByIdQuerySchema)) query: GetThreadByIdQueryDto): Promise<ThreadResponseDto> {
    const { threadId } = query;
    return await this.mastraService.getChatThreadById(threadId);
  }

  @Get('thread/messages')
  @ApiOperation({ summary: '获取线程中的消息记录' })
  @ApiResponse({ status: 200, description: '消息记录', type: ThreadMessagesResponseDto })
  async getThreadMessages(@Query(new ZodValidationPipe(GetThreadMessagesQuerySchema)) query: GetThreadMessagesQueryDto, @User() user: JwtPayload): Promise<ThreadMessagesResponseDto> {
    const { threadId,  limit, searchQuery } = query;
    return await this.mastraService.getChatThreadMessages(threadId, user.uid, limit, searchQuery);
  }

  // @Get('test/chat')
  // @UserType('beyondVisitor')
  // @ApiOperation({ summary: '(测试用)对话', })
  // @ApiResponse({ status: 200, description: '对话测试结果' })
  // async testChat(@Query('message') message: string) {
  //   return this.mastraService.syncChat(message);
  // }

  @Get('rag')
  @ApiOperation({ summary: '(测试用)RAG查询效果' })
  @ApiResponse({ status: 200, description: 'RAG查询测试结果' })
  @Public()
  async testRagQuery(@Query('text') text: string) {
    return this.mastraService.ragQueryTest(text);
  }
} 