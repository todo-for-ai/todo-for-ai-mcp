/**
 * Session management for HTTP transport
 */

import { randomUUID } from 'node:crypto';
import { SessionInfo, SessionManager } from '../types.js';
import { logger } from '../logger.js';

export class HttpSessionManager implements SessionManager {
  private sessions = new Map<string, SessionInfo>();
  private sessionTimeout: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(sessionTimeout: number = 300000) { // 5 minutes default
    this.sessionTimeout = sessionTimeout;
    this.startCleanupTimer();
  }

  createSession(): string {
    const sessionId = randomUUID();
    const now = new Date();
    
    const sessionInfo: SessionInfo = {
      id: sessionId,
      createdAt: now,
      lastActivity: now,
      isActive: true
    };

    this.sessions.set(sessionId, sessionInfo);
    
    logger.debug('[SESSION_MANAGER] Session created', {
      sessionId,
      totalSessions: this.sessions.size,
      createdAt: now.toISOString()
    });

    return sessionId;
  }

  getSession(sessionId: string): SessionInfo | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.debug('[SESSION_MANAGER] Session not found', { sessionId });
      return null;
    }

    // Check if session is expired
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
    
    if (timeSinceLastActivity > this.sessionTimeout) {
      logger.debug('[SESSION_MANAGER] Session expired', {
        sessionId,
        timeSinceLastActivity,
        sessionTimeout: this.sessionTimeout
      });
      this.removeSession(sessionId);
      return null;
    }

    return session;
  }

  updateActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      logger.debug('[SESSION_MANAGER] Session activity updated', {
        sessionId,
        lastActivity: session.lastActivity.toISOString()
      });
    }
  }

  removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.sessions.delete(sessionId);
      
      logger.debug('[SESSION_MANAGER] Session removed', {
        sessionId,
        totalSessions: this.sessions.size
      });
    }
  }

  cleanupExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
      
      if (timeSinceLastActivity > this.sessionTimeout) {
        this.removeSession(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('[SESSION_MANAGER] Cleaned up expired sessions', {
        cleanedCount,
        remainingSessions: this.sessions.size,
        sessionTimeout: this.sessionTimeout
      });
    }
  }

  getActiveSessions(): SessionInfo[] {
    return Array.from(this.sessions.values()).filter(session => session.isActive);
  }

  private startCleanupTimer(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000);

    logger.debug('[SESSION_MANAGER] Cleanup timer started', {
      intervalMs: 60000,
      sessionTimeout: this.sessionTimeout
    });
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined as any;
    }

    // Mark all sessions as inactive
    for (const session of this.sessions.values()) {
      session.isActive = false;
    }

    this.sessions.clear();
    
    logger.info('[SESSION_MANAGER] Session manager destroyed');
  }
}
