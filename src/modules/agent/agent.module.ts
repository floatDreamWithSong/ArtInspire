import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgentController } from './agent.controller';
import { MastraService } from './mastra';
import { ModelService } from './mastra/model';
import { RagService } from './mastra/rag';
import { WindInWillowsAgentService } from './mastra/agents/wind-in-willows';
import { ConfigurationService } from './mastra/config/configuration';

@Module({
  imports: [ConfigModule],
  controllers: [AgentController],
  providers: [
    MastraService,
    ModelService,
    RagService,
    WindInWillowsAgentService,
    ConfigurationService,
  ],
  exports: [MastraService],
})
export class AgentModule {} 