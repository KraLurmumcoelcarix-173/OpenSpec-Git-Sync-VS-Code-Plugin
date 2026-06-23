// 测试用的假 vscode 模块。真 vscode 只在扩展宿主里存在，
// jest 跑不到，这里提供一个最小替身。
export const workspace = {
  workspaceFolders: [
    { uri: { fsPath: '/fake/repo' } }
  ],
  getConfiguration: () => ({
    get: (_key: string, fallback: any) => fallback,
  }),
};

export const window = {
  showInformationMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showInputBox: jest.fn(),
};