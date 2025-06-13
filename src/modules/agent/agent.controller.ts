import { Controller, Get, Post, Body, Query, Sse, UsePipes, Param, Delete, BadRequestException, Res } from '@nestjs/common';
import { MastraService } from './mastra';
import { Observable } from 'rxjs';
import {
  ChatRequestDto,
  ChatRequestSchema,
  GetThreadMessagesQueryDto,
  GetThreadMessagesQuerySchema,
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
import { MakeResponse } from 'src/common/utils/response';
import { Response } from 'express';

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
  private createThreadId(user: JwtPayload, character: string) {
    return `user${user.uid}_${character}`
  }

  @Get('chat/stream')
  @ApiOperation({ summary: '与角色流式聊天' })
  @Throttle({ burst: { limit: 10, ttl: 60000 } })
  async streamChat(@Query() query: ChatRequestDto, @User() user: JwtPayload, @Res() res: Response) {
    const querySchema = ChatRequestSchema.safeParse(query)
    if (!querySchema.success) {
      res.status(400).json(MakeResponse.error(1004, querySchema.error.message));
      return;
    }
    const { message, character } = query;
    const threadId = this.createThreadId(user, character)
    try {
      const stream = await this.mastraService.streamChatWithCharacter(message, character, threadId, user.uid);
      
      // 设置 SSE 相关的响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // 使用 res.write 写入 SSE 流数据
      await stream.pipeTo(new WritableStream({
        write(chunk: string) {
          res.write(`data: ${JSON.stringify({
            content: chunk,
            timestamp: new Date()
          })}\n\n`);
        },
        close() {
          res.end();
        },
        abort(err) {
          res.status(500).json(MakeResponse.error(1005, err instanceof Error ? err.message : String(err)));
        }
      }));
    } catch (error) {
      res.status(500).json(MakeResponse.error(1005, error instanceof Error ? error.message : String(error)));
    }
  }

  @Get('chat/stream/visitor')
  @ApiOperation({ summary: '(游客)与角色流式聊天' })
  @Public()
  @Throttle({ burst: { limit: 4, ttl: 60000, } })
  async streamChatForVisitor(@Query() query: ChatRequestDto, @Res() res: Response) {
    const querySchema = ChatRequestSchema.safeParse(query)
    if (!querySchema.success) {
      res.status(400).json(MakeResponse.error(1004, querySchema.error.message));
      return;
    }

    const { message, character } = query;
    const threadId = 'visitor'
    try {
      const stream = await this.mastraService.streamChatWithCharacter(message, character, threadId);
      
      // 设置 SSE 相关的响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // 使用 res.write 写入 SSE 流数据
      await stream.pipeTo(new WritableStream({
        write(chunk: string) {
          res.write(`data: ${JSON.stringify({
            content: chunk,
            timestamp: new Date()
          })}\n\n`);
        },
        close() {
          res.end();
        },
        abort(err) {
          res.status(500).json(MakeResponse.error(1005, err instanceof Error ? err.message : String(err)));
        }
      }));
    } catch (error) {
      res.status(500).json(MakeResponse.error(1005, error instanceof Error ? error.message : String(error)));
    }
  }


  // 聊天历史管理接口
  // @Get('threads')
  // @ApiOperation({ summary: '获取用户的聊天线程列表' })
  // @ApiResponse({ status: 200, description: '线程列表', type: ThreadsResponseDto })
  // async getUserThreads(@User() user: JwtPayload): Promise<ThreadsResponseDto> {
  //   const { uid: userId } = user;
  //   return await this.mastraService.getUserChatThreads(userId);
  // }

  // @Get('threads/:threadId')
  // @ApiOperation({ summary: '获取特定线程的详细信息' })
  // @ApiResponse({ status: 200, description: '线程详情', type: ThreadResponseDto })
  // async getThreadById(@Param(new ZodValidationPipe(GetThreadByIdQuerySchema)) query: GetThreadByIdQueryDto): Promise<ThreadResponseDto> {
  //   const { threadId } = query;
  //   return await this.mastraService.getChatThreadById(threadId);
  // }

  // @Delete('threads/:threadId')
  // @ApiOperation({ summary: '获取特定线程的详细信息' })
  // @ApiResponse({ status: 200, description: '线程详情', type: ThreadResponseDto })
  // async deleteThreadById(@Param(new ZodValidationPipe(GetThreadByIdQuerySchema)) query: GetThreadByIdQueryDto) {
  //   const { threadId } = query;
  //   return await this.mastraService.deleteChatThread(threadId);
  // }

  @Get('thread/messages')
  @ApiOperation({ summary: '获取线程中的消息记录' })
  @ApiResponse({ status: 200, description: '消息记录', type: ThreadMessagesResponseDto })
  async getThreadMessages(@Query(new ZodValidationPipe(GetThreadMessagesQuerySchema)) query: GetThreadMessagesQueryDto, @User() user: JwtPayload): Promise<ThreadMessagesResponseDto> {
    const { character, limit, searchQuery, beforeId } = query;
    const threadId = this.createThreadId(user, character)
    return await this.mastraService.getChatThreadMessages(threadId, user.uid, limit, searchQuery, beforeId);
  }

  @Get('rag')
  @ApiOperation({ summary: '(测试用)RAG查询效果' })
  @ApiResponse({ status: 200, description: 'RAG查询测试结果' })
  @Public()
  async testRagQuery(@Query('text') text: string) {
    return this.mastraService.ragQueryTest(text);
  }

} 