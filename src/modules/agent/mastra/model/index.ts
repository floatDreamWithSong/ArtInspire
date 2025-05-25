import { Injectable } from '@nestjs/common';
import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai';
import { ConfigurationService } from '../config/configuration';

@Injectable()
export class ModelService {
  private openai: OpenAIProvider;

  constructor(private configService: ConfigurationService) {
    this.openai = createOpenAI(this.configService.openaiConfig);
  }

  getOpenAI() {
    return this.openai;
  }
} 