import * as vscode from 'vscode';

// 树里的一个节点：可以是状态文字，也可以是可点击的按钮
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

  // 当前状态文字，刷新时更新
  private status = { branch: '—', remote: '未刷新', changes: '—' };

  refresh(status?: Partial<typeof this.status>) {
    if (status) this.status = { ...this.status, ...status };
    this._onDidChange.fire();
  }

  getTreeItem(el: Item): vscode.TreeItem {
    return el;
  }

  getChildren(): Item[] {
    return [
      new Item(`分支：${this.status.branch}`),
      new Item(`远程：${this.status.remote}`),
      new Item(`本地改动：${this.status.changes}`),
      new Item('🔽 Pull (拉取最新 skills)', 'opensync.pull', 'cloud-download'),
      new Item('🔄 Refresh (刷新状态)', 'opensync.refresh', 'refresh'),
    ];
  }
}