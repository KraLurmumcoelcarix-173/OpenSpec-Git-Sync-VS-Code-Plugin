import * as vscode from 'vscode';
import { readdir } from 'fs/promises';
import * as path from 'path';
import * as fs from 'fs';

// 从打开的工作区里找到含 .lingma 目录的仓库根；找不到则退回第一个工作区
export function resolveRepoRoot(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return undefined;
  for (const f of folders) {
    if (fs.existsSync(path.join(f.uri.fsPath, '.lingma'))) {
      return f.uri.fsPath;
    }
  }
  return folders[0].uri.fsPath;
}

// 读取 .lingma/.backup/ 下已有的备份目录名（不存在则返回空数组）
export async function listExistingBackups(repoRoot: string): Promise<string[]> {
  const backupDir = path.join(repoRoot, '.lingma', '.backup');
  try {
    return await readdir(backupDir);
  } catch {
    return []; // 目录还不存在，说明没备份过
  }
}