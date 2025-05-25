import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import COS from 'cos-nodejs-sdk-v5';
import { Configurations } from 'src/common/config';

@Injectable()
export class CosService implements OnModuleInit {
  private cos: COS;
  private readonly logger = new Logger(CosService.name);
  private baseParam: COS.PutObjectAclParams;
  onModuleInit() {
    this.cos = new COS({
      SecretId: Configurations.COS_SECRET_ID,
      SecretKey: Configurations.COS_SECRET_KEY,
    });
    this.baseParam = {
      Bucket: Configurations.COS_BUCKET,
      Region: Configurations.COS_REGION,
      Key: '', // 文件在桶中的存储path，以及存储名称
    };
    this.logger.log(this.baseParam);
  }
  /**
   * 上传单个文件
   * @param file
   * @returns 文件在COS中的路径
   */
  async uploadFile(file: Express.Multer.File) {
    const { originalname, buffer } = file;
    const randomName = `${Date.now()}-${Math.floor(Math.random() * 10000)}-${originalname}`;
    const Key = randomName;
    const params = {
      ...this.baseParam,
      Key,
      Body: buffer,
    };
    this.logger.log(params);
    const res = await this.cos.putObject(params);
    return res.Location;
  }
  async uploadFileToGetUrl(file: Express.Multer.File) {
    return this.uploadFile(file).then((url) => `https://${url}`);
  }
  /**
   * 上传多个文件
   * @param files
   * @returns 文件在COS中的路径
   */
  async uploadFiles(files: Express.Multer.File[]) {
    const paths = await Promise.all(files.map((file) => this.uploadFile(file)));
    return paths;
  }
  async uploadToGetUrls(files: Express.Multer.File[]) {
    return this.uploadFiles(files).then((paths) => paths.map((path) => `https://${path}`));
  }
  private async deleteFile(Key: string) {
    const params = {
      ...this.baseParam,
      Key,
    };
    const res = await this.cos.deleteObject(params);
    return res;
  }
  /**
   * 根据文件URL，得到文件在COS中的路径，并删除文件
   * @param fileUrl 文件URL
   */
  async deleteFileByUrl(fileUrl: string) {
    const urlObj = new URL(fileUrl);
    await this.deleteFile(urlObj.pathname.substring(1));
  }
  async deleteFilesByUrls(fileUrls: string[]) {
    return Promise.all(fileUrls.map((fileUrl) => this.deleteFileByUrl(fileUrl)));
  }
}
