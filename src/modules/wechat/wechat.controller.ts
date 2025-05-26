import { Controller, Get, Post, Body, Query, Logger, HttpStatus, HttpCode } from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';
import { WechatService } from './wechat.service';
import { WechatEncryptedDataDto, WeChatEncryptedDataSchema } from 'src/validators/wechat';
import { ZodValidationPipe } from 'src/common/pipes/zod-validate.pipe';
import { User } from 'src/common/decorators/user.decorator';
import { JwtPayload } from 'src/types/jwt';
import { UserType } from 'src/common/decorators/user-type.decorator';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('微信认证相关')
@Controller('/wechat')
export class WechatController {
  private readonly logger = new Logger(WechatController.name);
  constructor(private readonly wechatService: WechatService) {}

  @Public()
  @ApiOperation({summary:'微信登录'})
  @Get('/auth/login')
  async create(@Query('code') code: string) {
    this.logger.log(`Received code: ${code}`);
    return await this.wechatService.loginByCode(code);
  }
}
