// 把 Date 格式化成 yyyy-MM-dd（本地时区）
export function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// 给定今天的日期字符串和已存在的备份名列表，算出下一个可用名字
// existing 形如 ['2026-06-23-01', '2026-06-22-05', ...]
export function nextBackupName(dateStr: string, existing: string[]): string {
  // 只看当天的备份，取出它们的序号
  const prefix = `${dateStr}-`;
  const seqs = existing
    .filter(name => name.startsWith(prefix))
    .map(name => Number(name.slice(prefix.length)))
    .filter(n => !Number.isNaN(n));

  const next = seqs.length === 0 ? 1 : Math.max(...seqs) + 1;
  return `${dateStr}-${String(next).padStart(2, '0')}`;
}

import * as path from 'path';

// 文件操作接口：把真正碰磁盘的动作抽出来，方便测试注入假实现
export interface FileOps {
  mkdir(dir: string): Promise<void>;
  copyFile(src: string, dest: string): Promise<void>;
}

// 备份目录的固定位置：<repo>/.lingma/.backup/<name>/
const BACKUP_BASE = '.lingma/.backup';

export async function backupFiles(
  repoRoot: string,
  relPaths: string[],
  backupName: string,
  ops: FileOps
): Promise<void> {
  for (const rel of relPaths) {
    const src = path.posix.join(repoRoot, rel);
    const dest = path.posix.join(repoRoot, BACKUP_BASE, backupName, rel);
    // 先建目标文件所在目录，再复制
    await ops.mkdir(path.posix.dirname(dest));
    await ops.copyFile(src, dest);
  }
}