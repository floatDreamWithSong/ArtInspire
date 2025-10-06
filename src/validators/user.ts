import z from "zod4";

export const updateUserInfoSchema = z.object({
  username: z.string().optional(),
  gender: z.number().optional(),
  birthday: z.number().optional(),
  avatar: z.string().optional()
})
export type UpdateUserInfoDto = z.infer<typeof updateUserInfoSchema>