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

export function activate(context: vscode.ExtensionContext) {
  const provider = new SyncProvider();
  vscode.window.registerTreeDataProvider('opensync.panel', provider);

  function buildService(): SyncService | undefined {
    const s = strings();
    const root = resolveRepoRoot();
    if (!root) {
      vscode.window.showErrorMessage(s.noWorkspace);
      return undefined;
    }
    const git = new GitHandler(root, realGitRunner);
    const backupFn = makeBackupFn(root, realFileOps);
    return new SyncService(git, backupFn, SYNC_PATH);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('opensync.pull', async () => {
      const s = strings();
      // 拦截：有未保存的脏文档时，不允许 Pull
      const dirtyDocs = vscode.workspace.textDocuments.filter(
        doc => doc.isDirty && !doc.isUntitled
      );
      if (dirtyDocs.length > 0) {
        const names = dirtyDocs.map(d => d.fileName.split(/[\\/]/).pop()).join('、');
        const choice = await vscode.window.showWarningMessage(
          s.dirtyWarn(names),
          s.dirtySaveAndContinue,
          s.cancel
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
    }),

    vscode.commands.registerCommand('opensync.refresh', async () => {
      const s = strings();
      const summary = await doRefresh(provider);
      if (summary) {
        vscode.window.showInformationMessage(s.refreshDone(summary));
      }
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
  try {
    const branch = await git.currentBranch();
    const hasRemote = await git.hasRemote();
    const changed = await git.listChangedFiles(SYNC_PATH);
    let remoteStatus: string = s.statusNoRemote;
    let summary: string = '';
    if (hasRemote) {
      const { behind, ahead } = await git.getAheadBehind(branch);
      if (behind === 0 && ahead === 0) {
        remoteStatus = s.statusUpToDate;
        summary = s.summaryUpToDate;
      } else {
        remoteStatus = s.remoteAheadBehind(behind, ahead);
        summary = behind > 0 ? s.summaryBehind(behind) : s.summaryAhead(ahead);
      }
    } else {
      summary = s.summaryNoRemote;
    }
    provider.refresh({
      branch,
      remote: remoteStatus,
      changes: changed.length === 0 ? s.changesNone : s.changesFiles(changed.length),
    });
    return summary;
  } catch (e: any) {
    vscode.window.showErrorMessage(s.refreshFailed(e?.message ?? String(e)));
    return undefined;
  }
}

export function deactivate() {}