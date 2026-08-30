#!/usr/bin/env node

/**
 * 自动更新版本信息脚本
 * 从 package.json 读取版本信息并更新到 src/version.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = join(__dirname, '..');
const packageJsonPath = join(projectRoot, 'package.json');
const versionFilePath = join(projectRoot, 'src', 'version.ts');

try {
  // 读取 package.json
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const version = packageJson.version;
  const name = packageJson.name;

  console.log(`[UPDATE_VERSION] Updating version to ${version} for package ${name}`);

  // 生成新的 version.ts 内容
  const versionFileContent = `/**
 * Version information for the Todo for AI MCP package
 * This file is automatically updated during build process
 */

export const VERSION = '${version}';
export const PACKAGE_NAME = '${name}';

// Build-time information
export const BUILD_TIME = '${new Date().toISOString()}';
export const BUILD_VERSION = VERSION;
`;

  // 写入 version.ts
  writeFileSync(versionFilePath, versionFileContent, 'utf-8');
  
  console.log(`[UPDATE_VERSION] Successfully updated ${versionFilePath}`);
  console.log(`[UPDATE_VERSION] Version: ${version}`);
  console.log(`[UPDATE_VERSION] Package: ${name}`);
  console.log(`[UPDATE_VERSION] Build time: ${new Date().toISOString()}`);

} catch (error) {
  console.error('[UPDATE_VERSION] Failed to update version:', error);
  process.exit(1);
}
