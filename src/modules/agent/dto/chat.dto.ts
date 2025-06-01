import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const ChatRequestSchema = z.object({
  message: z.string().min(1, '消息不能为空'),
  character: z.enum(['rat', 'badger', 'toad', 'mole']).optional().default('rat'),
});

export type ChatRequestDto = z.infer<typeof ChatRequestSchema>;

// 聊天历史相关的 Schema
export const GetThreadsQuerySchema = z.object({
  userId: z.string().min(1, '用户ID不能为空'),
});

export const GetThreadByIdQuerySchema = z.object({
  threadId: z.string().min(1, '线程ID不能为空'),
});

export const GetThreadMessagesQuerySchema = z.object({
  threadId: z.string().min(1, '线程ID不能为空'),
  userId: z.string().optional(),
  limit: z.number().min(1).max(1000).optional(),
  searchQuery: z.string().optional(),
});

export const CreateThreadRequestSchema = z.object({
  userId: z.string().min(1, '用户ID不能为空'),
  character: z.enum(['rat', 'badger', 'mole', 'toad'] as const, {
    errorMap: () => ({ message: '角色必须是 rat、badger、mole 或 toad 之一' })
  }),
  title: z.string().optional(),
});

// DTO 类
export class ChatResponseDto {
  @ApiProperty({ description: '回复内容' })
  response: string;

  @ApiProperty({ description: '角色' })
  character: string;

  @ApiProperty({ description: '时间戳' })
  timestamp: string;
}

export class GetThreadsQueryDto {
  @ApiProperty({ description: '用户ID', example: 'user-123' })
  userId: string;
}

export class GetThreadByIdQueryDto {
  @ApiProperty({ description: '线程ID', example: 'thread-456' })
  threadId: string;
}

export class GetThreadMessagesQueryDto {
  @ApiProperty({ description: '线程ID', example: 'thread-456' })
  threadId: string;

  @ApiProperty({ description: '用户ID（可选）', required: false, example: 'user-123' })
  userId?: string;

  @ApiProperty({ description: '消息数量限制（可选）', required: false, minimum: 1, maximum: 1000, example: 50 })
  limit?: number;

  @ApiProperty({ description: '搜索查询（可选）', required: false, example: '关于友谊的对话' })
  searchQuery?: string;
}

export class CreateThreadRequestDto {
  @ApiProperty({ description: '用户ID', example: 'user-123' })
  userId: string;

  @ApiProperty({ 
    description: '角色类型', 
    enum: ['rat', 'badger', 'mole', 'toad'],
    example: 'rat'
  })
  character: 'rat' | 'badger' | 'mole' | 'toad';

  @ApiProperty({ description: '线程标题（可选）', required: false, example: '关于友谊的讨论' })
  title?: string;
}

export class ThreadInfoDto {
  @ApiProperty({ description: '线程ID' })
  id: string;

  @ApiProperty({ description: '资源ID' })
  resourceId: string;

  @ApiProperty({ description: '线程标题', required: false })
  title?: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiProperty({ description: '元数据', required: false })
  metadata?: Record<string, unknown>;
}

export class ThreadsResponseDto {
  @ApiProperty({ description: '是否成功' })
  success: boolean;

  @ApiProperty({ description: '线程列表', type: [ThreadInfoDto] })
  threads: ThreadInfoDto[];

  @ApiProperty({ description: '线程数量' })
  count: number;

  @ApiProperty({ description: '错误信息', required: false })
  error?: string;
}

export class ThreadResponseDto {
  @ApiProperty({ description: '是否成功' })
  success: boolean;

  @ApiProperty({ description: '线程信息', type: ThreadInfoDto, required: false })
  thread?: ThreadInfoDto | null;

  @ApiProperty({ description: '错误信息', required: false })
  error?: string;
}

export class ThreadMessagesResponseDto {
  @ApiProperty({ description: '是否成功' })
  success: boolean;

  @ApiProperty({ description: '消息列表' })
  messages: any[];

  @ApiProperty({ description: 'UI消息列表' })
  uiMessages: any[];

  @ApiProperty({ description: '消息数量' })
  count: number;

  @ApiProperty({ description: '错误信息', required: false })
  error?: string;
} 