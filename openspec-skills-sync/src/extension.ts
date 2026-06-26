import * as vscode from 'vscode';
import { SyncProvider } from './syncProvider';
import { GitHandler } from './gitHandler';
import { realGitRunner } from './gitRunner';
import { realFileOps } from './fileOps';
import { SyncService } from './syncService';
import { makeBackupFn } from './backupFn';
import { resolveRepoRoot } from './workspace';
import { strings } from './i18n';

const SYNC_PATH = '.lingma/skills';

function syncBranch(): string {
  return vscode.workspace.getConfiguration('opensync').get<string>('syncBranch', 'main');
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new SyncProvider();
  const treeView = vscode.window.createTreeView('opensync.panel', {
    treeDataProvider: provider,
  });

  // 面板每次从隐藏变为可见时自动刷新状态
  treeView.onDidChangeVisibility((e) => {
    if (e.visible && !busy) {
      doRefresh(provider);
    }
  });

  // 执行锁：命令进行中时忽略重复点击
  let busy = false;
  async function runExclusive(title: string, task: () => Promise<void>) {
    if (busy) {
      vscode.window.showInformationMessage(strings().alreadyRunning);
      return;
    }
    busy = true;
    try {
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title, cancellable: false },
        async () => { await task(); }
      );
    } finally {
      busy = false;
    }
  }

  function buildService(): SyncService | undefined {
    const s = strings();
    const root = resolveRepoRoot();
    if (!root) {
      vscode.window.showErrorMessage(s.noWorkspace);
      return undefined;
    }
    const git = new GitHandler(root, realGitRunner);
    const backupFn = makeBackupFn(root, realFileOps);
    return new SyncService(git, backupFn, SYNC_PATH, syncBranch());
  }

  context.subscriptions.push(
    treeView,
    vscode.commands.registerCommand('opensync.pull', async () => {
      await runExclusive(strings().progressPulling, async () => {
        const s = strings();

        // 保护：非 main 分支拦截
        const root0 = resolveRepoRoot();
        if (root0) {
          const git0 = new GitHandler(root0, realGitRunner);
          try {
            const current = await git0.currentBranch();
            if (current !== syncBranch()) {
              vscode.window.showWarningMessage(s.notOnSyncBranch(current, syncBranch()));
              return;
            }
          } catch { /* 拿不到分支名就不拦 */ }
        }

        // 未保存拦截
        const dirtyDocs = vscode.workspace.textDocuments.filter(
          doc => doc.isDirty && !doc.isUntitled
        );
        if (dirtyDocs.length > 0) {
          const names = dirtyDocs.map(d => d.fileName.split(/[\\/]/).pop()).join('、');
          const choice = await vscode.window.showWarningMessage(
            s.dirtyWarn(names), s.dirtySaveAndContinue, s.cancel
          );
          if (choice === s.dirtySaveAndContinue) {
            await vscode.workspace.saveAll(false);
          } else {
            return;
          }
        }

        const svc = buildService();
        if (!svc) return;
        const result = await svc.pull();
        switch (result.status) {
          case 'ok':
            vscode.window.showInformationMessage(
              result.backupName ? s.pullOkWithBackup(result.backupName) : s.pullOkNoBackup
            );
            break;
          case 'no-remote':
            vscode.window.showWarningMessage(s.pullNoRemote);
            break;
          case 'fetch-failed':
            vscode.window.showErrorMessage(s.pullFetchFailed(result.error));
            break;
          case 'reset-failed':
            vscode.window.showErrorMessage(s.pullResetFailed(result.error));
            break;
        }
        await doRefresh(provider);
      });
    }),

    vscode.commands.registerCommand('opensync.refresh', async () => {
      await runExclusive(strings().progressRefreshing, async () => {
        const summary = await doRefresh(provider);
        if (summary) {
          vscode.window.showInformationMessage(strings().refreshDone(summary));
        }
      });
    }),

    vscode.commands.registerCommand('opensync.setupGit', async () => {
      const s = strings();
      const root = resolveRepoRoot();
      if (!root) {
        vscode.window.showErrorMessage(s.noWorkspace);
        return;
      }
      const git = new GitHandler(root, realGitRunner);

      const curName = await git.getConfig('user.name');
      const curEmail = await git.getConfig('user.email');

      if (curName && curEmail) {
        const choice = await vscode.window.showInformationMessage(
          s.setupAlreadyDone(curName, curEmail),
          s.setupReconfigure,
          s.close
        );
        if (choice !== s.setupReconfigure) return;
      }

      const name = await vscode.window.showInputBox({
        prompt: s.setupAskName,
        placeHolder: s.setupNamePlaceholder,
        value: curName ?? '',
        ignoreFocusOut: true,
      });
      if (name === undefined) return;

      const email = await vscode.window.showInputBox({
        prompt: s.setupAskEmail,
        placeHolder: s.setupEmailPlaceholder,
        value: curEmail ?? '',
        ignoreFocusOut: true,
      });
      if (email === undefined) return;

      try {
        if (name) await git.setConfig('user.name', name);
        if (email) await git.setConfig('user.email', email);
        await git.enableCredentialStore();
        vscode.window.showInformationMessage(s.setupDone);
      } catch (e: any) {
        vscode.window.showErrorMessage(s.setupFailed(e?.message ?? String(e)));
      }
    })
  );

  // 启动时自动刷新一次
  doRefresh(provider);
}

// 刷新状态面板，返回一句状态摘要
async function doRefresh(provider: SyncProvider): Promise<string | undefined> {
  const s = strings();
  const root = resolveRepoRoot();
  if (!root) return undefined;
  const git = new GitHandler(root, realGitRunner);
  const branch = syncBranch();
  try {
    const current = await git.currentBranch();
    const hasRemote = await git.hasRemote();
    let remoteStatus: string = s.statusNoRemote;
    let summary: string = '';
    if (hasRemote) {
      // 尝试 fetch 同步分支；失败（网络/认证）时标注状态可能过时
      let fetchFailed = false;
      try {
        await git.fetch(branch);
      } catch {
        fetchFailed = true;
      }
      const hasDiff = await git.diffsFromRef(`origin/${branch}`, SYNC_PATH);
      if (!hasDiff) {
        remoteStatus = s.statusUpToDate;
        summary = s.summaryUpToDate;
      } else {
        remoteStatus = s.statusHasUpdate;
        summary = s.summaryHasUpdate;
      }
      if (fetchFailed) {
        remoteStatus = s.statusOffline;
        summary = s.summaryOffline;
      }
    } else {
      summary = s.summaryNoRemote;
    }
    provider.refresh({ branch: current, remote: remoteStatus });
    return summary;
  } catch (e: any) {
    vscode.window.showErrorMessage(s.refreshFailed(e?.message ?? String(e)));
    return undefined;
  }
}

export function deactivate() {}