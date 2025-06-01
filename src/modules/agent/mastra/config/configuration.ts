import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConfigurationService {
  constructor(private configService: ConfigService) {}

  get openaiConfig() {
    return {
      apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY'),
      baseURL: this.configService.getOrThrow<string>('OPENAI_BASE_URL'),
    };
  }

  get pgVectorConfig() {
    return {
      connectionString: this.configService.getOrThrow<string>('PG_VECTOR_CONNECTION_STRING'),
    };
  }
} 