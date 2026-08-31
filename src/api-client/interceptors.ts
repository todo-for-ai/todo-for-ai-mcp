import { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

/**
 * Extend Axios config to include metadata
 */
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      requestId: string;
      startTime: number;
    };
  }
}

/**
 * API Error structure
 */
export interface ApiError {
  error: {
    message: string;
    code?: string;
  };
}

/**
 * Interceptor manager for Axios client
 */
export class InterceptorManager {
  constructor(
    private client: AxiosInstance,
    private logger: any
  ) {}

  /**
   * Setup all interceptors
   */
  setupInterceptors(): void {
    this.setupRequestInterceptors();
    this.setupResponseInterceptors();
    this.setupBasicInterceptors();
  }

  /**
   * Setup detailed request/response interceptors for debugging
   */
  private setupRequestInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        config.metadata = { requestId, startTime: Date.now() };

        this.logger.info(`[REQUEST_START] ${requestId} ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
          headers: {
            'Content-Type': config.headers?.['Content-Type'],
            'Authorization': config.headers?.['Authorization'] ? 'Bearer ***' : 'none',
            'User-Agent': config.headers?.['User-Agent']
          },
          hasData: !!config.data,
          dataSize: config.data ? JSON.stringify(config.data).length : 0,
          timeout: config.timeout
        });

        if (config.data) {
          this.logger.debug(`[REQUEST_DATA] ${requestId}`, config.data);
        }

        return config;
      },
      (error) => {
        this.logger.error(`[REQUEST_ERROR] Failed to setup request`, error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Setup response interceptors for debugging
   */
  private setupResponseInterceptors(): void {
    this.client.interceptors.response.use(
      (response) => {
        const requestId = response.config.metadata?.requestId || 'unknown';
        const startTime = response.config.metadata?.startTime || Date.now();
        const duration = Date.now() - startTime;

        this.logger.info(`[RESPONSE_SUCCESS] ${requestId} ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, {
          status: response.status,
          statusText: response.statusText,
          duration: `${duration}ms`,
          hasData: !!response.data,
          dataSize: response.data ? JSON.stringify(response.data).length : 0,
          contentType: response.headers?.['content-type']
        });

        if (response.data) {
          this.logger.debug(`[RESPONSE_DATA] ${requestId}`, response.data);
        }

        return response;
      },
      (error) => {
        const requestId = error.config?.metadata?.requestId || 'unknown';
        const startTime = error.config?.metadata?.startTime || Date.now();
        const duration = Date.now() - startTime;

        if (error.response) {
          this.logger.error(`[RESPONSE_ERROR] ${requestId} ${error.response.status} ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
            status: error.response.status,
            statusText: error.response.statusText,
            duration: `${duration}ms`,
            data: error.response.data,
            headers: error.response.headers,
            requestHeaders: error.config?.headers,
            config: {
              baseURL: error.config?.baseURL,
              url: error.config?.url,
              method: error.config?.method,
              timeout: error.config?.timeout
            },
            requestData: error.config?.data,
            userAgent: error.config?.headers?.['User-Agent'],
            authorization: error.config?.headers?.['Authorization'] ? 'Bearer ***' : 'none'
          });
        } else if (error.request) {
          this.logger.error(`[NETWORK_ERROR] ${requestId} No response received`, {
            duration: `${duration}ms`,
            code: error.code,
            message: error.message,
            config: {
              baseURL: error.config?.baseURL,
              url: error.config?.url,
              method: error.config?.method,
              timeout: error.config?.timeout
            },
            requestHeaders: error.config?.headers,
            userAgent: error.config?.headers?.['User-Agent'],
            authorization: error.config?.headers?.['Authorization'] ? 'Bearer ***' : 'none'
          });
        } else {
          this.logger.error(`[REQUEST_SETUP_ERROR] ${requestId}`, {
            message: error.message,
            code: error.code,
            stack: error.stack
          });
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Setup basic request/response interceptors
   */
  private setupBasicInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data,
        });
        return config;
      },
      (error) => {
        this.logger.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug(`API Response: ${response.status} ${response.config.url}`, {
          data: response.data,
        });
        return response;
      },
      (error: AxiosError) => {
        this.logger.error('API Response Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
        });
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  /**
   * Handle API errors and convert to standard Error
   */
  handleApiError(error: AxiosError): Error {
    if (error.response) {
      const apiError = error.response.data as ApiError;
      if (apiError && apiError.error) {
        return new Error(`API Error: ${apiError.error.message}`);
      }
      return new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
    } else if (error.request) {
      return new Error(`Network Error: Unable to connect to API`);
    } else {
      return new Error(`Request Error: ${error.message}`);
    }
  }
}
