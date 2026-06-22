# OpenSpec Git Sync VS Code 插件 - 完整提案

## 一、项目背景

### 1.1 痛点
在 OpenSpec 研发工作流中，非开发人员 (产品经理、测试、技术负责人等) 需要参与**规范契约评审**环节，但由于不熟悉 Git 命令，无法方便地完成:
- 拉取最新的 OpenSpec 规范文档进行评审
- 评审后提交修改的规范变更
- 推送至远程仓库供他人查看

### 1.2 目标
通过 VS Code 插件提供**图形化按钮**,将复杂的 Git 操作简化为一键点击，让所有角色都能无缝参与 SDD 流程。

---

## 二、核心工作流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                      OpenSpec Git Sync 工作流                         │
└─────────────────────────────────────────────────────────────────────┘

  场景 A: 拉取最新规范 (Pull)
  ┌──────────┐     按钮点击      ┌──────────────┐     自动执行        ┌──────────┐
  │  VS Code │ ─────────────→  │  Git Plugin  │ ─────────────────→  │ 远程仓库  │
  │  用户    │                   │   (后端)     │                     │ (origin) │
  └──────────┘                   └──────────────┘                     └──────────┘
                                  ↓
                         git pull origin main
                         更新 openspec/changes/*
                         刷新状态面板

  场景 B: 提交变更 (Commit)
  ┌──────────┐     编辑文件      ┌──────────┐     按钮点击      ┌──────────┐
  │  VS Code │ ─────────────→  │ 本地文件  │ ─────────────→  │ Git 暂存区  │
  │  编辑器  │   (修改 spec 文档) │  (changes/)│                   │   (Stage)│
  └──────────┘                   └──────────┘                   └────┬─────┘
                                                                      ↓
                                                            按钮点击 (Commit)
                                                                      ↓
                          ┌──────────┐     填写消息       ┌──────────────┐
                          │ 输入框    │ ←──────────────── │  Git 提交     │
                          └──────────┘                    └──────┬───────┘
                                                                 ↓
                                                        git commit -m "..."

  场景 C: 推送到远程 (Push)
  ┌──────────┐     按钮点击      ┌──────────────┐     自动执行        ┌──────────┐
  │  VS Code │ ─────────────→  │  Git Plugin  │ ─────────────────→  │ 远程仓库  │
  │  用户    │                   │   (后端)     │                     │ (origin) │
  └──────────┘                   └──────────────┘                     └──────────┘
                                  ↓
                         git push origin origin
                         推送 changes/任务名称/的所有变更
```

---

## 三、插件功能设计

### 3.1 核心按钮 (Side Panel)

在 VS Code 侧边栏添加 **"OpenSpec Sync"** 面板:

```
┌────────────────────────────────────────┐
│ 🔧 OpenSpec Git Sync                   │
├────────────────────────────────────────┤
│                                        │
│  📊 状态                                │
│  ─────────────────                     │
│  分支：main                            │
│  远程：up to date ✓                    │
│  变更文件：3                           │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ 🔽 Pull (拉取最新规范)              │ │
│  └──────────────────────────────────┘ │
│                                        │
│  变更文件列表:                          │
│  ✏️ proposal.md (修改)                 │
│  ✏️ design.md (修改)                  │
│  ✏️ tasks.md (新增)                   │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ ✅ Commit (提交变更)                │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ 🚀 Push (推送到远程)                │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ 🔄 Refresh (刷新状态)               │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘
```

### 3.2 按钮详细行为

#### 按钮 1: **Pull (拉取最新规范)**
```typescript
// 执行流程
1. 检查当前分支是否可拉取
2. 执行 git pull origin <current-branch>
3. 刷新文件列表
4. 显示成功/失败提示

// 异常处理
- 有未暂存变更 → 提示"请先提交本地变更"
- 拉取冲突 → 提示冲突文件，建议手动解决
- 网络错误 → 提示检查网络连接
```

#### 按钮 2: **Commit (提交变更)**
```typescript
// 执行流程
1. 检测有变更的文件
2. 弹出输入框："请输入提交消息 (例如：更新 proposal.md 变更范围)"
3. 执行 git add .
4. 执行 git commit -m "<用户输入>"
5. 刷新状态面板

// 提交消息模板 (可配置)
- "更新 proposal.md: [任务名称]"
- "更新 design.md: [技术方案]"
- "更新 tasks.md: [进度同步]"
- "自动提交 OpenSpec 规范变更"
```

#### 按钮 3: **Push (推送到远程)**
```typescript
// 执行流程
1. 检查是否有待推送的提交
2. 执行 git push origin <current-branch>
3. 显示推送进度
4. 推送成功 → 显示"✓ 已推送到远程"
5. 推送失败 → 显示错误原因 (如需要先 pull)

// 异常处理
- 远程需要先 pull → 提示"远程有更新，请先 Pull 再 Push"
- 权限不足 → 提示检查 Git 凭证
```

#### 按钮 4: **Refresh (刷新状态)**
```typescript
// 执行流程
1. 执行 git status --porcelain
2. 解析变更文件列表
3. 检查当前分支和远程状态
4. 更新状态面板显示
```

### 3.3 状态面板内容

| 字段 | 说明 | 示例 |
|------|------|------|
| 分支 | 当前 Git 分支 | `main` / `dev_06 上线_张三_需求评审` |
| 远程状态 | 与远程的同步状态 | `up to date ✓` / `3 commits ahead` / `has conflicts ⚠️` |
| 变更文件 | 有变更的 spec 文件数量 | `3` |
| 变更列表 | 具体变更文件列表 | `proposal.md (modified)` |

---

## 四、技术实现方案

### 4.1 技术栈

```json
{
  "name": "openspec-git-sync",
  "displayName": "OpenSpec Git Sync",
  "version": "1.0.0",
  "engines": {
    "vscode": "^1.80.0"
  },
  "activationEvents": [],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "opensync.pull",
        "title": "Pull Latest Spec"
      },
      {
        "command": "opensync.commit",
        "title": "Commit Changes"
      },
      {
        "command": "opensync.push",
        "title": "Push to Remote"
      },
      {
        "command": "opensync.refresh",
        "title": "Refresh Status"
      }
    ],
    "viewsContainers": {
      "activitybar": [
        {
          "id": "opensync-sidebar",
          "title": "OpenSpec Sync",
          "icon": "media/icon.svg"
        }
      ]
    },
    "views": {
      "opensync-sidebar": [
        {
          "type": "webview",
          "id": "opensync.panel",
          "name": "Sync Panel"
        }
      ]
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "webpack",
    "watch": "webpack --watch"
  },
  "dependencies": {
    "@vscode/webview-ui-toolkit": "^1.4.0"
  },
  "devDependencies": {
    "@types/vscode": "^1.80.0",
    "typescript": "^5.0.0",
    "webpack": "^5.0.0"
  }
}
```

### 4.2 目录结构

```
openspec-git-sync/
├── src/
│   ├── extension.ts          # 主入口
│   ├── syncProvider.ts       # Side Panel 数据提供者
│   ├── gitHandler.ts         # Git 操作封装
│   └── webview/
│       ├── index.html        # Side Panel 界面
│       ├── style.css         # 样式
│       └── script.js         # 前端交互逻辑
├── media/
│   └── icon.svg              # 插件图标
├── package.json
└── README.md
```

### 4.3 核心代码示例

#### extension.ts (主入口)
```typescript
import * as vscode from 'vscode';
import { SyncProvider } from './syncProvider';
import { GitHandler } from './gitHandler';

export function activate(context: vscode.ExtensionContext) {
  const gitHandler = new GitHandler();
  
  const syncProvider = new SyncProvider(context.extensionUri);
  
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('opensync.files', syncProvider),
    
    vscode.commands.registerCommand('opensync.pull', async () => {
      await gitHandler.pull();
      syncProvider.refresh();
    }),
    
    vscode.commands.registerCommand('opensync.commit', async () => {
      const message = await vscode.window.showInputBox({
        prompt: '请输入提交消息',
        placeHolder: '例如：更新 proposal.md 变更范围'
      });
      if (message) {
        await gitHandler.commit(message);
        syncProvider.refresh();
      }
    }),
    
    vscode.commands.registerCommand('opensync.push', async () => {
      await gitHandler.push();
      syncProvider.refresh();
    }),
    
    vscode.commands.registerCommand('opensync.refresh', () => {
      syncProvider.refresh();
    })
  );
}
```

#### gitHandler.ts (Git 操作封装)
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';

const execAsync = promisify(exec);

export class GitHandler {
  private async execGit(args: string[]): Promise<string> {
    const cwd = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!cwd) {
      throw new Error('未打开工作区');
    }
    
    try {
      const { stdout } = await execAsync(`git ${args.join(' ')}`, { cwd });
      return stdout.trim();
    } catch (error: any) {
      throw new Error(`Git 命令失败：${error.stderr}`);
    }
  }
  
  async pull(): Promise<void> {
    await this.execGit(['pull', 'origin', 'HEAD']);
  }
  
  async commit(message: string): Promise<void> {
    await this.execGit(['add', '.']);
    await this.execGit(['commit', '-m', message]);
  }
  
  async push(): Promise<void> {
    await this.execGit(['push', 'origin', 'HEAD']);
  }
  
  async getStatus(): Promise<{
    branch: string;
    ahead: number;
    behind: number;
    files: Array<{ path: string; status: string }>;
  }> {
    const branch = await this.execGit(['rev-parse', '--abbrev-ref', 'HEAD']);
    const status = await this.execGit(['status', '--porcelain']);
    
    const files = [];
    status.split('\n').forEach(line => {
      if (line.trim()) {
        files.push({
          path: line.substring(3),
          status: line.substring(0, 2)
        });
      }
    });
    
    // 计算 ahead/behind
    const upStream = await this.execGit(['rev-parse', '--abbrev-ref', 'HEAD@{u}']);
    const log = await this.execGit(['log', `${branch}...${upStream}`, '--oneline']);
    const ahead = (log.match(/ahead/g) || []).length;
    const behind = (log.match(/behind/g) || []).length;
    
    return { branch, ahead, behind, files };
  }
}
```

---

## 五、用户体验流程

### 5.1 产品经理评审场景

```
1. 打开 VS Code,切换到"OpenSpec Sync"侧边栏
2. 点击 "Pull" 按钮 → 拉取最新的 spec 文档
3. 在编辑器中查看 proposal.md / design.md / tasks.md
4. 直接在文档中添加评审意见 (或另存为评审意见文档)
5. 点击 "Commit" 按钮 → 输入"添加评审意见:XXX"
6. 点击 "Push" 按钮 → 推送到远程，供开发团队查看
```

### 5.2 开发人员更新规范场景

```
1. AI 完成编码后，自动更新 changes/任务名称/specs/文件
2. 打开 VS Code,"OpenSpec Sync"侧边栏显示"变更文件：5"
3. 点击 "Commit" 按钮 → 输入"完成 XX 功能开发，更新 spec"
4. 点击 "Push" 按钮 → 推送变更
5. 等待 Code Review 通过后，执行 /opsx:archive 归档
```

### 5.3 技术负责人审查场景

```
1. 收到 PR 通知，打开 VS Code
2. 点击 "Pull" 按钮 → 拉取最新代码和 spec
3. 对比 proposal.md 和实际代码实现
4. 在 tasks.md 中添加审查意见
5. 点击 "Commit" 和 "Push" → 返回审查意见
```

---

## 六、进阶功能 (Phase 2 可选)

### 6.1 智能提示
- 检测 `changes/` 目录下有新文件时，自动提示"发现新的变更任务，是否初始化 spec 文档?"
- 检测 `tasks.md` 未更新时，提示"任务进度未同步，建议更新 tasks.md"

### 6.2 一键初始化
- 新任务创建后，提供按钮一键生成 4 份核心契约文件:
  - proposal.md
  - design.md
  - tasks.md
  - specs/

### 6.3 状态颜色标识
```
绿色 ✓: 远程 up to date
黄色 ⚠️: 有未推送的变更 (n commits ahead)
红色 ✗: 有冲突 / 拉取失败
灰色 : 无变更
```

### 6.4 批量操作
- 一键 Commit + Push (适合快速迭代)
- Pull + Rebase (保持线性历史)

---

## 七、部署与使用

### 7.1 打包发布

```bash
# 1. 安装依赖
npm install

# 2. 打包
npm run compile

# 3. 本地测试
# 按 F5 打开 VS Code 扩展开发宿主窗口

# 4. 发布到 VS Code 市场 (可选)
npm install -g vsce
vsce package
vsce publish
```

### 7.2 安装方式
1. **企业内部**: 通过 VS Code 企业扩展市场部署
2. **个人使用**: 打包成 `.vsix` 文件，用户手动安装

---

## 八、总结

这个插件的核心价值:

1. **降低门槛**: 非开发人员也能方便地参与 OpenSpec 工作流
2. **流程保障**: 确保 spec 文档及时同步到远程仓库
3. **可视化状态**: 一眼看清当前 spec 的同步状态
4. **减少错误**: 避免手动输入 Git 命令导致的失误

**最小可行产品 (MVP)** 只需实现:
- ✅ Pull 按钮
- ✅ Commit 按钮 (带输入框)
- ✅ Push 按钮
- ✅ 状态面板

后续可根据团队反馈逐步添加更多功能。
