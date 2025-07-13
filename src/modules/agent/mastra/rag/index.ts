import { Injectable, Logger } from '@nestjs/common';
import { PgVector } from "@mastra/pg";
import { MDocument } from "@mastra/rag";
import { embed, Embedding, EmbeddingModel } from "ai";
import { ModelService } from "../model";
import { ConfigurationService } from "../config/configuration";

@Injectable()
export class RagService {
  private logger: Logger = new Logger(RagService.name);
  private pgVector: PgVector;
  private embedder: EmbeddingModel<string>;
  private readonly indexName = 'test_index';

  constructor(
    private configService: ConfigurationService,
    private qwenService: ModelService,
  ) {
    this.pgVector = new PgVector(this.configService.pgVectorConfig);
    this.embedder = this.qwenService.getOpenAI().embedding('text-embedding-v2');
  }

  async textRagQuery(ragQueryText: string) {
    this.logger.log(`开始查询: ${ragQueryText}`);
    this.logger.log('开始创建查询embedding');

    const { embedding } = await embed({
      model: this.embedder,
      value: ragQueryText,
    });
    this.logger.log('创建查询embedding成功');
    this.logger.log('开始查询');

    const result = await this.pgVector.query({
      indexName: this.indexName,
      queryVector: embedding,
      topK: 5,
      minScore: 0.3,
    });
    this.logger.log("查询结果");
    this.logger.log(result)
    return result;
  }

  async initRag() {
    await this.pgVector.createIndex({
      indexName: this.indexName,
      dimension: 1536,
    });
    console.log('创建索引成功');
  }

  async updateRagByText(text: string) {
    const doc = MDocument.fromText(text);

    const chunks = await doc.chunk({
      strategy: "recursive",
      size: 512,
      overlap: 50,
    });

    const embeddings: Embedding[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const { embedding, usage } = await embed<string>({
        model: this.embedder,
        value: chunks[i].text,
      });
      embeddings.push(embedding);
      this.logger.log(`创建第${i}个embedding成功`);
      this.logger.log(`消耗token: ${usage.tokens}`);
    }

    await this.pgVector.upsert({
      indexName: this.indexName,
      vectors: embeddings,
      metadata: chunks?.map((chunk) => ({ text: chunk.text })),
    });
  }
} 