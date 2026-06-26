export type BackupFn = (changedFiles: string[]) => Promise<string>;

export type PullResult =
  | { status: 'ok'; backupName: string | null }
  | { status: 'no-remote' }
  | { status: 'fetch-failed'; error: string }
  | { status: 'reset-failed'; error: string };

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
    private syncPath: string,
    private syncBranch: string
  ) {}

  async pull(): Promise<PullResult> {
    // 1. 必须有 origin
    if (!(await this.git.hasRemote())) {
      return { status: 'no-remote' };
    }

    // 2. 先 fetch 同步分支（main）——只下载远程引用，不碰工作区
    try {
      await this.git.fetch(this.syncBranch);
    } catch (e: any) {
      return { status: 'fetch-failed', error: e?.message ?? String(e) };
    }

    // 3. fetch 成功后检查 skills 改动并备份
    const changed = await this.git.listChangedFiles(this.syncPath);
    let backupName: string | null = null;
    if (changed.length > 0) {
      backupName = await this.backup(changed);
    }

    // 4. reset --hard 对齐到 origin/<syncBranch>
    try {
      await this.git.resetHard(this.syncBranch);
    } catch (e: any) {
      return { status: 'reset-failed', error: e?.message ?? String(e) };
    }

    return { status: 'ok', backupName };
  }
}