import * as vscode from 'vscode';
import { strings } from './i18n';

// 一个树节点：支持图标、右侧描述文字、悬停提示、点击命令
class Item extends vscode.TreeItem {
  constructor(opts: {
    label: string;
    icon?: string;
    description?: string;
    tooltip?: string;
    commandId?: string;
  }) {
    super(opts.label, vscode.TreeItemCollapsibleState.None);
    if (opts.icon) this.iconPath = new vscode.ThemeIcon(opts.icon);
    if (opts.description) this.description = opts.description;
    if (opts.tooltip) this.tooltip = opts.tooltip;
    if (opts.commandId) {
      this.command = { command: opts.commandId, title: opts.label };
    }
  }
}

export class SyncProvider implements vscode.TreeDataProvider<Item> {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  private status = { branch: '—', remote: ''};

  refresh(status?: Partial<typeof this.status>) {
    if (status) this.status = { ...this.status, ...status };
    this._onDidChange.fire();
  }

  getTreeItem(el: Item): vscode.TreeItem {
    return el;
  }

getChildren(): Item[] {
    const s = strings();
    const remoteText = this.status.remote || s.statusNotRefreshed;
    // 根据远程状态选不同图标，给用户直观的状态感
    const remoteIcon =
      remoteText === s.statusUpToDate ? 'pass-filled'
      : remoteText === s.statusNoRemote ? 'error'
      : remoteText === s.statusOffline ? 'cloud'
      : remoteText === s.statusHasUpdate ? 'cloud-download'
      : 'sync';
    return [
      // —— 状态区 ——
      new Item({
        label: this.status.branch,
        icon: 'git-branch',
        description: s.panelBranch,
        tooltip: `${s.panelBranch}: ${this.status.branch}`,
      }),
      new Item({
        label: remoteText,
        icon: remoteIcon,
        description: s.panelRemote,
        tooltip: `${s.panelRemote}: ${remoteText}`,
      }),
      // —— 操作区 ——
      new Item({
        label: s.btnPull,
        icon: 'cloud-download',
        commandId: 'opensync.pull',
        tooltip: s.btnPullTip,
      }),
      new Item({
        label: s.btnRefresh,
        icon: 'sync',
        commandId: 'opensync.refresh',
        tooltip: s.btnRefreshTip,
      }),
      new Item({
        label: s.btnSetup,
        icon: 'key',
        commandId: 'opensync.setupGit',
        tooltip: s.btnSetupTip,
      }),
    ];
  }
}