import type { Request, Response } from '../../../types.ts'
import { TaskService } from '../services/TaskService.js'

export class TaskCreateHandler {
  private taskService: TaskService

  constructor() {
    this.taskService = new TaskService()
  }

  async handle(request: Request): Promise<Response> {
    // TODO: 实现任务创建逻辑
    return this.taskService.createTask(request)
  }

  getToolDefinition() {
    return {
      name: 'create_task',
      description: 'Create a new task',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          priority: { type: 'string' }
        },
        required: ['title']
      }
    }
  }
}
