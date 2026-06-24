import * as vscode from 'vscode';
import { strings } from './i18n';

class Item extends vscode.TreeItem {
  constructor(label: string, commandId?: string, icon?: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    if (commandId) {
      this.command = { command: commandId, title: label };
    }
    if (icon) {
      this.iconPath = new vscode.ThemeIcon(icon);
    }
  }
}

export class SyncProvider implements vscode.TreeDataProvider<Item> {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  // 状态用原始值存储，渲染时再套语言（这样切语言刷新就能变）
  private status = { branch: '—', remote: '', changes: '—' };

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
    return [
      new Item(`${s.panelBranch}：${this.status.branch}`),
      new Item(`${s.panelRemote}：${remoteText}`),
      new Item(`${s.panelChanges}：${this.status.changes}`),
      new Item(s.btnPull, 'opensync.pull', 'cloud-download'),
      new Item(s.btnRefresh, 'opensync.refresh', 'refresh'),
      new Item(s.btnSetup, 'opensync.setupGit', 'key'),
    ];
  }
}