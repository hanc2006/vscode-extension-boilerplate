import * as vscode from 'vscode';

const CONFIG_SECTION = 'awsKubeUtils';

export class Config {
  private config: vscode.WorkspaceConfiguration;

  constructor() {
    this.config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  }

  refresh(): void {
    this.config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  }

  getAwsCaBundlePath(): string {
    return this.config.get<string>('awsCaBundlePath', '');
  }

  getStatusBarRefreshInterval(): number {
    return this.config.get<number>('statusBarRefreshInterval', 60000);
  }

  async setAwsCaBundlePath(path: string): Promise<void> {
    await this.config.update('awsCaBundlePath', path, vscode.ConfigurationTarget.Global);
    this.refresh();
  }

  async setStatusBarRefreshInterval(interval: number): Promise<void> {
    await this.config.update('statusBarRefreshInterval', interval, vscode.ConfigurationTarget.Global);
    this.refresh();
  }
}
