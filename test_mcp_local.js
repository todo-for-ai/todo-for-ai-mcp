#!/usr/bin/env node

/**
 * 测试MCP工具与本地API server的通信
 */

import { TodoApiClient } from './lib/api-client.js';

async function testMcpCommunication() {
  console.log('🧪 开始测试MCP工具与本地API server的通信...\n');

  const config = {
    apiBaseUrl: 'http://127.0.0.1:50110/todo-for-ai/api/v1',
    apiToken: 'Z98_DhuIBk54OK_ErOcxfJTI0VaT8Q9HDqwXx4fW4DU',
    apiTimeout: 10000,
    logLevel: 'info'
  };

  const client = new TodoApiClient(config);

  try {
    // 测试1: 连接测试
    console.log('📡 测试1: API连接测试');
    const connectionTest = await client.testConnection();
    console.log(`✅ 连接测试结果: ${connectionTest ? '成功' : '失败'}\n`);

    // 测试2: 获取用户项目列表
    console.log('📋 测试2: 获取用户项目列表');
    try {
      const projects = await client.listUserProjects({
        status_filter: 'active',
        include_stats: true
      });
      console.log(`✅ 项目列表获取成功，共 ${projects.total || 0} 个项目`);
      if (projects.projects && projects.projects.length > 0) {
        console.log('项目详情:');
        projects.projects.forEach((project, index) => {
          console.log(`  ${index + 1}. ${project.name} (ID: ${project.id})`);
        });
      }
      console.log('');
    } catch (error) {
      console.log(`❌ 项目列表获取失败: ${error.message}\n`);
    }

    // 测试3: 获取任务详情 (使用任务ID 463)
    console.log('📝 测试3: 获取任务详情 (ID: 463)');
    try {
      const task = await client.getTaskById({ task_id: 463 });
      console.log(`✅ 任务获取成功: ${task.title}`);
      console.log(`   状态: ${task.status}`);
      console.log(`   项目: ${task.project_name}`);
      console.log('');
    } catch (error) {
      console.log(`❌ 任务获取失败: ${error.message}\n`);
    }

    console.log('🎉 MCP工具测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error('错误详情:', error);
  }
}

// 运行测试
testMcpCommunication().catch(console.error);
