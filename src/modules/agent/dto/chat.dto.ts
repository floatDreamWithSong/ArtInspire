import { z } from 'zod';

export const ChatRequestSchema = z.object({
  message: z.string().min(1, '消息不能为空'),
  character: z.enum(['rat', 'badger', 'toad', 'mole']).optional().default('rat'),
});

export type ChatRequestDto = z.infer<typeof ChatRequestSchema>;

export interface ChatResponseDto {
  reply: string;
  character: string;
  timestamp: Date;
} 