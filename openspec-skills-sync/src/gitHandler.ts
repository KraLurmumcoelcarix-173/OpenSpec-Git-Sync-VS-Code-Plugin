// git 执行器的类型：给定命令、参数、工作目录，返回 stdout
export type GitRunner = (
  cmd: string,
  args: string[],
  cwd: string
) => Promise<string>;

export class GitHandler {
  constructor(
    private repoRoot: string,
    private runner: GitRunner
  ) {}

  private async execGit(args: string[]): Promise<string> {
    const stdout = await this.runner('git', args, this.repoRoot);
    return stdout.trim();
  }

  async currentBranch(): Promise<string> {
    return this.execGit(['rev-parse', '--abbrev-ref', 'HEAD']);
  }

  async hasLocalChanges(relPath: string): Promise<boolean> {
    const out = await this.execGit(['status', '--porcelain', '--', relPath]);
    return out.length > 0;
  }

}