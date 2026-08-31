import type { Request, Response } from '../../types.js'

export class ProjectApiService {
  // TODO: 实现项目相关API调用
  async createProject(data: any): Promise<Response> {
    throw new Error('Not implemented')
  }

  async updateProject(projectId: number, data: any): Promise<Response> {
    throw new Error('Not implemented')
  }

  async getProject(projectId: number): Promise<Response> {
    throw new Error('Not implemented')
  }

  async deleteProject(projectId: number): Promise<Response> {
    throw new Error('Not implemented')
  }

  async listProjects(): Promise<Response> {
    throw new Error('Not implemented')
  }
}
