import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { JwtGuard } from './common/guards/jwt.guard';
import { UserTypeGuard } from './common/guards/user-type.guard';
import { WechatModule } from './modules/wechat/wechat.module';
import { AgentModule } from './modules/agent/agent.module';
import { JwtUtilsModule } from './common/utils/jwt/jwt.module';
import { Configurations } from './common/config';
import { PrismaModule } from './common/utils/prisma/prisma.module';
import { RedisCacheModule } from './common/utils/redis/redis.module';
import { AdminModule } from './modules/admin/admin.module';
import { DiaryModule } from './modules/diary/diary.module';
import { UserModule } from './modules/user/user.module';
import { TtsModule } from './modules/tts/tts.module';

@Module({
  imports: [
    // 静态资源服务配置
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/static', // 静态资源访问路径前缀
    }),
    WechatModule,
    AgentModule,
    JwtUtilsModule,
    Configurations,
    PrismaModule,
    RedisCacheModule,
    AdminModule,
    DiaryModule,
    UserModule,
    TtsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
    {
      provide: APP_GUARD,
      useClass: UserTypeGuard,
    },
  ],
})
export class AppModule {}
