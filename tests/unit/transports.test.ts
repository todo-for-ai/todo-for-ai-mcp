/**
 * 传输层单元回归：BaseTransport 契约、TransportFactory（stdio-only 模式）、
 * StdioTransport 生命周期（启动/重复启动/停止/停止失败）、HttpTransport
 * 真实 HTTP 全链路（临时端口：health、initialize 建会话、会话复用、
 * 非法请求 400、CORS 白名单通配、JSON 解析错误 400、停止清理）。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { BaseTransport } from '../../src/transports/base.js';
import { TransportFactory } from '../../src/transports/factory.js';
import { StdioTransport } from '../../src/transports/stdio.js';
import { HttpTransport } from '../../src/transports/http.js';


/**
 * tests/setup.ts 把 global.fetch 换成了 vi.fn()；HTTP 链路测试改用
 * node:http 的极简请求助手（不受全局 mock 影响）。
 */
function httpRequest(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {}
): Promise<{ status: number; headers: Record<string, string | undefined>; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: options.headers,
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        const headerMap: Record<string, string | undefined> = {};
        for (const [k, v] of Object.entries(res.headers)) {
          headerMap[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;
        }
        let body: any = raw;
        try {
          body = JSON.parse(raw);
        } catch {
          /* 保留原文 */
        }
        resolve({ status: res.statusCode || 0, headers: headerMap, body });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function _mcpServer(): Server {
  return new Server({ name: 'test-server', version: '1.0.0' }, { capabilities: {} });
}

describe('BaseTransport 契约', () => {
  class _Probe extends BaseTransport {
    getType() {
      return 'stdio' as const;
    }
    async start() {
      this.setServer(_mcpServer());
      this.setRunning(true);
    }
    async stop() {
      this.setRunning(false);
    }
    exposedRunning() {
      return this.isRunning();
    }
  }

  it('isRunning 初始为 false，setRunning 后为 true', async () => {
    const probe = new _Probe();
    expect(probe.isRunning()).toBe(false);
    await probe.start();
    expect(probe.exposedRunning()).toBe(true);
    await probe.stop();
    expect(probe.isRunning()).toBe(false);
  });
});

describe('TransportFactory', () => {
  it('create 返回 StdioTransport（stdio-only 模式）', () => {
    const config = {
      baseUrl: 'http://localhost:50110',
      apiKey: 'k',
      httpPort: 3000,
      httpHost: '127.0.0.1',
      sessionTimeout: 300000,
      enableDnsRebindingProtection: false,
      allowedOrigins: [] as string[],
      maxConnections: 10,
    };
    const transport = TransportFactory.create(config as any);
    expect(transport).toBeInstanceOf(StdioTransport);
    expect(transport.getType()).toBe('stdio');
    expect(transport.isRunning()).toBe(false);
  });
});

describe('StdioTransport 生命周期', () => {
  it('start 连接服务器并置运行态', async () => {
    const transport = new StdioTransport();
    const server = _mcpServer();
    const connectSpy = vi.spyOn(server, 'connect').mockResolvedValue();
    await transport.start(server);
    expect(connectSpy).toHaveBeenCalledOnce();
    expect(transport.isRunning()).toBe(true);
    await transport.stop();
  });

  it('重复 start 抛错', async () => {
    const transport = new StdioTransport();
    await transport.start(_mcpServer());
    await expect(transport.start(_mcpServer())).rejects.toThrow(
      'already running'
    );
    await transport.stop();
  });

  it('start 失败向上抛错且不置运行态', async () => {
    const transport = new StdioTransport();
    const server = _mcpServer();
    vi.spyOn(server, 'connect').mockRejectedValue(new Error('boom'));
    await expect(transport.start(server)).rejects.toThrow('boom');
    expect(transport.isRunning()).toBe(false);
  });

  it('未启动时 stop 直接返回', async () => {
    const transport = new StdioTransport();
    await expect(transport.stop()).resolves.toBeUndefined();
  });

  it('stop 关闭底层传输', async () => {
    const transport = new StdioTransport();
    await transport.start(_mcpServer());
    await transport.stop();
    expect(transport.isRunning()).toBe(false);
  });

  it('stop 失败向上抛错', async () => {
    const transport = new StdioTransport();
    await transport.start(_mcpServer());
    const underlying = (transport as any).transport;
    vi.spyOn(underlying, 'close').mockRejectedValue(new Error('close boom'));
    await expect(transport.stop()).rejects.toThrow('close boom');
  });
});

describe('HttpTransport 真实 HTTP 链路', () => {
  let transport: HttpTransport;
  let baseUrl: string;

  beforeEach(async () => {
    transport = new HttpTransport({
      port: 0, // 临时端口
      host: '127.0.0.1',
      sessionTimeout: 300000,
      enableDnsRebindingProtection: false,
      allowedOrigins: ['http://localhost:*', 'http://exact.example.com'],
      maxConnections: 10,
    });
    await transport.start(_mcpServer());
    const httpServer = (transport as any).httpServer;
    const { port } = httpServer.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await transport.stop();
  });

  it('getType 返回 http', () => {
    expect(transport.getType()).toBe('http');
  });

  it('重复 start 抛错', async () => {
    await expect(transport.start(_mcpServer())).rejects.toThrow(
      'already running'
    );
  });

  it('GET /health 返回健康信息', async () => {
    const resp = await httpRequest(`${baseUrl}/health`);
    expect(resp.status).toBe(200);
    const body = resp.body;
    expect(body.status).toBe('healthy');
    expect(body.transport).toBe('http');
    expect(typeof body.activeSessions).toBe('number');
  });

  async function initializeSession(): Promise<string> {
    const resp = await httpRequest(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'vitest', version: '1.0.0' },
        },
      }),
    });
    expect(resp.status).toBe(200);
    const sessionId = resp.headers['mcp-session-id'];
    expect(sessionId).toBeTruthy();
    return sessionId!;
  }

  it('initialize 建会话，后续请求复用会话', async () => {
    const sessionId = await initializeSession();
    const resp = await httpRequest(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'Mcp-Session-Id': sessionId,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'ping',
      }),
    });
    expect(resp.status).toBe(200);
    // 会话已被记录
    const health = await httpRequest(`${baseUrl}/health`);
    expect(health.body.activeSessions).toBe(1);
  });

  it('无会话且非 initialize 的 POST 返回 400', async () => {
    const resp = await httpRequest(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'ping' }),
    });
    expect(resp.status).toBe(400);
    expect(resp.body.error.message).toContain('No valid session');
  });

  it('带未知会话 id 的 GET 返回 400', async () => {
    const resp = await httpRequest(`${baseUrl}/mcp`, {
      method: 'GET',
      headers: { 'Mcp-Session-Id': 'unknown-session' },
    });
    expect(resp.status).toBe(400);
  });

  it('JSON 解析错误返回 400 parse error', async () => {
    const resp = await httpRequest(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: '{not-json',
    });
    expect(resp.status).toBe(400);
    expect(resp.body.error.code).toBe(-32700);
  });

  it('CORS 通配白名单放行匹配来源', async () => {
    const resp = await httpRequest(`${baseUrl}/health`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    expect(resp.status).toBe(200);
  });

  it('CORS 精确来源白名单放行', async () => {
    const resp = await httpRequest(`${baseUrl}/health`, {
      headers: { Origin: 'http://exact.example.com' },
    });
    expect(resp.status).toBe(200);
  });

  it('CORS 拒绝不在白名单的来源', async () => {
    const resp = await httpRequest(`${baseUrl}/health`, {
      headers: { Origin: 'http://evil.example.com' },
    });
    expect([400, 500]).toContain(resp.status);
  });

  it('stop 清理会话与服务器', async () => {
    await initializeSession();
    const httpServer = (transport as any).httpServer;
    const { port } = httpServer.address();
    await transport.stop();
    expect(transport.isRunning()).toBe(false);
    await expect(
      httpRequest(`http://127.0.0.1:${port}/health`)
    ).rejects.toThrow();
  });

  it('端口被占用时 start 抛错', async () => {
    const httpServer = (transport as any).httpServer;
    const { port } = httpServer.address();
    const conflicting = new HttpTransport({
      port,
      host: '127.0.0.1',
      sessionTimeout: 300000,
      enableDnsRebindingProtection: false,
      allowedOrigins: [],
      maxConnections: 10,
    });
    await expect(conflicting.start(_mcpServer())).rejects.toThrow();
    await conflicting.stop().catch(() => undefined);
  });

  it('DELETE /mcp 终止会话并触发清理', async () => {
    const sessionId = await initializeSession();
    const resp = await httpRequest(`${baseUrl}/mcp`, {
      method: 'DELETE',
      headers: { 'Mcp-Session-Id': sessionId },
    });
    expect(resp.status).toBeLessThan(500);
    await resp;
    // SDK 在终止流程里关闭传输 → onclose 清理会话
    const health = await httpRequest(`${baseUrl}/health`);
    expect(health.body.activeSessions).toBe(0);
  });

  it('handleRequest 抛错时返回 500 Internal error', async () => {
    const sessionId = await initializeSession();
    const sdkTransport = (transport as any).transports.get(sessionId);
    vi.spyOn(sdkTransport, 'handleRequest').mockRejectedValue(
      new Error('handler boom')
    );
    const resp = await httpRequest(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'Mcp-Session-Id': sessionId,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'ping' }),
    });
    expect(resp.status).toBe(500);
    expect(resp.body.error.code).toBe(-32603);
  });

  it('Accept 头缺少 event-stream 时被自动补全', async () => {
    const resp = await httpRequest(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'vitest', version: '1.0.0' },
        },
      }),
    });
    expect(resp.status).toBe(200);
  });

  it('运行期 server error 只记录不击穿进程', async () => {
    const httpServer = (transport as any).httpServer;
    expect(() =>
      httpServer.emit('error', Object.assign(new Error('runtime oops'), {
        code: 'EPIPE',
      }))
    ).not.toThrow();
    // 服务仍然健康
    const resp = await httpRequest(`${baseUrl}/health`);
    expect(resp.status).toBe(200);
  });

  it('未启动时 stop 直接返回', async () => {
    const idle = new HttpTransport({
      port: 0,
      host: '127.0.0.1',
      sessionTimeout: 300000,
      enableDnsRebindingProtection: false,
      allowedOrigins: [],
      maxConnections: 10,
    });
    await expect(idle.stop()).resolves.toBeUndefined();
  });
});
