import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

const characterSchema = z.enum(['rat', 'badger', 'toad', 'mole'])

export const ChatRequestSchema = z.object({
  message: z.string().min(1, '消息不能为空').max(800,'单次对话不能过长'),
  character: characterSchema,
});
export type ChatRequestDto = z.infer<typeof ChatRequestSchema>;

// export const GetThreadByIdQuerySchema = z.object({
//   threadId: threadIdSchema,
// });
// export type GetThreadByIdQueryDto = z.infer<typeof GetThreadByIdQuerySchema>

export const GetThreadMessagesQuerySchema = z.object({
  character: characterSchema,
  limit: z.coerce.number().max(50).optional(),
  searchQuery: z.string().optional(),
});
export type GetThreadMessagesQueryDto = z.infer<typeof GetThreadMessagesQuerySchema>

// DTO 类
export class ChatResponseDto {
  @ApiProperty({ description: '回复内容' })
  response: string;

  @ApiProperty({ description: '角色' })
  character: string;

  @ApiProperty({ description: '时间戳' })
  timestamp: string;
}

export class ThreadInfoDto {
  @ApiProperty({ description: '线程ID' })
  id: string;

  @ApiProperty({ description: '用户ID' })
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
}

export class ThreadResponseDto {
  @ApiProperty({ description: '是否成功' })
  success: boolean;

  @ApiProperty({ description: '线程信息', type: ThreadInfoDto, required: false })
  thread?: ThreadInfoDto | null;
}

export class ThreadMessagesResponseDto {
  @ApiProperty({ description: '是否成功' })
  success: boolean;

  @ApiProperty({ description: '消息列表' })
  messages: any[];

  @ApiProperty({ description: '消息数量' })
  count: number;
} 