import { z } from 'zod4';
export const WeChatEncryptedDataSchema = z.object({
  encryptedData: z.string(),
  iv: z.string(),
});

export type WechatEncryptedDataDto = z.infer<typeof WeChatEncryptedDataSchema>;

export const WeChatOpenidSessionKeySchema = z.object({
  openid: z.string(),
  session_key: z.string(),
});

export type WeChatOpenidSessionKeyDto = z.infer<typeof WeChatOpenidSessionKeySchema>;
