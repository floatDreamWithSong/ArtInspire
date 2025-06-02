import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AgentController } from './agent.controller';
import { MastraService } from './mastra';
import { ModelService } from './mastra/model';
import { RagService } from './mastra/rag';
import { WindInWillowsAgentService, WindInWillowsAgentServiceForVisitor } from './mastra/agents/wind-in-willows';
import { ConfigurationService } from './mastra/config/configuration';
import { AgentService } from './agent.service';
import { CustomThrottlerGuard } from './guards/custom-throttler.guard';

@Module({
  imports: [
    ConfigModule,
    // 仅为agent模块配置限流
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1秒
        limit: 3,  // 1秒内最多3次请求
      },
      {
        name: 'medium', 
        ttl: 10000, // 10秒
        limit: 20,  // 10秒内最多20次请求
      },
      {
        name: 'long',
        ttl: 60000, // 1分钟
        limit: 100, // 1分钟内最多100次请求
      }
    ])
  ],
  controllers: [AgentController],
  providers: [
    MastraService,
    ModelService,
    RagService,
    WindInWillowsAgentService,
    WindInWillowsAgentServiceForVisitor,
    ConfigurationService,
    AgentService,
    // 使用自定义限流守卫，支持基于用户ID和IP的不同限流策略
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
  exports: [MastraService],
})
export class AgentModule {} 