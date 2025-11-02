import { Module } from '@nestjs/common';
import { TtsGateway } from './tts.gateway';
import { TtsService } from './tts.service';
import { JwtUtilsModule } from 'src/common/utils/jwt/jwt.module';
import { WsConnectionManager } from 'src/common/utils/tts/ws-connection-manager';
import { WsJwtGuard, WsTokenVerifyGuard } from 'src/common/guards/ws-jwt.guard';

@Module({
  imports: [JwtUtilsModule],
  providers: [TtsGateway, TtsService, WsConnectionManager, WsJwtGuard, WsTokenVerifyGuard],
  exports: [TtsService],
})
export class TtsModule {}
