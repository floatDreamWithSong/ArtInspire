import { Module } from '@nestjs/common';
import { DiaryController } from './diary.controller';
import { DiaryService } from './diary.service';

@Module({
  controllers: [DiaryController],
  providers: [DiaryService],
  exports: [DiaryService], // 导出服务以便其他模块使用
})
export class DiaryModule {}
