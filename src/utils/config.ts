import * as vscode from 'vscode';

const CONFIG_SECTION = 'awsKubeUtils';

export interface ExtensionConfig {
  awsCaBundlePath: string;
  statusBarRefreshInterval: number;
}

const DEFAULT_CONFIG: ExtensionConfig = {
  awsCaBundlePath: '',
  statusBarRefreshInterval: 60000
};

export class Config {
  private config: vscode.WorkspaceConfiguration;

  constructor() {
    this.config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  }

  refresh(): void {
    this.config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  }

  read(): ExtensionConfig {
    return {
      awsCaBundlePath: this.config.get<string>('awsCaBundlePath', DEFAULT_CONFIG.awsCaBundlePath),
      statusBarRefreshInterval: this.config.get<number>('statusBarRefreshInterval', DEFAULT_CONFIG.statusBarRefreshInterval)
    };
  }

  async write<K extends keyof ExtensionConfig>(
    name: K,
    value: ExtensionConfig[K],
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
  ): Promise<void> {
    await this.config.update(name, value, target);
    this.refresh();
  }

  getAwsCaBundlePath(): string {
    return this.read().awsCaBundlePath;
  }

  getStatusBarRefreshInterval(): number {
    return this.read().statusBarRefreshInterval;
  }

  async setAwsCaBundlePath(path: string): Promise<void> {
    await this.write('awsCaBundlePath', path);
  }

  async setStatusBarRefreshInterval(interval: number): Promise<void> {
    await this.write('statusBarRefreshInterval', interval);
  }
}
