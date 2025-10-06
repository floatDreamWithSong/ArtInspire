import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/utils/prisma/prisma.service';
import { UpdateUserInfoDto } from 'src/validators/user';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async getUserInfo(uid: number) {
    const user = await this.prisma.user.findUnique({
      where: { uid },
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    return {
      userId: user.uid,
      gender: user.gender,
      username: user.username,
      avatar: user.avatar,
      userType: user.userType,
      registerTime: user.registerTime,
      birthday: user.birthday as Date | null
    };
  }

  async updateUserInfo(uid: number, updateData: UpdateUserInfoDto) {
    const user = await this.prisma.user.update({
      where: { uid },
      data: {
        ...updateData,
        birthday: updateData.birthday ? new Date(updateData.birthday) : void 0
      },
    });

    return {
      userId: user.uid,
      gender: user.gender,
      username: user.username,
      avatar: user.avatar,
      userType: user.userType,
      registerTime: user.registerTime,
      birthday: user.birthday as Date | null
    };
  }
}
