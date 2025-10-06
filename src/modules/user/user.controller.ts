import { Controller, Get, Put, Body, ParseIntPipe, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '../../common/decorators/user.decorator';
import { ZodValidationPipe } from 'src/common/pipes/zod-validate.pipe';
import { UpdateUserInfoDto, updateUserInfoSchema } from 'src/validators/user';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('user')
@ApiTags('用户信息相关')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('info')
  @Public()
  @ApiOperation({summary:'获取用户信息'})
  async getUserInfo(@Query('id', ParseIntPipe) id: number,) {
    return this.userService.getUserInfo(id);
  }

  @Put('info')
  @ApiOperation({summary:'修改用户信息'})
  async updateUserInfo(
    @User('uid') uid: number,
    @Body(new ZodValidationPipe(updateUserInfoSchema)) updateUserInfo: UpdateUserInfoDto
  ) {
    return this.userService.updateUserInfo(uid, updateUserInfo);
  }
}
