import { AxiosError } from 'axios';

/**
 * Retry Configuration
 */
export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryDelayMultiplier: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  retryDelay: 2000, // 基础延迟2秒
  retryDelayMultiplier: 2,
};

/**
 * Retry utilities for API client
 */
export class RetryManager {
  private config: RetryConfig;
  private lastRequestTime: number = 0;

  constructor(config: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.config = config;
  }

  /**
   * Sleep for specified milliseconds
   */
  async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Determine if request should be retried based on error and attempt count
   */
  shouldRetry(error: AxiosError, attempt: number): boolean {
    if (attempt >= this.config.maxRetries) {
      return false;
    }

    // Retry on network errors or 5xx server errors
    if (!error.response) {
      return true; // Network error
    }

    const status = error.response.status;

    // Retry on 5xx server errors
    if (status >= 500 && status < 600) {
      return true;
    }

    // Retry on 429 (Too Many Requests)
    if (status === 429) {
      return true;
    }

    // Retry on 400 errors that might be Cloudflare security responses
    if (status === 400) {
      const errorMessage = error.message || '';
      const responseData = typeof error.response.data === 'string' ? error.response.data : '';

      // Check for Cloudflare security/rate limiting errors
      if (errorMessage.includes('HTTPS port') ||
          errorMessage.includes('rate limit') ||
          responseData.includes('cloudflare') ||
          responseData.includes('security')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Enforce minimum request interval to avoid rate limiting
   */
  async enforceRequestInterval(minInterval: number): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await this.sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Calculate delay for retry attempt using exponential backoff
   */
  calculateRetryDelay(attempt: number): number {
    return this.config.retryDelay * Math.pow(this.config.retryDelayMultiplier, attempt);
  }

  /**
   * Execute an operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    logger: any
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (error instanceof Error && error.message.includes('AxiosError')) {
          const axiosError = error as AxiosError;

          logger.error(`${operationName} AxiosError details:`, {
            message: axiosError.message,
            code: axiosError.code,
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            url: axiosError.config?.url,
            baseURL: axiosError.config?.baseURL,
            method: axiosError.config?.method,
            headers: axiosError.config?.headers,
            responseData: axiosError.response?.data,
            responseHeaders: axiosError.response?.headers
          });

          if (this.shouldRetry(axiosError, attempt)) {
            const delay = this.calculateRetryDelay(attempt);
            logger.warn(`${operationName} failed (attempt ${attempt + 1}/${this.config.maxRetries + 1}), retrying in ${delay}ms...`, error.message);
            await this.sleep(delay);
            continue;
          }
        } else {
          const err = error as Error;
          logger.error(`${operationName} non-Axios error:`, {
            message: err.message,
            stack: err.stack,
            name: err.name
          });
        }

        // Don't retry for non-retryable errors
        throw error;
      }
    }

    throw lastError!;
  }
}
