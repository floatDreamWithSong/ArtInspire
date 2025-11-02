import { Body, Controller, OnModuleInit, Post } from '@nestjs/common';
import { BasicCredentials } from '@huaweicloud/huaweicloud-sdk-core';
import { PostCustomTTSReq, RunTtsRequest, SisClient, TtsConfig } from "@huaweicloud/huaweicloud-sdk-sis/v1/public-api";
import { Configurations } from 'src/common/config';
import { Logger } from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('voice')
export class VoiceController implements OnModuleInit {
  private readonly logger = new Logger(VoiceController.name);
  private credentials: BasicCredentials;
  private client: SisClient;
  constructor() {}
  onModuleInit() {
    console.log('Configurations.HUAWEI_CLOUD_ENDPOINT', Configurations.HUAWEI_CLOUD_ENDPOINT);
    this.credentials = new BasicCredentials()
      .withAk(Configurations.HUAWEI_CLOUD_SDK_AK)
      .withSk(Configurations.HUAWEI_CLOUD_SDK_SK)
      .withProjectId(Configurations.HUAWEI_CLOUD_PROJECT_ID)
    this.client = SisClient.newBuilder()
      .withCredential(this.credentials)
      .withEndpoint(Configurations.HUAWEI_CLOUD_ENDPOINT)
      .build();
  }
  @Public()
  @Post('generate')
  async generateVoice(
    @Body() body: {
      text: string,
      audioFormat?: string,
      sampleRate?: string,
      property?: string,
      speed?: number,
      pitch?: number,
      volume?: number,
    }
  ) {
    const {
      text,
      audioFormat = 'wav',
      sampleRate = '16000',
      property = 'chinese_xiaoyan_common',
      speed = 0,
      pitch = 0,
      volume = 50,
    } = body;

    const request = new RunTtsRequest();
    const postBody = new PostCustomTTSReq();
    const configbody = new TtsConfig();
    configbody
      .withAudioFormat(audioFormat)
      .withSampleRate(sampleRate)
      .withProperty(property)
      .withSpeed(speed)
      .withPitch(pitch)
      .withVolume(volume);
    postBody.withConfig(configbody);
    postBody.withText(text);
    request.withBody(postBody);
    const result = await this.client.runTts(request);
    this.logger.log(`JSON.stringify(result)::${JSON.stringify(result.traceId)}`);
    return result;
  }
}
