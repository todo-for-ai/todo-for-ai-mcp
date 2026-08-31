import type { Request, Response } from './types.js'
import { TaskApiService } from './services/TaskApiService'
import { ProjectApiService } from './services/ProjectApiService'
import { UserApiService } from './services/UserApiService'

export class TodoApiClient {
  private taskApi: TaskApiService
  private projectApi: ProjectApiService
  private userApi: UserApiService

  constructor() {
    this.taskApi = new TaskApiService()
    this.projectApi = new ProjectApiService()
    this.userApi = new UserApiService()
  }

  // 任务相关方法
  createTask(data: any) {
    return this.taskApi.createTask(data)
  }

  updateTask(taskId: number, data: any) {
    return this.taskApi.updateTask(taskId, data)
  }

  getTask(taskId: number) {
    return this.taskApi.getTask(taskId)
  }

  deleteTask(taskId: number) {
    return this.taskApi.deleteTask(taskId)
  }

  listTasks(projectId: number) {
    return this.taskApi.listTasks(projectId)
  }

  // 项目相关方法
  createProject(data: any) {
    return this.projectApi.createProject(data)
  }

  getProject(projectId: number) {
    return this.projectApi.getProject(projectId)
  }

  listProjects() {
    return this.projectApi.listProjects()
  }

  // 用户相关方法
  getCurrentUser() {
    return this.userApi.getCurrentUser()
  }

  listUsers() {
    return this.userApi.listUsers()
  }

  // API Token相关方法
  createApiToken(data: any) {
    return this.userApi.createApiToken(data)
  }

  listApiTokens() {
    return this.userApi.listApiTokens()
  }

  deleteApiToken(tokenId: number) {
    return this.userApi.deleteApiToken(tokenId)
  }
}

export const todoApiClient = new TodoApiClient()
