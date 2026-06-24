import * as vscode from 'vscode';    
   import { SyncProvider } from './syncProvider';    
   import { GitHandler } from './gitHandler';    
   import { realGitRunner } from './gitRunner';    
   import { realFileOps } from './fileOps';    
   import { SyncService } from './syncService';    
   import { makeBackupFn } from './backupFn';    
   import { resolveRepoRoot } from './workspace';    

   const SYNC_PATH = '.lingma/skills';    

   export function activate(context: vscode.ExtensionContext) {    
     const provider = new SyncProvider();    
     vscode.window.registerTreeDataProvider('opensync.panel', provider);    

     // 构造 syncService（接电：真 git runner + 真 fs）    
     function buildService(): SyncService | undefined {    
       const root = resolveRepoRoot();    
       if (!root) {    
         vscode.window.showErrorMessage('未找到工作区，请先打开包含 .lingma 的文件夹');    
         return undefined;    
       }    
       const git = new GitHandler(root, realGitRunner);    
       const backupFn = makeBackupFn(root, realFileOps);    
       return new SyncService(git, backupFn, SYNC_PATH);    
     }    

     context.subscriptions.push(    
       vscode.commands.registerCommand('opensync.pull', async () => {
      // 拦截：有未保存的脏文档时，不允许 Pull
      // （reset --hard 看不到内存里未落盘的改动，会造成状态混乱/触发 compare）
      const dirtyDocs = vscode.workspace.textDocuments.filter(
        doc => doc.isDirty && !doc.isUntitled
      );
      if (dirtyDocs.length > 0) {
        const names = dirtyDocs
          .map(d => d.fileName.split(/[\\/]/).pop())
          .join('、');
        const choice = await vscode.window.showWarningMessage(
          `有未保存的文件：${names}。请先保存后再拉取。`,
          '全部保存并继续',
          '取消'
        );
        if (choice === '全部保存并继续') {
          await vscode.workspace.saveAll(false);
        } else {
          return; // 用户取消，终止 Pull
        }
      }

      const svc = buildService();
      if (!svc) return;
      const result = await svc.pull();
      switch (result.status) {
        case 'ok':
          vscode.window.showInformationMessage(
            result.backupName
              ? `✓ 已拉取最新 skills（本地原文件已备份至 .backup/${result.backupName}）`
              : '✓ 已拉取最新 skills'
          );
          break;
        case 'no-remote':
          vscode.window.showWarningMessage('未检测到远程仓库 origin，请联系开发配置');
          break;
        case 'fetch-failed':
          vscode.window.showErrorMessage(`拉取失败（网络或认证）：${result.error}`);
          break;
        case 'reset-failed':
          vscode.window.showErrorMessage(`对齐远程失败：${result.error}`);
          break;
      }
      await doRefresh(provider);
    }),    

       vscode.commands.registerCommand('opensync.refresh', async () => {
      const summary = await doRefresh(provider);
      if (summary) {
        vscode.window.showInformationMessage(`状态已刷新：${summary}`);
      }
    }) 
       ,
    vscode.commands.registerCommand('opensync.setupGit', async () => {
      const root = resolveRepoRoot();
      if (!root) {
        vscode.window.showErrorMessage('未找到工作区，请先打开包含 .lingma 的文件夹');
        return;
      }
      const git = new GitHandler(root, realGitRunner);

      // 先检测现状
      const curName = await git.getConfig('user.name');
      const curEmail = await git.getConfig('user.email');

      if (curName && curEmail) {
        // 已配置：显示现状，问是否重新配置
        const choice = await vscode.window.showInformationMessage(
          `✓ 已配置 Git 身份：${curName} <${curEmail}>`,
          '重新配置',
          '关闭'
        );
        if (choice !== '重新配置') return;
      }

      const name = await vscode.window.showInputBox({
        prompt: '请输入 Git 用户名',
        placeHolder: '如：张三',
        value: curName ?? '',
        ignoreFocusOut: true,
      });
      if (name === undefined) return;

      const email = await vscode.window.showInputBox({
        prompt: '请输入 Git 邮箱',
        placeHolder: '如：zhangsan@company.com',
        value: curEmail ?? '',
        ignoreFocusOut: true,
      });
      if (email === undefined) return;

      try {
        if (name) await git.setConfig('user.name', name);
        if (email) await git.setConfig('user.email', email);
        await git.enableCredentialStore();
        vscode.window.showInformationMessage(
          '✓ Git 身份与凭证已配置。首次拉取输入凭证后将自动保存（明文存储于本机）。'
        );
      } catch (e: any) {
        vscode.window.showErrorMessage(`配置失败：${e?.message ?? e}`);
      }
    })

     );    
     doRefresh(provider);
   }    

// 刷新状态面板，返回一句状态摘要（供命令决定是否弹提示）
async function doRefresh(provider: SyncProvider): Promise<string | undefined> {
  const root = resolveRepoRoot();
  if (!root) return undefined;
  const git = new GitHandler(root, realGitRunner);
  try {
    const branch = await git.currentBranch();
    const hasRemote = await git.hasRemote();
    const changed = await git.listChangedFiles(SYNC_PATH);
    let remoteStatus = '无远程';
    let summary = '';
    if (hasRemote) {
      const { behind, ahead } = await git.getAheadBehind(branch);
      if (behind === 0 && ahead === 0) {
        remoteStatus = 'up to date ✓';
        summary = '已是最新 ✓';
      } else {
        remoteStatus = `落后 ${behind} / 领先 ${ahead}`;
        summary = behind > 0 ? `远程有 ${behind} 个更新，可点击 Pull 拉取` : `本地领先 ${ahead}`;
      }
    } else {
      summary = '未检测到远程仓库 origin';
    }
    provider.refresh({
      branch,
      remote: remoteStatus,
      changes: changed.length === 0 ? '无' : `${changed.length} 个文件`,
    });
    return summary;
  } catch (e: any) {
    vscode.window.showErrorMessage(`刷新失败：${e?.message ?? e}`);
    return undefined;
  }
}    

   export function deactivate() {}