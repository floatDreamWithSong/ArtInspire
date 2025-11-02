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

async function bootstrap() {
  const httpsOptions = {
    key: fs.readFileSync('ssl/cert250508fd767cc6898a4572_daydreamer.net.cn_OTHER.key'),
    cert: fs.readFileSync('ssl/cert250508fd767cc6898a4572_daydreamer.net.cn_OTHER.crt'),
  };
  const app = await NestFactory.create(AppModule, {
    logger: new LoggerService(),
    httpsOptions: process.env.NODE_ENV === 'development' ? void 0 : httpsOptions,
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
