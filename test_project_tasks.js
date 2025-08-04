#!/usr/bin/env node

/**
 * 测试获取ToDo For AI项目的任务
 */

import { TodoApiClient } from './lib/api-client.js';

async function testProjectTasks() {
  console.log('🧪 测试获取ToDo For AI项目的任务...\n');

  const config = {
    apiBaseUrl: 'http://127.0.0.1:50110/todo-for-ai/api/v1',
    apiToken: 'Z98_DhuIBk54OK_ErOcxfJTI0VaT8Q9HDqwXx4fW4DU',
    apiTimeout: 10000,
    logLevel: 'info'
  };

  const client = new TodoApiClient(config);

  try {
    // 测试1: 获取ToDo For AI项目信息
    console.log('📋 测试1: 获取ToDo For AI项目信息');
    try {
      const projectInfo = await client.getProjectInfo({ project_name: 'ToDo For AI' });
      console.log(`✅ 项目信息获取成功:`);
      console.log(`   项目名称: ${projectInfo.name}`);
      console.log(`   项目ID: ${projectInfo.id}`);
      console.log(`   总任务数: ${projectInfo.total_tasks}`);
      console.log(`   完成率: ${projectInfo.completion_rate}%`);
      console.log('');
    } catch (error) {
      console.log(`❌ 项目信息获取失败: ${error.message}\n`);
    }

    // 测试2: 获取项目任务列表
    console.log('📝 测试2: 获取ToDo For AI项目的任务列表');
    try {
      const tasks = await client.getProjectTasksByName({
        project_name: 'ToDo For AI',
        status_filter: ['todo', 'in_progress', 'review']
      });
      console.log(`✅ 任务列表获取成功，共 ${tasks.total_tasks || 0} 个任务`);
      if (tasks.tasks && tasks.tasks.length > 0) {
        console.log('任务详情:');
        tasks.tasks.slice(0, 5).forEach((task, index) => {
          console.log(`  ${index + 1}. [${task.status}] ${task.title} (ID: ${task.id})`);
        });
        if (tasks.tasks.length > 5) {
          console.log(`  ... 还有 ${tasks.tasks.length - 5} 个任务`);
        }
      }
      console.log('');
    } catch (error) {
      console.log(`❌ 任务列表获取失败: ${error.message}\n`);
    }

    console.log('🎉 项目任务测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error('错误详情:', error);
  }
}

// 运行测试
testProjectTasks().catch(console.error);
