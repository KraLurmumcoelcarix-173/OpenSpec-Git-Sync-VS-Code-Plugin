// 备份函数类型：接收改动文件列表，执行备份，返回备份名（如 2026-06-23-01）
export type BackupFn = (changedFiles: string[]) => Promise<string>;

// pull 的结构化结果——只描述结局，不碰 UI
export type PullResult =
  | { status: 'ok'; backupName: string | null }
  | { status: 'no-remote' }
  | { status: 'fetch-failed'; error: string }
  | { status: 'reset-failed'; error: string };

// syncService 依赖的 git 能力（用接口约束，便于测试注入假实现）
interface GitLike {
  hasRemote(): Promise<boolean>;
  currentBranch(): Promise<string>;
  listChangedFiles(relPath: string): Promise<string[]>;
  fetch(branch: string): Promise<void>;
  resetHard(branch: string): Promise<void>;
}

export class SyncService {
  constructor(
    private git: GitLike,
    private backup: BackupFn,
    private syncPath: string
  ) {}

async pull(): Promise<PullResult> {
    // 1. 必须有 origin
    if (!(await this.git.hasRemote())) {
      return { status: 'no-remote' };
    }

    const branch = await this.git.currentBranch();

    // 2. 先 fetch —— 只下载远程引用，不碰工作区。
    //    失败（网络/认证）即止，此时尚未备份，不留垃圾备份。
    try {
      await this.git.fetch(branch);
    } catch (e: any) {
      return { status: 'fetch-failed', error: e?.message ?? String(e) };
    }

    // 3. fetch 成功后才检查改动并备份（备份只需赶在 reset 之前）
    const changed = await this.git.listChangedFiles(this.syncPath);
    let backupName: string | null = null;
    if (changed.length > 0) {
      backupName = await this.backup(changed);
    }

    // 4. reset --hard 对齐远程
    try {
      await this.git.resetHard(branch);
    } catch (e: any) {
      return { status: 'reset-failed', error: e?.message ?? String(e) };
    }

    return { status: 'ok', backupName };
  }
}