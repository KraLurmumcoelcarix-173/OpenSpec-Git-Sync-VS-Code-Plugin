import { execFile } from 'child_process';
import { promisify } from 'util';
import type { GitRunner } from './gitHandler';

const execFileAsync = promisify(execFile);

// 生产环境的真实 git 执行器：用 execFile 数组传参，避免 shell 转义问题
export const realGitRunner: GitRunner = async (cmd, args, cwd) => {
  const { stdout } = await execFileAsync(cmd, args, { cwd });
  return stdout;
};