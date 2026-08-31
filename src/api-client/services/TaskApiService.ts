import type { Request, Response } from '../../types.js'

export class TaskApiService {
  // TODO: 实现任务相关API调用
  async createTask(data: any): Promise<Response> {
    throw new Error('Not implemented')
  }

  async updateTask(taskId: number, data: any): Promise<Response> {
    throw new Error('Not implemented')
  }

  async getTask(taskId: number): Promise<Response> {
    throw new Error('Not implemented')
  }

  async deleteTask(taskId: number): Promise<Response> {
    throw new Error('Not implemented')
  }

  async listTasks(projectId: number): Promise<Response> {
    throw new Error('Not implemented')
  }

  async updateTaskStatus(taskId: number, status: string): Promise<Response> {
    throw new Error('Not implemented')
  }

  async batchUpdateTasks(taskIds: number[], updates: any): Promise<Response> {
    throw new Error('Not implemented')
  }
}
