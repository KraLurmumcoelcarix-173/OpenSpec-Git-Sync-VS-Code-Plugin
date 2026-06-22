```markdown
# OpenSpec Git Sync VS Code 插件 - 完整提案

## 一、项目背景

### 1.1 痛点

在 OpenSpec 研发工作流中，非开发人员（产品经理、测试、技术负责人等）需要参与规范契约评审环节，但由于不熟悉 Git 命令，无法方便地完成：

- 拉取最新的 OpenSpec 规范文档进行评审
- 评审后提交修改的规范变更
- 推送至远程仓库供他人查看

### 1.2 目标

通过 VS Code 插件提供图形化按钮，将复杂的 Git 操作简化为一键点击，让所有角色都能无缝参与 SDD 流程。**核心设计原则：为完全不懂 Git 的非开发者优化默认路径，主界面只暴露「一键 Sync」，单步操作折叠为高级选项。**

## 二、核心工作流程

### 场景 A：一键 Sync（主路径，推荐所有非开发者使用）


用户点击「Sync」按钮
        ↓
git add openspec/                 # 仅暂存 spec 变更，不污染工作区
        ↓
git commit -m "<消息或模板>"       # 有变更才提交
        ↓
git pull --rebase origin <branch>  # 先同步远程，保持线性历史
        ↓
   ┌─────────────┐
   │ 是否有冲突？ │
   └─────┬───────┘
      是 │ 否
   ┌─────┘ └─────┐
   ↓             ↓
弹窗引导      git push origin <branch>
+逃生口            ↓
            「✓ 已发布到远程」


### 场景 B：单步操作（高级折叠区，面向开发者）

- **Pull**：`git pull origin <branch>`，更新 `openspec/changes/*`，刷新状态面板
- **Commit**：`git add openspec/` → 弹出消息输入框 → `git commit -m "..."`
- **Push**：`git push origin <branch>`，显示进度与结果

## 三、插件功能设计

### 3.1 Side Panel 布局


┌────────────────────────────────────────┐
│ 🔧 OpenSpec Git Sync                   
├────────────────────────────────────────
│  📊 状态                               
│  ─────────────────                     
│  分支：main                             
│  远程：up to date ✓                    
│  变更文件：3                           
│                                        
│  ┌──────────────────────────────────┐  
│  │ 🚀 Sync (一键发布我的修改)        │  ← 主按钮
│  └──────────────────────────────────┘  
│                                        
│  变更文件列表：                        
│  ✏️ proposal.md (修改)                 
│  ✏️ design.md (修改)                   
│  ✏️ tasks.md (新增)                    
│                                        
│  ▸ 高级操作 (展开)   ← 默认折叠
│    ┌────────────────────────────────┐   
│    │ 🔽 Pull   ✅ Commit   📤 Push 
│    └────────────────────────────────┘  
│                                        
│  ┌──────────────────────────────────┐  
│  │ 🔄 Refresh (刷新状态)              
│  └──────────────────────────────────┘  
└────────────────────────────────────────


### 3.2 按钮详细行为

#### 主按钮：Sync（一键发布）


执行流程：
1. git add openspec/
2. 若有变更 → 弹出消息输入框（带模板默认值）→ git commit
3. git pull --rebase origin <branch>
4. 检测冲突：
   - 无冲突 → git push origin <branch> → 提示「✓ 已发布到远程」
   - 有冲突 → 弹窗：「检测到冲突，需要人工处理」
              提供选项：[手动解决] / [放弃我的修改重新拉取]
5. 刷新状态面板

异常处理：
- 凭证/认证失败 → 「Git 认证失败，请检查 HTTPS Token 或 SSH Key 配置」
- 网络错误 → 「无法连接远程仓库，请检查网络」
- rebase 失败 → 自动 git rebase --abort 回滚到操作前状态，提示用户


#### 单步按钮（高级区）

**Pull**
1. git pull origin <branch>
2. 刷新文件列表
异常：有未提交变更 → 提示先 Commit；冲突 → 提示手动解决

**Commit**
1. git add openspec/
2. 弹出输入框（提交消息模板见下）
3. git commit -m "<用户输入>"

**Push**
1. git push origin <branch>
2. 失败需先 pull → 提示「远程有更新，请先 Sync 或 Pull」

**Refresh**
1. git status --porcelain 解析变更列表
2. git rev-list --count --left-right @{u}...HEAD 计算 ahead/behind
3. 更新状态面板

### 3.3 提交消息模板（可配置）

- `更新 proposal.md：[任务名称]`
- `更新 design.md：[技术方案]`
- `更新 tasks.md：[进度同步]`
- `添加评审意见：[评审人/范围]`

### 3.4 状态面板字段

| 字段 | 说明 | 示例 |
|------|------|------|
| 分支 | 当前 Git 分支 | main / dev_06_需求评审 |
| 远程状态 | 与远程的同步状态 | up to date ✓ / 3 ahead / has conflicts ⚠️ |
| 变更文件 | 有变更的 spec 文件数量 | 3 |
| 变更列表 | 具体变更文件列表 | proposal.md (modified) |

## 四、技术实现方案

### 4.1 技术栈（package.json 节选）

```json
{
  "name": "openspec-git-sync",
  "displayName": "OpenSpec Git Sync",
  "version": "1.0.0",
  "engines": { "vscode": "^1.80.0" },
  "activationEvents": ["onView:opensync.panel"],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      { "command": "opensync.sync",    "title": "Sync (一键发布)" },
      { "command": "opensync.pull",    "title": "Pull Latest Spec" },
      { "command": "opensync.commit",  "title": "Commit Changes" },
      { "command": "opensync.push",    "title": "Push to Remote" },
      { "command": "opensync.refresh", "title": "Refresh Status" }
    ],
    "viewsContainers": {
      "activitybar": [
        { "id": "opensync-sidebar", "title": "OpenSpec Sync", "icon": "media/icon.svg" }
      ]
    },
    "views": {
      "opensync-sidebar": [
        { "type": "tree", "id": "opensync.panel", "name": "Sync Panel" }
      ]
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "webpack",
    "watch": "webpack --watch"
  },
  "devDependencies": {
    "@types/vscode": "^1.80.0",
    "typescript": "^5.0.0",
    "webpack": "^5.0.0"
  }
}
```

> 注：MVP 使用 TreeView（非 Webview），代码与配置的 view id 保持一致，避免类型不匹配。

### 4.2 目录结构

```
openspec-git-sync/
├── src/
│   ├── extension.ts          # 主入口
│   ├── syncProvider.ts       # TreeView 数据提供者
│   └── gitHandler.ts         # Git 操作封装
├── media/
│   └── icon.svg
├── package.json
└── README.md
```

### 4.3 核心代码示例

#### extension.ts

```typescript
import * as vscode from 'vscode';
import { SyncProvider } from './syncProvider';
import { GitHandler } from './gitHandler';

export function activate(context: vscode.ExtensionContext) {
  const git = new GitHandler();
  const provider = new SyncProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('opensync.panel', provider),

    vscode.commands.registerCommand('opensync.sync', async () => {
      await git.sync();
      provider.refresh();
    }),

    vscode.commands.registerCommand('opensync.pull', async () => {
      await git.pull();
      provider.refresh();
    }),

    vscode.commands.registerCommand('opensync.commit', async () => {
      const message = await vscode.window.showInputBox({
        prompt: '请输入提交消息',
        placeHolder: '例如：更新 proposal.md 变更范围'
      });
      if (message) {
        await git.commit(message);
        provider.refresh();
      }
    }),

    vscode.commands.registerCommand('opensync.push', async () => {
      await git.push();
      provider.refresh();
    }),

    vscode.commands.registerCommand('opensync.refresh', () => provider.refresh())
  );
}
```

#### gitHandler.ts

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';

const execAsync = promisify(exec);

export class GitHandler {
  private async execGit(args: string[]): Promise<string> {
    const cwd = this.resolveRepoRoot();
    if (!cwd) throw new Error('未找到包含 openspec/ 的工作区');
    try {
      const { stdout } = await execAsync(`git ${args.join(' ')}`, { cwd });
      return stdout.trim();
    } catch (error: any) {
      throw new Error(this.translateError(error.stderr || error.message));
    }
  }

  // 多根工作区：优先选含 openspec/ 的根
  private resolveRepoRoot(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) return undefined;
    const fs = require('fs');
    const path = require('path');
    for (const f of folders) {
      if (fs.existsSync(path.join(f.uri.fsPath, 'openspec'))) {
        return f.uri.fsPath;
      }
    }
    return folders[0].uri.fsPath;
  }

  // 把常见 Git 报错翻译成可执行中文提示
  private translateError(stderr: string): string {
    if (/authentication|could not read|permission denied/i.test(stderr))
      return 'Git 认证失败，请检查 HTTPS Token 或 SSH Key 配置';
    if (/could not resolve host|network|timed out/i.test(stderr))
      return '无法连接远程仓库，请检查网络连接';
    if (/conflict/i.test(stderr))
      return '检测到冲突，需要人工处理';
    return `Git 命令失败：${stderr}`;
  }

  private async currentBranch(): Promise<string> {
    return this.execGit(['rev-parse', '--abbrev-ref', 'HEAD']);
  }

  async pull(): Promise<void> {
    const branch = await this.currentBranch();
    await this.execGit(['pull', 'origin', branch]);
  }

  async commit(message: string): Promise<void> {
    await this.execGit(['add', 'openspec/']);
    await this.execGit(['commit', '-m', `"${message}"`]);
  }

  async push(): Promise<void> {
    const branch = await this.currentBranch();
    await this.execGit(['push', 'origin', branch]);
  }

  // 一键 Sync：add → commit → pull --rebase → push，含冲突回滚
  async sync(): Promise<void> {
    const branch = await this.currentBranch();
    await this.execGit(['add', 'openspec/']);

    // 有变更才提交
    const staged = await this.execGit(['status', '--porcelain']);
    if (staged) {
      const msg = await vscode.window.showInputBox({
        prompt: '请输入提交消息',
        value: '更新 OpenSpec 规范变更'
      });
      if (!msg) return;
      await this.execGit(['commit', '-m', `"${msg}"`]);
    }

    try {
      await this.execGit(['pull', '--rebase', 'origin', branch]);
    } catch (e) {
      // rebase 失败 → 回滚并引导
      await this.execGit(['rebase', '--abort']).catch(() => {});
      const choice = await vscode.window.showWarningMessage(
        '检测到冲突，需要人工处理',
        '手动解决',
        '放弃我的修改重新拉取'
      );
      if (choice === '放弃我的修改重新拉取') {
        await this.execGit(['reset', '--hard', `origin/${branch}`]);
        await this.execGit(['pull', 'origin', branch]);
      }
      return;
    }

    await this.execGit(['push', 'origin', branch]);
    vscode.window.showInformationMessage('✓ 已发布到远程');
  }

  async getStatus(): Promise<{
    branch: string;
    ahead: number;
    behind: number;
    files: Array<{ path: string; status: string }>;
  }> {
    const branch = await this.currentBranch();
    const status = await this.execGit(['status', '--porcelain']);

    const files: Array<{ path: string; status: string }> = [];
    status.split('\n').forEach(line => {
      if (line.trim()) {
        files.push({ path: line.substring(3), status: line.substring(0, 2) });
      }
    });

    // 正确计算 ahead/behind
    let ahead = 0, behind = 0;
    try {
      const counts = await this.execGit(['rev-list', '--count', '--left-right', '@{u}...HEAD']);
      const [b, a] = counts.split(/\s+/).map(Number);
      behind = b || 0;
      ahead = a || 0;
    } catch {
      // 无 upstream 时忽略
    }

    return { branch, ahead, behind, files };
  }
}
```

## 五、用户体验流程

### 5.1 产品经理评审场景

1. 打开 VS Code，切换到「OpenSpec Sync」侧边栏
2. 点击「Sync」→ 自动拉取最新 spec（若本地无修改则只 pull）
3. 在编辑器中查看并直接添加评审意见
4. 点击「Sync」→ 输入「添加评审意见：XXX」→ 自动提交并推送
5. 全程无需任何 Git 命令

### 5.2 开发人员更新规范场景

1. AI 完成编码后自动更新 `changes/任务名称/specs/` 文件
2. 侧边栏显示「变更文件：5」
3. 点击「Sync」→ 输入「完成 XX 功能，更新 spec」→ 一键发布
4. 等待 Code Review 通过后执行 `/opsx:archive` 归档

### 5.3 技术负责人审查场景

1. 收到 PR 通知，点击「Sync」拉取最新代码和 spec
2. 对比 proposal.md 与实际实现
3. 在 tasks.md 添加审查意见 → 点击「Sync」返回意见

## 六、进阶功能（Phase 2）

- **智能提示**：检测到 `changes/` 新文件时提示初始化 spec 文档
- **一键初始化**：新任务一键生成 proposal.md / design.md / tasks.md / specs/，让产品、测试也能发起 spec 而非仅评审
- **状态颜色标识**：绿 ✓ up to date / 黄 ⚠️ n ahead / 红 ✗ 冲突 / 灰 无变更
- **批量操作**：Pull + Rebase 保持线性历史

## 七、部署与使用

```bash
# 1. 安装依赖
npm install

# 2. 打包
npm run compile

# 3. 本地测试（F5 打开扩展开发宿主窗口）

# 4. 打包成 .vsix
npm install -g vsce
vsce package
```

安装方式：企业内部通过 VS Code 企业扩展市场部署；个人使用打包 .vsix 手动安装。

## 八、总结

核心价值：

- **降低门槛**：非开发人员通过「一键 Sync」零成本参与 SDD 流程
- **流程保障**：spec 文档及时同步到远程
- **可视化状态**：一眼看清同步状态
- **减少错误**：消除手动 Git 命令的失误，冲突有兜底逃生口

**MVP 范围**：

- ✅ 一键 Sync 按钮（主路径，含冲突回滚）
- ✅ 状态面板（分支 / 远程状态 / 变更数）
- ✅ 凭证失败友好提示
- ✅ 单步 Pull/Commit/Push（高级折叠区）

> 一键初始化、智能提示、批量操作 → Phase 2
```