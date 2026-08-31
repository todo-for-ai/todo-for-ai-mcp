import type { Request, Response } from '../../types.js'

export class UserApiService {
  // TODO: 实现用户相关API调用
  async getCurrentUser(): Promise<Response> {
    throw new Error('Not implemented')
  }

  async updateUser(data: any): Promise<Response> {
    throw new Error('Not implemented')
  }

  async listUsers(): Promise<Response> {
    throw new Error('Not implemented')
  }

  async createApiToken(data: any): Promise<Response> {
    throw new Error('Not implemented')
  }

  async deleteApiToken(tokenId: number): Promise<Response> {
    throw new Error('Not implemented')
  }

  async listApiTokens(): Promise<Response> {
    throw new Error('Not implemented')
  }
}
