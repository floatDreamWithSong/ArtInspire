import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  ParseIntPipe, 
  Logger, 
  HttpStatus, 
  HttpCode, 
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { DiaryService } from './diary.service';
import { User } from 'src/common/decorators/user.decorator';
import { UserType } from 'src/common/decorators/user-type.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtPayload } from 'src/types/jwt';
import { ZodValidationPipe } from 'src/common/pipes/zod-validate.pipe';
import { 
  CreateDiaryDto, 
  UpdateDiaryDto, 
  CreateReplyDto, 
  CreateDiarySchema,
  UpdateDiarySchema,
  CreateReplySchema,
  GetDiariesQuerySchema,
  PageLimitSchema,
  PageLimitDto,
  GetDiariesQueryDto,
} from 'src/validators/diary';

@ApiTags('情绪日记管理')
@Controller('diary')
export class DiaryController {
  private readonly logger = new Logger(DiaryController.name);

  constructor(private readonly diaryService: DiaryService) {}

  @Post()
  @UserType('onlyAuthedUser') // 只有用户可以创建情绪日记
  @ApiOperation({ summary: '创建情绪日记' })
  @ApiResponse({ status: 201, description: '情绪日记创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  async createDiary(
    @User() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateDiarySchema)) createDiaryDto: CreateDiaryDto,
  ) {
    this.logger.log(`用户 ${user.uid} 创建情绪日记: ${createDiaryDto.title}`);
    return await this.diaryService.createDiary(user.uid, createDiaryDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: '获取情绪日记列表，支持多种筛选条件' })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认为1' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量，默认为10' })
  @ApiQuery({ name: 'isPublic', required: false, description: '是否公开，true/false' })
  @ApiQuery({ name: 'authorId', required: false, description: '作者ID' })
  @ApiQuery({ name: 'timeStart', required: false, description: '开始时间戳（毫秒）' })
  @ApiQuery({ name: 'timeEnd', required: false, description: '结束时间戳（毫秒）' })
  @ApiQuery({ name: 'titleKeywords', required: false, description: '标题关键词数组，满足任意一个即匹配' })
  @ApiQuery({ name: 'contentKeywords', required: false, description: '内容关键词数组，需要满足全部关键词' })
  @ApiQuery({ name: 'moods', required: false, description: '情绪关键词数组，满足任意一个即匹配' })
  @ApiQuery({ name: 'authorKeywords', required: false, description: '作者昵称关键词数组，需要满足全部关键词' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPublicDiaries(
    @Query(new ZodValidationPipe(PageLimitSchema)) pagelimit: PageLimitDto,
    @Query(new ZodValidationPipe(GetDiariesQuerySchema)) options: GetDiariesQueryDto,
    @User() user?: JwtPayload,
  ) {
    const query = {
      ...pagelimit,
      ...options
    }
    this.logger.log(`获取情绪日记列表: ${JSON.stringify(query)}`);
    return await this.diaryService.getDiaryList(query, user?.uid);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: '获取情绪日记详情' })
  @ApiParam({ name: 'id', description: '情绪日记ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '情绪日记不存在' })
  @ApiResponse({ status: 403, description: '无权访问此情绪日记' })
  async getDiaryById(
    @Param('id', ParseIntPipe) id: number,
    @User() user?: JwtPayload,
  ) {
    this.logger.log(`获取情绪日记详情: ${id}, 用户: ${user?.uid}`);
    return await this.diaryService.getDiaryById(id, user?.uid);
  }

  @Put(':id')
  @UserType('beyondVisitor')
  @ApiOperation({ summary: '更新情绪日记' })
  @ApiParam({ name: 'id', description: '情绪日记ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '无权修改此情绪日记' })
  @ApiResponse({ status: 404, description: '情绪日记不存在' })
  async updateDiary(
    @Param('id', ParseIntPipe) id: number,
    @User() user: JwtPayload,
    @Body(new ZodValidationPipe(UpdateDiarySchema)) updateDiaryDto: UpdateDiaryDto,
  ) {
    this.logger.log(`用户 ${user.uid} 更新情绪日记: ${id}`);
    return await this.diaryService.updateDiary(id, user.uid, updateDiaryDto);
  }

  @Delete(':id')
  @UserType('beyondVisitor')
  @ApiOperation({ summary: '删除情绪日记' })
  @ApiParam({ name: 'id', description: '情绪日记ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '无权删除此情绪日记' })
  @ApiResponse({ status: 404, description: '情绪日记不存在' })
  async deleteDiary(
    @Param('id', ParseIntPipe) id: number,
    @User() user: JwtPayload,
  ) {
    this.logger.log(`用户 ${user.uid} 删除情绪日记: ${id}`);
    return await this.diaryService.deleteDiary(id, user.uid);
  }

  @Post(':id/like')
  @UserType('beyondVisitor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '点赞/取消点赞情绪日记' })
  @ApiParam({ name: 'id', description: '情绪日记ID' })
  @ApiResponse({ status: 200, description: '操作成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '无法对私密日记点赞' })
  @ApiResponse({ status: 404, description: '情绪日记不存在' })
  async toggleLike(
    @Param('id', ParseIntPipe) id: number,
    @User() user: JwtPayload,
  ) {
    this.logger.log(`用户 ${user.uid} 点赞/取消点赞情绪日记: ${id}`);
    return await this.diaryService.toggleLike(id, user.uid);
  }

  @Post(':id/reply')
  @UserType('beyondVisitor')
  @ApiOperation({ summary: '回复情绪日记' })
  @ApiParam({ name: 'id', description: '情绪日记ID' })
  @ApiResponse({ status: 201, description: '回复成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '无法对私密日记回复' })
  @ApiResponse({ status: 404, description: '情绪日记不存在' })
  async createReply(
    @Param('id', ParseIntPipe) id: number,
    @User() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateReplySchema)) createReplyDto: CreateReplyDto,
  ) {
    this.logger.log(`用户 ${user.uid} 回复情绪日记: ${id}`);
    return await this.diaryService.createReply(id, user.uid, createReplyDto);
  }

  // @Get('user/:userId')
  // @Public()
  // @ApiOperation({ summary: '获取用户的情绪日记' })
  // @ApiParam({ name: 'userId', description: '用户ID' })
  // @ApiQuery({ name: 'page', required: false, description: '页码，默认为1' })
  // @ApiQuery({ name: 'limit', required: false, description: '每页数量，默认为10' })
  // @ApiResponse({ status: 200, description: '获取成功' })
  // async getUserDiaries(
  //   @Param('userId', ParseIntPipe) userId: number,
  //   @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
  //   @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  //   @User() user?: JwtPayload,
  // ) {
  //   this.logger.log(`获取用户 ${userId} 的情绪日记`);
  //   return await this.diaryService.getUserDiaries(userId, user?.uid, page, limit);
  // }

  @Get(':id/replies')
  @Public()
  @ApiOperation({ summary: '分页获取日记的回复列表' })
  @ApiParam({ name: 'id', description: '情绪日记ID' })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认为1' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量，默认为10' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '无法获取私密日记的回复' })
  @ApiResponse({ status: 404, description: '情绪日记不存在' })
  async getDiaryReplies(
    @Param('id', ParseIntPipe) id: number,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    this.logger.log(`获取日记 ${id} 的回复列表，页码: ${page}`);
    return await this.diaryService.getDiaryReplies(id, page, limit);
  }

  @Delete('reply/:replyId')
  @UserType('beyondVisitor')
  @ApiOperation({ summary: '删除日记回复' })
  @ApiParam({ name: 'replyId', description: '回复ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '无权删除此回复' })
  @ApiResponse({ status: 404, description: '回复不存在' })
  async deleteReply(
    @Param('replyId', ParseIntPipe) replyId: number,
    @User() user: JwtPayload,
  ) {
    this.logger.log(`用户 ${user.uid} 删除回复: ${replyId}`);
    return await this.diaryService.deleteReply(replyId, user.uid);
  }

  @Get('notifications/my')
  @UserType('beyondVisitor')
  @ApiOperation({ summary: '获取我收到的回复通知（分页）' })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认为1' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量，默认为20' })
  @ApiResponse({ status: 200, description: '获取成功，包含未读数量' })
  @ApiResponse({ status: 401, description: '未授权' })
  async getMyNotifications(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @User() user: JwtPayload,
  ) {
    this.logger.log(`用户 ${user.uid} 获取通知列表，页码: ${page}`);
    return await this.diaryService.getUserNotifications(user.uid, page, limit);
  }

  @Post('notifications/mark-read')
  @UserType('beyondVisitor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '标记所有通知为已读（清零未读数量）' })
  @ApiResponse({ status: 200, description: '操作成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  async markNotificationsAsRead(
    @User() user: JwtPayload,
    @Body('id', new ParseIntPipe({ optional: true })) id?: number,
  ) {
    this.logger.log(`用户 ${user.uid} 标记通知${id ? `id为${id}` : '所有'}为已读`);
    return await this.diaryService.markNotificationsAsRead(user.uid, id);
  }

}
