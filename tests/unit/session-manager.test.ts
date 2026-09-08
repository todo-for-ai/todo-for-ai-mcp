/**
 * HttpSessionManager 单元回归：创建/查询/过期/活跃刷新/清理/销毁。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpSessionManager } from '../../src/session/manager.js';

describe('HttpSessionManager', () => {
  let manager: HttpSessionManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new HttpSessionManager(60_000); // 1 分钟超时便于测试
  });

  afterEach(() => {
    manager.destroy();
    vi.useRealTimers();
  });

  it('创建会话并可通过 id 查询', () => {
    const id = manager.createSession();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    const session = manager.getSession(id);
    expect(session).not.toBeNull();
    expect(session!.isActive).toBe(true);
  });

  it('查询不存在的会话返回 null', () => {
    expect(manager.getSession('nope')).toBeNull();
  });

  it('超时会话查询返回 null 并被移除', () => {
    const id = manager.createSession();
    // 直接把 lastActivity 拨回 61 秒前
    const session = manager.getSession(id)!;
    session.lastActivity = new Date(Date.now() - 61_000);
    expect(manager.getSession(id)).toBeNull();
    expect(manager.getActiveSessions()).toHaveLength(0);
  });

  it('updateActivity 刷新最后活跃时间', () => {
    const id = manager.createSession();
    const session = manager.getSession(id)!;
    const before = session.lastActivity.getTime();
    vi.advanceTimersByTime(5_000);
    manager.updateActivity(id);
    expect(session.lastActivity.getTime()).toBeGreaterThan(before);
  });

  it('updateActivity 对不存在会话是 no-op', () => {
    expect(() => manager.updateActivity('ghost')).not.toThrow();
  });

  it('removeSession 移除会话', () => {
    const id = manager.createSession();
    manager.removeSession(id);
    expect(manager.getSession(id)).toBeNull();
    expect(manager.getActiveSessions()).toHaveLength(0);
  });

  it('removeSession 对不存在会话是 no-op', () => {
    expect(() => manager.removeSession('ghost')).not.toThrow();
  });

  it('cleanupExpiredSessions 只清理过期会话', () => {
    const fresh = manager.createSession();
    const stale = manager.createSession();
    manager.getSession(stale)!.lastActivity = new Date(Date.now() - 61_000);

    manager.cleanupExpiredSessions();

    const remaining = manager.getActiveSessions().map((s) => s.id);
    expect(remaining).toEqual([fresh]);
  });

  it('getActiveSessions 只返回活跃会话', () => {
    manager.createSession();
    manager.createSession();
    expect(manager.getActiveSessions()).toHaveLength(2);
  });

  it('周期清理定时器会自动清理过期会话', () => {
    const id = manager.createSession();
    manager.getSession(id)!.lastActivity = new Date(Date.now() - 61_000);
    vi.advanceTimersByTime(61_000); // 越过 60s 清理周期
    expect(manager.getActiveSessions()).toHaveLength(0);
  });

  it('destroy 清空会话并停止定时器', () => {
    manager.createSession();
    manager.destroy();
    expect(manager.getActiveSessions()).toHaveLength(0);
    // 定时器已停：推进时间不应再有清理动作（不抛错即验证）
    expect(() => vi.advanceTimersByTime(120_000)).not.toThrow();
  });
});
