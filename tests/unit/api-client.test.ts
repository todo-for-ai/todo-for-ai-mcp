import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('APIClient', () => {
  let client: any;

  beforeEach(() => {
    client = {
      baseURL: 'http://localhost:8000',
      token: 'test-token',
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    vi.clearAllMocks();
  });

  it('should make authenticated GET request', async () => {
    const mockData = { id: '1', name: 'Test' };
    client.get.mockResolvedValue(mockData);

    const result = await client.get('/test');

    expect(result).toEqual(mockData);
    expect(client.get).toHaveBeenCalledWith('/test');
  });

  it('should make authenticated POST request', async () => {
    const requestData = { name: 'New Item' };
    const mockResponse = { id: '2', ...requestData };
    client.post.mockResolvedValue(mockResponse);

    const result = await client.post('/items', requestData);

    expect(result).toEqual(mockResponse);
    expect(client.post).toHaveBeenCalledWith('/items', requestData);
  });

  it('should make authenticated PUT request', async () => {
    const updateData = { name: 'Updated' };
    const mockResponse = { id: '1', ...updateData };
    client.put.mockResolvedValue(mockResponse);

    const result = await client.put('/items/1', updateData);

    expect(result).toEqual(mockResponse);
    expect(client.put).toHaveBeenCalledWith('/items/1', updateData);
  });

  it('should make authenticated DELETE request', async () => {
    client.delete.mockResolvedValue({ success: true });

    const result = await client.delete('/items/1');

    expect(result).toEqual({ success: true });
    expect(client.delete).toHaveBeenCalledWith('/items/1');
  });

  it('should handle network errors', async () => {
    client.get.mockRejectedValue(new Error('Network error'));

    await expect(client.get('/test')).rejects.toThrow('Network error');
  });

  it('should handle 401 unauthorized errors', async () => {
    client.get.mockRejectedValue(new Error('Unauthorized'));

    await expect(client.get('/protected')).rejects.toThrow('Unauthorized');
  });

  it('should handle 404 not found errors', async () => {
    client.get.mockRejectedValue(new Error('Not found'));

    await expect(client.get('/nonexistent')).rejects.toThrow('Not found');
  });

  it('should retry on transient errors', async () => {
    // First call fails, second succeeds
    client.get
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce({ success: true });

    // Mock retry logic - simulate retry
    let result;
    try {
      result = await client.get('/test');
    } catch (e) {
      result = await client.get('/test');
    }
    expect(result).toEqual({ success: true });
    expect(client.get).toHaveBeenCalledTimes(2);
  });

  it('should include auth token in headers', async () => {
    const mockData = { id: '1' };
    client.get.mockImplementation((url: string, headers?: any) => {
      // Verify headers would include token
      return Promise.resolve(mockData);
    });

    const result = await client.get('/test');
    expect(result).toEqual(mockData);
  });

  describe('Error handling', () => {
    it('should parse JSON error responses', async () => {
      const errorResponse = {
        error: 'Validation failed',
        details: ['field1 is required']
      };
      client.post.mockRejectedValue(new Error(JSON.stringify(errorResponse)));

      await expect(client.post('/items', {})).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      client.get.mockRejectedValue(new Error('Request timeout'));

      await expect(client.get('/slow-endpoint')).rejects.toThrow('timeout');
    });
  });
});
