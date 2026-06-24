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
         await doRefresh(provider);    
       })    
     );    
     doRefresh(provider);
   }    

   // 刷新状态面板    
   async function doRefresh(provider: SyncProvider) {    
     const root = resolveRepoRoot();    
     if (!root) return;    
     const git = new GitHandler(root, realGitRunner);    
     try {    
       const branch = await git.currentBranch();    
       const hasRemote = await git.hasRemote();    
       const changed = await git.listChangedFiles(SYNC_PATH);    
       let remoteStatus = '无远程';    
       if (hasRemote) {    
         const { behind, ahead } = await git.getAheadBehind(branch);    
         remoteStatus = behind === 0 && ahead === 0 ? 'up to date ✓' : `落后 ${behind} / 领先 ${ahead}`;    
       }    
       provider.refresh({    
         branch,    
         remote: remoteStatus,    
         changes: changed.length === 0 ? '无' : `${changed.length} 个文件`,    
       });    
     } catch (e: any) {    
       vscode.window.showErrorMessage(`刷新失败：${e?.message ?? e}`);    
     }    
   }    

   export function deactivate() {}