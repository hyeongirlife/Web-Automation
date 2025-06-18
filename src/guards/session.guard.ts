import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 세션 ID를 쿼리 파라미터, 헤더, 또는 쿠키에서 찾음
    const sessionId =
      (request.query.sessionId as string) ||
      (request.headers['session-id'] as string) ||
      request.headers['authorization']?.replace('Bearer ', '') ||
      request.cookies?.sessionId;

    if (!sessionId) {
      throw new UnauthorizedException('Session ID is required');
    }

    // 세션 ID 형식 검증 (기본적인 형식 검증)
    if (!this.isValidSessionIdFormat(sessionId)) {
      throw new UnauthorizedException('Invalid session ID format');
    }

    // 세션 ID를 요청 객체에 저장하여 컨트롤러에서 사용할 수 있게 함
    request['sessionId'] = sessionId;

    // 실제 세션 유효성 검증은 컨트롤러에서 수행
    // 여기서는 형식만 검증하고 통과시킴
    return true;
  }

  private isValidSessionIdFormat(sessionId: string): boolean {
    // 세션 ID 형식 검증 (예: session_로 시작하고 최소 길이 요구)
    if (!sessionId || typeof sessionId !== 'string') {
      return false;
    }

    return sessionId.startsWith('session_') || sessionId.length >= 10;
  }
}
