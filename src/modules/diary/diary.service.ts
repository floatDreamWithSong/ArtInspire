import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/utils/prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { CreateDiaryDto, UpdateDiaryDto, CreateReplyDto, GetDiariesQueryDto } from '../../validators/diary';

@Injectable()
export class DiaryService {
  private readonly logger = new Logger(DiaryService.name);
  private readonly likeExpireTime = 24 * 60 * 60; // 24小时缓存

  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redisService: Redis,
  ) {}

  // 创建情绪日记
  async createDiary(userId: number, createDiaryDto: CreateDiaryDto) {
    const { ...rest } = createDiaryDto;

    const diary = await this.prisma.diary.create({
      data: {
        ...rest,
        authorId: userId,
      },
      include: {
        author: {
          select: {
            uid: true,
            username: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            replies: true,
            likes: true,
          },
        },
      },
    });

    this.logger.log(`用户 ${userId} 创建了情绪日记: ${diary.id}`);
    return diary;
  }

  // 获取情绪日记列表
  async getPublicDiaries(query: GetDiariesQueryDto, currentUserId?: number) {
    const { page, limit, authorId } = query;
    const skip = (page - 1) * limit;

    const [diaries, total] = await Promise.all([
      this.prisma.diary.findMany({
        where: {
          isPublic: true,
          authorId: authorId,
        },
        include: {
          author: {
            select: {
              uid: true,
              username: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              replies: true,
              likes: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.diary.count({
        where: {
          isPublic: true,
          authorId: authorId,
        },
      }),
    ]);

    // 处理匿名显示
    const processedDiaries = diaries.map((diary) => {
      if (diary.isAnonymous && diary.authorId !== currentUserId) {
        return {
          ...diary,
          author: {
            uid: 0,
            username: '匿名用户',
            avatar: null,
          },
        };
      }
      return diary;
    });

    return {
      data: processedDiaries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 获取单个情绪日记详情
  async getDiaryById(id: number, currentUserId?: number) {
    const diary = await this.prisma.diary.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            uid: true,
            username: true,
            avatar: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                uid: true,
                username: true,
                avatar: true,
              },
            },
          },
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            likes: true,
            replies: true,
          },
        },
      },
    });

    if (!diary) {
      throw new NotFoundException('情绪日记不存在');
    }

    // 检查访问权限
    if (!diary.isPublic && diary.authorId !== currentUserId) {
      throw new ForbiddenException('无权访问此情绪日记');
    }

    // 处理匿名显示
    if (diary.isAnonymous && diary.authorId !== currentUserId) {
      diary.author = {
        uid: 0,
        username: '匿名用户',
        avatar: null,
      };
    }

    return {
      ...diary,
      isLiked: currentUserId ? await this.checkUserLike(id, currentUserId) : false,
    };
  }

  // 更新情绪日记
  async updateDiary(id: number, userId: number, updateDiaryDto: UpdateDiaryDto) {
    const diary = await this.prisma.diary.findUnique({
      where: { id },
    });

    if (!diary) {
      throw new NotFoundException('情绪日记不存在');
    }

    if (diary.authorId !== userId) {
      throw new ForbiddenException('无权修改此情绪日记');
    }

    const { ...rest } = updateDiaryDto;

    const updatedDiary = await this.prisma.diary.update({
      where: { id },
      data: {
        ...rest,
      },
      include: {
        author: {
          select: {
            uid: true,
            username: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            replies: true,
            likes: true,
          },
        },
      },
    });

    this.logger.log(`用户 ${userId} 更新了情绪日记: ${id}`);
    return updatedDiary;
  }

  // 删除情绪日记
  async deleteDiary(id: number, userId: number) {
    const diary = await this.prisma.diary.findUnique({
      where: { id },
    });

    if (!diary) {
      throw new NotFoundException('情绪日记不存在');
    }

    if (diary.authorId !== userId) {
      throw new ForbiddenException('无权删除此情绪日记');
    }

    await this.prisma.diary.delete({
      where: { id },
    });

    this.logger.log(`用户 ${userId} 删除了情绪日记: ${id}`);
    return { message: '情绪日记删除成功' };
  }

  // 点赞/取消点赞
  async toggleLike(diaryId: number, userId: number) {
    const diary = await this.prisma.diary.findUnique({
      where: { id: diaryId },
    });

    if (!diary) {
      throw new NotFoundException('情绪日记不存在');
    }

    if (!diary.isPublic) {
      throw new ForbiddenException('无法对私密日记点赞');
    }

    // 检查是否已经点赞
    const existingLike = await this.checkUserLike(diaryId, userId);

    if (existingLike) {
      // 取消点赞
      await this.prisma.diaryLike.delete({
        where: { diaryId_userId: { diaryId, userId } },
      });

      // 更新 Redis 缓存
      await this.redisService.del(`diary:like:${diaryId}:${userId}`);

      this.logger.log(`用户 ${userId} 取消点赞情绪日记: ${diaryId}`);
      return { liked: false, message: '取消点赞成功' };
    }
    // 点赞
    await this.prisma.diaryLike.create({
      data: {
        diaryId,
        userId,
      },
    });

    // 设置 Redis 缓存
    await this.redisService.set(`diary:like:${diaryId}:${userId}`, '1', 'EX', this.likeExpireTime);

    this.logger.log(`用户 ${userId} 点赞了情绪日记: ${diaryId}`);
    return { liked: true, message: '点赞成功' };
  }

  // 检查用户是否已点赞
  async checkUserLike(diaryId: number, userId: number): Promise<boolean> {
    // 先检查 Redis 缓存
    const cached = await this.redisService.get(`diary:like:${diaryId}:${userId}`);
    if (cached) {
      return true;
    }

    // 查询数据库
    const like = await this.prisma.diaryLike.findUnique({
      where: {
        diaryId_userId: {
          diaryId,
          userId,
        },
      },
    });

    if (like) {
      // 更新缓存
      await this.redisService.set(`diary:like:${diaryId}:${userId}`, '1', 'EX', this.likeExpireTime);
      return true;
    }

    return false;
  }

  // 添加回复
  async createReply(diaryId: number, userId: number, createReplyDto: CreateReplyDto) {
    const diary = await this.prisma.diary.findUnique({
      where: { id: diaryId },
    });

    if (!diary) {
      throw new NotFoundException('情绪日记不存在');
    }

    if (!diary.isPublic) {
      throw new ForbiddenException('无法对私密日记回复');
    }

    const reply = await this.prisma.diaryReply.create({
      data: {
        content: createReplyDto.content,
        diaryId,
        authorId: userId,
      },
      include: {
        author: {
          select: {
            uid: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // 创建通知
    await this.createNotification(diaryId, userId, reply.id);

    this.logger.log(`用户 ${userId} 回复了情绪日记: ${diaryId}`);
    return reply;
  }

  // 获取用户的情绪日记
  async getUserDiaries(userId: number, currentUserId?: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    // 如果是查看自己的日记，可以看到所有的；如果是查看别人的，只能看到公开的
    const where = userId === currentUserId ? { authorId: userId } : { authorId: userId, isPublic: true };

    const [diaries, total] = await Promise.all([
      this.prisma.diary.findMany({
        where,
        include: {
          author: {
            select: {
              uid: true,
              username: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              replies: true,
              likes: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.diary.count({ where }),
    ]);

    // 处理匿名显示
    const processedDiaries = diaries.map((diary) => {
      if (diary.isAnonymous && diary.authorId !== currentUserId) {
        return {
          ...diary,
          author: {
            uid: 0,
            username: '匿名用户',
            avatar: null,
          },
        };
      }
      return diary;
    });

    return {
      data: processedDiaries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 获取日记的回复列表（分页）
  async getDiaryReplies(diaryId: number, page = 1, limit = 10) {
    const diary = await this.prisma.diary.findUnique({
      where: { id: diaryId },
      select: { isPublic: true },
    });

    if (!diary) {
      throw new NotFoundException('情绪日记不存在');
    }

    if (!diary.isPublic) {
      throw new ForbiddenException('无法获取私密日记的回复');
    }

    const skip = (page - 1) * limit;

    const [replies, total] = await Promise.all([
      this.prisma.diaryReply.findMany({
        where: { diaryId },
        include: {
          author: {
            select: {
              uid: true,
              username: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        skip,
        take: limit,
      }),
      this.prisma.diaryReply.count({ where: { diaryId } }),
    ]);

    return {
      data: replies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 删除回复
  async deleteReply(replyId: number, userId: number) {
    const reply = await this.prisma.diaryReply.findUnique({
      where: { id: replyId },
      include: {
        diary: {
          select: {
            authorId: true,
          },
        },
      },
    });

    if (!reply) {
      throw new NotFoundException('回复不存在');
    }

    // 只有回复作者或日记作者可以删除回复
    if (reply.authorId !== userId && reply.diary.authorId !== userId) {
      throw new ForbiddenException('无权删除此回复');
    }

    // 删除回复时同时删除相关通知
    await this.prisma.$transaction([
      this.prisma.userNotification.deleteMany({
        where: { replyId },
      }),
      this.prisma.diaryReply.delete({
        where: { id: replyId },
      }),
    ]);

    this.logger.log(`用户 ${userId} 删除了回复: ${replyId}`);
    return { message: '回复删除成功' };
  }

  // 获取用户收到的通知（分页）
  async getUserNotifications(userId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.userNotification.findMany({
        where: { receiverId: userId },
        include: {
          sender: {
            select: {
              uid: true,
              username: true,
              avatar: true,
            },
          },
          diary: {
            select: {
              id: true,
              title: true,
            },
          },
          reply: {
            select: {
              id: true,
              content: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.userNotification.count({
        where: { receiverId: userId },
      }),
      this.prisma.userNotification.count({
        where: { receiverId: userId, isRead: false },
      }),
    ]);

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  // 标记通知为已读
  async markNotificationsAsRead(userId: number, id?: number) {
    if (id) {
      // 只标记一条为已读，且必须属于当前用户
      await this.prisma.userNotification.update({
        where: {
          id,
          receiverId: userId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });
      this.logger.log(`用户 ${userId} 标记通知 ${id} 为已读`);
      return { message: `已标记通知 ${id} 为已读` };
    }
    // 标记所有为已读
    const updated = await this.prisma.userNotification.updateMany({
      where: {
        receiverId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
    this.logger.log(`用户 ${userId} 标记了 ${updated.count} 条通知为已读`);
    return { message: `已标记 ${updated.count} 条通知为已读` };
  }

  // 创建通知（在创建回复时调用）
  private async createNotification(diaryId: number, senderId: number, replyId: number) {
    // 获取日记作者
    const diary = await this.prisma.diary.findUnique({
      where: { id: diaryId },
      select: { authorId: true },
    });

    if (!diary || diary.authorId === senderId) {
      // 如果日记不存在或者是自己回复自己的日记，不创建通知
      return;
    }

    await this.prisma.userNotification.create({
      data: {
        type: 'reply',
        receiverId: diary.authorId,
        senderId,
        diaryId,
        replyId,
      },
    });

    this.logger.log(`为用户 ${diary.authorId} 创建回复通知，来自用户 ${senderId}`);
  }
}
