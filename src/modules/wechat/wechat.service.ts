import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { Configurations } from 'src/common/config';
import { lastValueFrom } from 'rxjs';
import { WeChatOpenidSessionKeySchema } from 'src/validators/wechat';
import { EXCEPTIONS } from 'src/common/exceptions';
import { PrismaService } from '../../common/utils/prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { JwtUtils } from 'src/common/utils/jwt/jwt.service';

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);
  private readonly sessionKeyExpireTime = 2 * 60 * 60;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly jwtUtils: JwtUtils,
    @InjectRedis() private readonly redisService: Redis,
  ) { }

  private async setSessionKeyByOpenid(openid: string, sessionKey: string) {
    // Store session key with 2 hour expiration
    await this.redisService.set(`wx:session:${openid}`, sessionKey, 'EX', this.sessionKeyExpireTime);
  }

  private async getSessionKeyByOpenid(openid: string): Promise<string | null> {
    return await this.redisService.get(`wx:session:${openid}`);
  }

  async loginByCode(code: string) {
    const endPointUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${Configurations.WX_APPID}&secret=${Configurations.WX_SECRET}&js_code=${code}&grant_type=authorization_code`;
    this.logger.log('微信登录请求地址:' + endPointUrl);
    const response = await lastValueFrom(
      this.httpService.get<{
        openid: string;
        session_key: string;
      }>(endPointUrl),
    );
    const result = WeChatOpenidSessionKeySchema.safeParse(response.data);
    if (!result.success) {
      this.logger.error('微信登录返回数据错误:' + JSON.stringify(response.data));
      throw EXCEPTIONS.WX_LOGIN_DATA_ERROR;
    }
    this.logger.log(`微信登录返回数据:${JSON.stringify(response.data)}`);

    // 使用 RedisService 存储 session_key
    await this.setSessionKeyByOpenid(response.data.openid, response.data.session_key);

    const _user = await this.prisma.user.findUnique({
      where: {
        openId: response.data.openid,
      },
    });

    const user = _user ?? await this.prisma.user.create({
      data: {
        openId: response.data.openid,
        username: `用户${Math.random().toString(36).slice(2, 8)}`, // 生成随机用户名
        gender: 0, // 默认未知性别
        userType: 1, // 默认为用户
      },
    });

    const jwtToken = this.jwtUtils.sign({
      openid: user.openId,
      userType: user.userType,
      iat: Math.floor(Date.now() / 1000),
      uid: user.uid,
    });

    this.logger.log(`用户登录, jwtToken: ${jwtToken}`);

    return {
      token: jwtToken,
      info: {
        userId: user.uid,
        gender: user.gender,
        username: user.username,
        avatar: user.avatar,
        userType: user.userType,
        registerTime: user.registerTime,
      },
    };
  }
}
