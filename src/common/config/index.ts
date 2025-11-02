import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module, OnModuleInit } from '@nestjs/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 配置模块全局可用
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'], // 按顺序加载环境文件
    }),
  ],
})
export class Configurations implements OnModuleInit {
  private static configService: ConfigService;

  // 静态字段，用于直接访问环境变量
  static HTTP_TIMEOUT = 5000;
  static HTTP_MAX_REDIRECTS = 5;
  static DATABASE_URL: string;
  static JWT_SECRET: string;
  static JWT_EXPIRATION_TIME: string;
  static MAIL_HOST: string;
  static MAIL_PORT: number;
  static MAIL_USER: string;
  static MAIL_PASS: string;
  static WX_APPID: string;
  static WX_SECRET: string;
  static COS_SECRET_ID: string;
  static COS_SECRET_KEY: string;
  static COS_BUCKET: string;
  static COS_REGION: string = 'ap-shanghai';
  static CRYPTO_SECRET: string;
  // tts
  static TTS_APPID: string;
  static TTS_ACCESS_TOKEN: string;
  static TTS_RESOURCE_ID: string;
  static TTS_ENDPOINT: string;
  static TTS_MAX_CONNECTIONS: number;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    Configurations.configService = this.configService;
    // 使用getOrThrow确保必须读取到环境变量
    Configurations.DATABASE_URL = this.configService.getOrThrow<string>('DATABASE_URL');
    Configurations.JWT_SECRET = this.configService.getOrThrow<string>('JWT_SECRET');
    Configurations.JWT_EXPIRATION_TIME = this.configService.getOrThrow<string>('JWT_EXPIRATION_TIME');
    Configurations.MAIL_HOST = this.configService.getOrThrow<string>('MAIL_HOST');
    Configurations.MAIL_PORT = this.configService.getOrThrow<number>('MAIL_PORT');
    Configurations.MAIL_USER = this.configService.getOrThrow<string>('MAIL_USER');
    Configurations.MAIL_PASS = this.configService.getOrThrow<string>('MAIL_PASS');
    Configurations.WX_APPID = this.configService.getOrThrow<string>('WX_APPID');
    Configurations.WX_SECRET = this.configService.getOrThrow<string>('WX_SECRET');
    Configurations.COS_SECRET_ID = this.configService.getOrThrow<string>('COS_SECRET_ID');
    Configurations.COS_SECRET_KEY = this.configService.getOrThrow<string>('COS_SECRET_KEY');
    Configurations.COS_BUCKET = this.configService.getOrThrow<string>('COS_BUCKET');
    Configurations.CRYPTO_SECRET = this.configService.getOrThrow<string>('CRYPTO_SECRET');
    Configurations.TTS_APPID = this.configService.getOrThrow<string>('TTS_APPID');
    Configurations.TTS_ACCESS_TOKEN = this.configService.getOrThrow<string>('TTS_ACCESS_TOKEN');
    Configurations.TTS_RESOURCE_ID = this.configService.getOrThrow<string>('TTS_RESOURCE_ID');
    Configurations.TTS_ENDPOINT = this.configService.getOrThrow<string>('TTS_ENDPOINT');
    Configurations.TTS_MAX_CONNECTIONS = this.configService.getOrThrow<number>('TTS_MAX_CONNECTIONS');
    console.log('Configurations.BUCKET', Configurations.COS_BUCKET);
    // 对于HTTP_TIMEOUT和HTTP_MAX_REDIRECTS这类有默认值的配置可以保持原样
  }

  // 提供一个静态方法来访问环境变量
  static getEnvVariable(key: string): string | undefined {
    return this.configService.get<string>(key);
  }
}
