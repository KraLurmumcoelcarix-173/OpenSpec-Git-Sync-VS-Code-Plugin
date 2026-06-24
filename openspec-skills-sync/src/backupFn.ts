import { formatDate, nextBackupName, backupFiles, FileOps } from './backup';
import { listExistingBackups } from './workspace';

// 纯函数：今天日期 + 已有备份 → 下一个备份名（单独抽出便于测试）
export function buildBackupName(today: Date, existing: string[]): string {
  return nextBackupName(formatDate(today), existing);
}

// 组装出 syncService 需要的 BackupFn：
// 给定改动文件列表 → 算备份名 → 复制文件 → 返回备份名
export function makeBackupFn(repoRoot: string, ops: FileOps) {
  return async (changedFiles: string[]): Promise<string> => {
    const existing = await listExistingBackups(repoRoot);
    const name = buildBackupName(new Date(), existing);
    await backupFiles(repoRoot, changedFiles, name, ops);
    return name;
  };
}