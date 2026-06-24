import * as vscode from 'vscode';

type Lang = 'zh-CN' | 'en';

const STRINGS = {
  'zh-CN': {
    // 面板状态行
    panelBranch: '分支',
    panelRemote: '远程',
    panelChanges: '本地改动',
    statusNotRefreshed: '未刷新',
    statusNoRemote: '无远程',
    statusUpToDate: 'up to date ✓',
    changesNone: '无',
    changesFiles: (n: number) => `${n} 个文件`,
    remoteAheadBehind: (behind: number, ahead: number) => `落后 ${behind} / 领先 ${ahead}`,
    // 按钮
    btnPull: 'Pull 拉取最新 skills',
    btnRefresh: 'Refresh 刷新状态',
    btnSetup: '配置 Git 身份与凭证',
    btnPullTip: '从远程拉取最新的 skills（本地改动会先自动备份）',
    btnRefreshTip: '刷新分支与远程同步状态',
    btnSetupTip: '一键配置 Git 用户名、邮箱与凭证存储',
    // Pull 结果
    pullOkNoBackup: '✓ 已拉取最新 skills',
    pullOkWithBackup: (name: string) => `✓ 已拉取最新 skills（本地原文件已备份至 .backup/${name}）`,
    pullNoRemote: '未检测到远程仓库 origin，请联系开发配置',
    pullFetchFailed: (err: string) => `拉取失败（网络或认证）：${err}`,
    pullResetFailed: (err: string) => `对齐远程失败：${err}`,
    // 未保存拦截
    dirtyWarn: (names: string) => `有未保存的文件：${names}。请先保存后再拉取。`,
    dirtySaveAndContinue: '全部保存并继续',
    cancel: '取消',
    // Refresh 反馈
    refreshDone: (summary: string) => `状态已刷新：${summary}`,
    summaryUpToDate: '已是最新 ✓',
    summaryBehind: (n: number) => `远程有 ${n} 个更新，可点击 Pull 拉取`,
    summaryAhead: (n: number) => `本地领先 ${n}`,
    summaryNoRemote: '未检测到远程仓库 origin',
    // 配置 Git
    noWorkspace: '未找到工作区，请先打开包含 .lingma 的文件夹',
    setupAlreadyDone: (name: string, email: string) => `✓ 已配置 Git 身份：${name} <${email}>`,
    setupReconfigure: '重新配置',
    close: '关闭',
    setupAskName: '请输入 Git 用户名',
    setupNamePlaceholder: '如：张三',
    setupAskEmail: '请输入 Git 邮箱',
    setupEmailPlaceholder: '如：zhangsan@company.com',
    setupDone: '✓ Git 身份与凭证已配置。首次拉取输入凭证后将自动保存（明文存储于本机）。',
    setupFailed: (err: string) => `配置失败：${err}`,
    refreshFailed: (err: string) => `刷新失败：${err}`,
  },
  'en': {
    panelBranch: 'Branch',
    panelRemote: 'Remote',
    panelChanges: 'Local changes',
    statusNotRefreshed: 'Not refreshed',
    statusNoRemote: 'No remote',
    statusUpToDate: 'up to date ✓',
    changesNone: 'None',
    changesFiles: (n: number) => `${n} file(s)`,
    remoteAheadBehind: (behind: number, ahead: number) => `behind ${behind} / ahead ${ahead}`,
    btnPull: 'Pull latest skills',
    btnRefresh: 'Refresh status',
    btnSetup: 'Configure Git identity',
    btnPullTip: 'Pull latest skills from remote (local changes are backed up first)',
    btnRefreshTip: 'Refresh branch and remote sync status',
    btnSetupTip: 'Configure Git user name, email and credential storage',
    pullOkNoBackup: '✓ Pulled latest skills',
    pullOkWithBackup: (name: string) => `✓ Pulled latest skills (local files backed up to .backup/${name})`,
    pullNoRemote: 'No remote "origin" found. Please contact a developer to configure it.',
    pullFetchFailed: (err: string) => `Pull failed (network or auth): ${err}`,
    pullResetFailed: (err: string) => `Failed to align with remote: ${err}`,
    dirtyWarn: (names: string) => `Unsaved files: ${names}. Please save before pulling.`,
    dirtySaveAndContinue: 'Save all & continue',
    cancel: 'Cancel',
    refreshDone: (summary: string) => `Status refreshed: ${summary}`,
    summaryUpToDate: 'Up to date ✓',
    summaryBehind: (n: number) => `${n} update(s) on remote, click Pull to fetch`,
    summaryAhead: (n: number) => `${n} ahead locally`,
    summaryNoRemote: 'No remote "origin" found',
    noWorkspace: 'No workspace found. Please open a folder containing .lingma',
    setupAlreadyDone: (name: string, email: string) => `✓ Git identity configured: ${name} <${email}>`,
    setupReconfigure: 'Reconfigure',
    close: 'Close',
    setupAskName: 'Enter Git user name',
    setupNamePlaceholder: 'e.g. John Doe',
    setupAskEmail: 'Enter Git email',
    setupEmailPlaceholder: 'e.g. john@company.com',
    setupDone: '✓ Git identity & credential configured. Your credential will be saved (in plaintext on this machine) after the first pull.',
    setupFailed: (err: string) => `Configuration failed: ${err}`,
    refreshFailed: (err: string) => `Refresh failed: ${err}`,
  },
} as const;

function currentLang(): Lang {
  return vscode.workspace.getConfiguration('opensync').get<Lang>('language', 'zh-CN');
}

// 取一份当前语言的字符串表
export function strings() {
  return STRINGS[currentLang()];
}