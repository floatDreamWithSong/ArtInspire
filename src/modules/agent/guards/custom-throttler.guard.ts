import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(CustomThrottlerGuard.name);

  // 获取真实IP地址（考虑代理情况）
  private getClientIp = (req: Request): string => {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  };
  
  protected generateKey(
    context: ExecutionContext,
    suffix: string,
    name: string,
  ): string {
    const request = context.switchToHttp().getRequest<Request & { user?: any }>();
    const clientIp = this.getClientIp(request);
    
    // 检查用户是否登录
    const user = request.user;
    
    this.logger.log(`rule: ${name} ip: ${clientIp}, user: ${user?.uid}`);

    if (user?.uid) {
      // 登录用户：基于用户ID限流
      return `user-${user.uid}-${name}-${suffix}`;
    } else {
      // 游客：基于IP限流
      return `ip-${clientIp}-${name}-${suffix}`;
    }
  }

  protected async throwThrottlingException(context: ExecutionContext): Promise<void> {
    const request = context.switchToHttp().getRequest<Request & { user?: any }>();
    const user = request.user;
    
    const message = user?.uid 
      ? `用户${user?.uid}请求过于频繁，请稍后再试`
      : `IP${this.getClientIp(request)}请求过于频繁，请稍后再试或登录后享受更高配额`;
      
    throw new ThrottlerException(message);
  }
} 