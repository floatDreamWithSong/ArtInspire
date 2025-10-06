import { z } from 'zod';

// 创建情绪日记的验证器
export const CreateDiarySchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100, '标题不能超过100个字符'),
  content: z.string().optional(),
  mood: z.string().min(1, '心情不能为空'),
  isPublic: z.boolean().default(false),
  isAnonymous: z.boolean().default(false),
});

// 更新情绪日记的验证器
export const UpdateDiarySchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100, '标题不能超过100个字符').optional(),
  content: z.string().optional(),
  mood: z.string().min(1, '心情不能为空').optional(),
  isPublic: z.boolean().optional(),
  isAnonymous: z.boolean().optional(),
});

// 创建回复的验证器
export const CreateReplySchema = z.object({
  content: z.string().min(1, '回复内容不能为空').max(500, '回复内容不能超过500个字符'),
});

export const PageLimitSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default(1),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).default(10),
})

// 分页查询验证器
export const GetDiariesQuerySchema = z.object({
  isPublic: z.string().transform(val => val === 'true').pipe(z.boolean()).optional(),
  authorId: z.string().transform(Number).pipe(z.number()).optional(),
  // 闭区间时间查询，不传表示不限制时间
  timeStart: z.number().optional(),
  timeEnd: z.number().optional(),
  titleKeywords: z.string().transform(s=>s.split(';').filter(Boolean)).optional(), // 日记标题的关键词
  contentKeywords: z.string().transform(s=>s.split(';').filter(Boolean)).optional(), // 日记内容的关键词，要求满足全部关键词才匹配
  moods: z.string().transform(s=>s.split(';').filter(Boolean)).optional(), // 需要包含的情绪词， 要求满足任意情绪关键词词即认为匹配
  authorKeywords: z.string().transform(s=>s.split(';').filter(Boolean)).optional(), // 作者昵称关键词，要求满足全部关键词才匹配
});


// DTO 类型定义
export type CreateDiaryDto = z.infer<typeof CreateDiarySchema>;
export type UpdateDiaryDto = z.infer<typeof UpdateDiarySchema>;
export type CreateReplyDto = z.infer<typeof CreateReplySchema>;
export type PageLimitDto = z.infer<typeof PageLimitSchema>;
export type GetDiariesQueryDto = z.infer<typeof GetDiariesQuerySchema>;