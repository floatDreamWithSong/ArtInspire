import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';
import { PrismaService } from 'src/common/utils/prisma/prisma.service';

@Controller('admin')
export class AdminController {

  constructor(private readonly p: PrismaService) { }
  // 测试用，非生产
  @Get('upgrade')
  @Public()
  upgrade(@Query('password') pass: string, @Query('uid', ParseIntPipe) uid: number, @Query('userType', ParseIntPipe) userType: 0 | 1 | 2) {
    if (pass !== process.env.ADMIN_PASS) {
      return;
    }
    this.p.user.update({
      where: {
        uid,
      },
      data: {
        userType
      }
    })
    return {
      success: true,
      message: '升级成功'
    }
  }
}
