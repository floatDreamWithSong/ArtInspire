import { Module } from '@nestjs/common';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';
import { Configurations } from 'src/common/config';

@Module({
  imports: [Configurations],
  controllers: [VoiceController],
  providers: [VoiceService]
})
export class VoiceModule {}
