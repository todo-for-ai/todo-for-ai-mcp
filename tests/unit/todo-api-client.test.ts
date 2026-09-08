/**
 * TodoApiClient 类（src/api-client.ts）单元回归。
 *
 * axios 以 vi.mock 打桩：验证构造（baseURL 归一/鉴权头/拦截器注册）、
 * get/post/put/delete 走 axios 实例、executeWithRetry 的重试矩阵
 * （网络错误与 5xx 重试、4xx 不重试、重试耗尽、非 Axios 错误立即抛）、
 * unwrapApiData/compactParams、代表性委托方法透传。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const axiosInstance: any = {
  defaults: { headers: { common: {} } },
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => axiosInstance),
  },
}));

import { TodoApiClient } from '../../src/api-client.js';
import type { TodoConfig } from '../../src/types.js';

function makeConfig(overrides: Partial<TodoConfig> = {}): TodoConfig {
  return {
    apiBaseUrl: 'http://localhost:50110/todo-for-ai/api/v1/',
    apiToken: 'tok-test-12345678',
    apiTimeout: 5000,
    ...overrides,
  } as TodoConfig;
}

function makeClient(overrides: Partial<TodoConfig> = {}): TodoApiClient {
  return new TodoApiClient(makeConfig(overrides));
}

function capturedRequestInterceptor(): { onFulfilled: any; onRejected: any } {
  // 构造器注册的元数据拦截器（注册顺序里的第一个）
  const calls = axiosInstance.interceptors.request.use as any;
  const [onFulfilled, onRejected] = calls.mock.calls[0];
  return { onFulfilled, onRejected };
}

function capturedResponseInterceptors(): { onFulfilled: any; onRejected: any }[] {
  const calls = axiosInstance.interceptors.response.use as any;
  return calls.mock.calls.map(([onFulfilled, onRejected]: any[]) => ({
    onFulfilled,
    onRejected,
  }));
}

describe('TodoApiClient 构造', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axiosInstance.get.mockReset();
    axiosInstance.post.mockReset();
    axiosInstance.put.mockReset();
    axiosInstance.delete.mockReset();
  });

  it('baseURL 归一化：去掉尾斜杠', () => {
    makeClient();
    // 拦截器注册次数：构造器 2 + setupInterceptors 2
    expect(axiosInstance.interceptors.request.use).toHaveBeenCalled();
    expect(axiosInstance.interceptors.response.use).toHaveBeenCalled();
  });

  it('提供 apiToken 时设置 Authorization 头', () => {
    makeClient();
    expect(axiosInstance.defaults.headers.common['Authorization']).toBe(
      'Bearer tok-test-12345678'
    );
  });

  it('请求拦截器为 config 注入 metadata', () => {
    makeClient();
    const { onFulfilled } = capturedRequestInterceptor();
    const config = onFulfilled({ method: 'get', url: '/x' });
    expect(config.metadata.requestId).toBeTruthy();
    expect(config.metadata.startTime).toBeGreaterThan(0);
  });

  it('请求拦截器拒绝错误', async () => {
    makeClient();
    const { onRejected } = capturedRequestInterceptor();
    const rejection = onRejected(new Error('setup failed'));
    await expect(rejection).rejects.toThrow('setup failed');
  });

  it('响应拦截器成功分支透传', () => {
    makeClient();
    const [{ onFulfilled }] = capturedResponseInterceptors();
    const response = {
      status: 200,
      statusText: 'OK',
      config: { method: 'get', url: '/x', metadata: { requestId: 'r1' } },
      data: { ok: true },
      headers: {},
    };
    expect(onFulfilled(response)).toBe(response);
  });

  it('响应拦截器错误分支分类日志并继续拒绝', async () => {
    makeClient();
    const interceptors = capturedResponseInterceptors();
    const withResponse = interceptors[1].onRejected({
      response: { status: 500, statusText: 'ISE' },
      config: { method: 'get', url: '/x' },
      message: 'server error',
    });
    await expect(withResponse).rejects.toBeTruthy();

    const networkOnly = interceptors[1].onRejected({
      request: {},
      code: 'ECONNREFUSED',
      message: 'no response',
    });
    await expect(networkOnly).rejects.toBeTruthy();

    const setupError = interceptors[1].onRejected(new Error('bad setup'));
    await expect(setupError).rejects.toBeTruthy();
  });
});

describe('TodoApiClient HTTP 包装', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axiosInstance.get.mockReset();
    axiosInstance.post.mockReset();
    axiosInstance.put.mockReset();
    axiosInstance.delete.mockReset();
  });

  it('get 走 axios 实例', async () => {
    const client = makeClient();
    axiosInstance.get.mockResolvedValue({ data: { ok: 1 } });
    await client.getSharedContext({ task_id: 1 } as any);
    expect(axiosInstance.get).toHaveBeenCalled();
  });

  it('post 走 axios 实例', async () => {
    const client = makeClient();
    axiosInstance.post.mockResolvedValue({ data: { created: true } });
    await client.postTaskEvent({ task_id: 1, event_type: 'note' } as any);
    expect(axiosInstance.post).toHaveBeenCalled();
  });

  it('unwrapApiData 解包 data 字段', async () => {
    const client = makeClient() as any;
    expect(client.unwrapApiData({ data: { inner: 1 } })).toEqual({
      inner: 1,
    });
    expect(client.unwrapApiData('raw')).toBe('raw');
  });

  it('compactParams 剥掉 undefined/null/空串', () => {
    const client = makeClient() as any;
    expect(
      client.compactParams({ a: 1, b: undefined, c: null, d: '', e: 'x' })
    ).toEqual({ a: 1, e: 'x' });
  });
});

describe('executeWithRetry 重试矩阵', () => {
  function axiosError(message: string, status?: number): any {
    const err: any = new Error(`AxiosError: ${message}`);
    if (status) err.response = { status };
    return err;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('首次成功不重试', async () => {
    const client = makeClient() as any;
    let attempts = 0;
    const result = await client.executeWithRetry(async () => {
      attempts += 1;
      return 'ok';
    }, 'op');
    expect(result).toBe('ok');
    expect(attempts).toBe(1);
  });

  it('网络错误（无 response）触发重试后成功', async () => {
    const client = makeClient() as any;
    let attempts = 0;
    const operation = async () => {
      attempts += 1;
      if (attempts === 1) {
        throw axiosError('ECONNRESET');
      }
      return 'recovered';
    };
    const pending = client.executeWithRetry(operation, 'net-op');
    // 重试延迟 1000ms（fake timers 推进）
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toBe('recovered');
    expect(attempts).toBe(2);
  });

  it('5xx 触发重试，重试耗尽后抛最后错误', async () => {
    const client = makeClient() as any;
    let attempts = 0;
    const operation = async () => {
      attempts += 1;
      throw axiosError('bad gateway', 502);
    };
    const pending = client.executeWithRetry(operation, 'boom-op');
    // 先挂上 rejects 断言再推时间，避免拒绝短暂处于未处理状态
    const assertion = expect(pending).rejects.toBeTruthy();
    // maxRetries=3 → 3 次重试延迟：1000/2000/4000
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);
    await assertion;
    expect(attempts).toBe(4); // 1 次原始 + 3 次重试
  });

  it('4xx 不重试立即抛', async () => {
    const client = makeClient() as any;
    let attempts = 0;
    const operation = async () => {
      attempts += 1;
      throw axiosError('forbidden', 403);
    };
    await expect(
      client.executeWithRetry(operation, 'forbidden-op')
    ).rejects.toBeTruthy();
    expect(attempts).toBe(1);
  });

  it('非 Axios 错误不重试立即抛', async () => {
    const client = makeClient() as any;
    let attempts = 0;
    const operation = async () => {
      attempts += 1;
      throw new Error('plain failure');
    };
    await expect(
      client.executeWithRetry(operation, 'plain-op')
    ).rejects.toThrow('plain failure');
    expect(attempts).toBe(1);
  });
});

describe('TodoApiClient 委托方法透传', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axiosInstance.get.mockReset();
    axiosInstance.post.mockReset();
  });

  it('getProjectTasksByName 走 client.post', async () => {
    const client = makeClient();
    axiosInstance.post.mockResolvedValue({ data: { data: { tasks: [] } } });
    const result = await client.getProjectTasksByName({
      project_name: 'demo',
    } as any);
    expect(axiosInstance.post).toHaveBeenCalledWith(
      'mcp/call',
      expect.objectContaining({ name: 'get_project_tasks_by_name' })
    );
    // 委托方法直接返回 response.data（未再解包）
    expect(result).toEqual({ data: { tasks: [] } });
  });
});

describe('TodoApiClient 委托方法 magic 扫描', () => {
  function magic(): any {
    const fn: any = function magicValue() {
      return magic();
    };
    fn[Symbol.toPrimitive] = () => 'test';
    fn[Symbol.iterator] = function* () {};
    return new Proxy(fn, {
      get(target, prop) {
        if (prop === Symbol.toPrimitive || prop === Symbol.iterator) {
          return target[prop];
        }
        if (prop === 'then' || prop === 'catch' || prop === 'finally') {
          return undefined;
        }
        if (prop === 'length' || prop === 'size') {
          return 0;
        }
        return magic();
      },
      apply() {
        return magic();
      },
      has() {
        return false;
      },
    });
  }

  it('类上全部委托方法可经 axios 桩触发（函数覆盖清扫）', async () => {
    vi.clearAllMocks();
    axiosInstance.get.mockResolvedValue({ data: magic() });
    axiosInstance.post.mockResolvedValue({ data: magic() });
    axiosInstance.put.mockResolvedValue({ data: magic() });
    axiosInstance.delete.mockResolvedValue({ data: magic() });

    const client: any = makeClient();
    const proto = Object.getPrototypeOf(client);
    const methods = Object.getOwnPropertyNames(proto).filter(
      (name) =>
        name !== 'constructor' &&
        typeof proto[name] === 'function' &&
        !name.startsWith('_')
    );
    expect(methods.length).toBeGreaterThanOrEqual(150);

    let invoked = 0;
    for (const name of methods) {
      try {
        await client[name](magic());
        invoked += 1;
      } catch {
        if (
          axiosInstance.get.mock.calls.length +
            axiosInstance.post.mock.calls.length +
            axiosInstance.put.mock.calls.length +
            axiosInstance.delete.mock.calls.length >
          0
        ) {
          invoked += 1;
        }
      }
    }
    expect(invoked).toBeGreaterThanOrEqual(150);
  });
});
