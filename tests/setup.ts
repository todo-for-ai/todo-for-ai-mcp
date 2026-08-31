import { vi } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.API_BASE_URL = 'http://localhost:8000';
process.env.API_TOKEN = 'test-token';

// Global mocks
global.fetch = vi.fn();
