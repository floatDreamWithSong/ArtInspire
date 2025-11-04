import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  AppExceptionFilter,
  BadRequestExceptionFilter,
  ErrorFilter,
  ForbiddenExceptionFilter,
  UnauthorizedExceptionFilter,
} from './common/filters/app-exception.filter';
import { LoggerService } from './common/utils/logger/logger.service';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { DocumentBuilder } from '@nestjs/swagger';
import { SwaggerModule } from '@nestjs/swagger';
import { WsAdapter } from '@nestjs/platform-ws';
import fs from 'fs'
import dotenv from 'dotenv'
dotenv.config();
async function bootstrap() {
  let httpsOptions: { key: Buffer; cert: Buffer } | undefined;
  if (process.env.NODE_ENV !== 'development' && process.env.SSL_KEY && process.env.SSL_CRT) {
    console.log('SSL_KEY', process.env.SSL_KEY);
    console.log('SSL_CRT', process.env.SSL_CRT);
    httpsOptions = {
      key: fs.readFileSync(process.env.SSL_KEY),
      cert: fs.readFileSync(process.env.SSL_CRT),
    };
  }
  const app = await NestFactory.create(AppModule, {
    logger: new LoggerService(),
    httpsOptions,
  });
  app.useWebSocketAdapter(new WsAdapter(app));
  app
    .useGlobalFilters(new ErrorFilter())
    .useGlobalFilters(new AppExceptionFilter())
    .useGlobalFilters(new UnauthorizedExceptionFilter())
    .useGlobalFilters(new BadRequestExceptionFilter())
    .useGlobalFilters(new ForbiddenExceptionFilter());

  app.useGlobalInterceptors(new TransformInterceptor());
  const config = new DocumentBuilder()
    .setTitle('艺启心扉接口文档')
    .setDescription('none')
    .setVersion('0.0.1')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log('Server is running on port', port);
}
void bootstrap();
