import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../utils/logger.service';

export interface SessionData {
  cookies: Record<string, string>;
  headers: Record<string, string>;
  userAgent: string;
  lastUsed: Date;
  expiresAt: Date;
}

@Injectable()
export class SessionService {
  private sessions: Map<string, SessionData> = new Map();

  constructor(private readonly logger: LoggerService) {}

  createSession(
    bankCode: string,
    userId: string,
    data: Partial<SessionData> = {},
  ): string {
    const sessionId = `${bankCode}_${userId}_${Date.now()}`;
    
    const sessionData: SessionData = {
      cookies: data.cookies || {},
      headers: data.headers || {},
      userAgent: data.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      lastUsed: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 기본 30분 유효
    };
    
    this.sessions.set(sessionId, sessionData);
    this.logger.log(`Created session ${sessionId} for user ${userId} and bank ${bankCode}`);
    
    return sessionId;
  }

  getSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    // 세션 만료 확인
    if (new Date() > session.expiresAt) {
      this.removeSession(sessionId);
      return null;
    }
    
    // 마지막 사용 시간 업데이트
    session.lastUsed = new Date();
    this.sessions.set(sessionId, session);
    
    return session;
  }

  updateSession(sessionId: string, data: Partial<SessionData>): boolean {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }
    
    // 세션 데이터 업데이트
    const updatedSession: SessionData = {
      ...session,
      ...data,
      lastUsed: new Date(),
    };
    
    this.sessions.set(sessionId, updatedSession);
    return true;
  }

  removeSession(sessionId: string): boolean {
    const result = this.sessions.delete(sessionId);
    
    if (result) {
      this.logger.log(`Removed session ${sessionId}`);
    }
    
    return result;
  }

  extendSession(sessionId: string, minutes = 30): boolean {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }
    
    session.expiresAt = new Date(Date.now() + minutes * 60 * 1000);
    session.lastUsed = new Date();
    
    this.sessions.set(sessionId, session);
    this.logger.log(`Extended session ${sessionId} for ${minutes} minutes`);
    
    return true;
  }

  cleanupExpiredSessions(): number {
    const now = new Date();
    let removedCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      this.logger.log(`Cleaned up ${removedCount} expired sessions`);
    }
    
    return removedCount;
  }

  getActiveSessions(): number {
    return this.sessions.size;
  }
}
