import type { Request, Response } from '../../../types.ts'
import { TaskService } from '../services/TaskService.js'

export class TaskUpdateHandler {
  private taskService: TaskService

  constructor() {
    this.taskService = new TaskService()
  }

  async handle(request: Request): Promise<Response> {
    // TODO: 实现任务更新逻辑
    return this.taskService.updateTask(request)
  }

  getToolDefinition() {
    return {
      name: 'update_task',
      description: 'Update an existing task',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'number' },
          updates: { type: 'object' }
        },
        required: ['taskId']
      }
    }
  }
}
