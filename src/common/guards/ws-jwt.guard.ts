import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtUtils } from '../utils/jwt/jwt.service';
import { JwtPayload } from 'src/types/jwt';

/**
 * WebSocket JWT认证守卫
 * 用于保护需要认证的WebSocket消息处理
 * 检查客户端是否已通过认证（通过检查client.user属性）
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const wsContext = context.switchToWs();
    const client = wsContext.getClient<{ user?: JwtPayload }>();

    // 检查客户端是否已认证（用户信息是否已附加到客户端对象）
    if (!client || !client.user) {
      this.logger.warn('WebSocket client not authenticated');
      throw new UnauthorizedException('未认证，请先完成认证');
    }

    return true;
  }
}

/**
 * WebSocket Token验证守卫
 * 用于验证认证消息中的token
 * 验证成功后会将用户信息附加到客户端对象上
 */
@Injectable()
export class WsTokenVerifyGuard implements CanActivate {
  private readonly logger = new Logger(WsTokenVerifyGuard.name);

  constructor(private readonly jwtUtils: JwtUtils) {}

  canActivate(context: ExecutionContext): boolean {
    const wsContext = context.switchToWs();
    const client = wsContext.getClient<{ user?: JwtPayload }>();
    const data: unknown = wsContext.getData();

    // 从消息中提取token
    let token: string | undefined;

    if (typeof data === 'object' && data !== null && data !== undefined && 'token' in data) {
      token = (data as { token?: string }).token;
    }

    if (!token) {
      this.logger.warn('No token provided in authentication message');
      throw new UnauthorizedException('Token未提供');
    }

    try {
      const payload = this.jwtUtils.verify(token);
      // 将用户信息附加到客户端对象上
      client.user = payload;
      this.logger.log(`WebSocket authentication successful for user: ${payload.uid}`);
      return true;
    } catch (err) {
      this.logger.error('JWT verification failed:', err);
      throw new UnauthorizedException('Token验证失败');
    }
  }
}

