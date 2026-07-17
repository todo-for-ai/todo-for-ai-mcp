import type { AxiosInstance } from 'axios';
import type { TodoConfig } from '../types.js';

/**
 * Shared helper functions used by all API method modules.
 */
export interface MethodHelpers {
  /** Axios client instance with interceptors configured. */
  client: AxiosInstance;
  /** Execute an async operation with automatic retry on transient errors. */
  executeWithRetry: <T>(operation: () => Promise<T>, name: string) => Promise<T>;
  /** Remove undefined/null/empty values from a params object. */
  compactParams: (params: Record<string, unknown>) => Record<string, unknown>;
  /** Unwrap the API response envelope ({ data: T }) -> T. */
  unwrapApiData: <T>(payload: unknown) => T;
  /** Application config. */
  config: TodoConfig;
}
