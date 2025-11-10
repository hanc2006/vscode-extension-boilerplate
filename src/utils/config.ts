import * as vscode from "vscode";

const CONFIG_SECTION = "awsKubeUtils";

export interface ExtensionConfig {
  awsCaBundlePath: string;
  statusBarRefreshInterval: number;
}

const DEFAULT_CONFIG: ExtensionConfig = {
  awsCaBundlePath: "data/portal.sso.eu-west-1.amazonaws.com.pem",
  statusBarRefreshInterval: 60000,
};

export class Config {
  private config: vscode.WorkspaceConfiguration;

  constructor() {
    this.config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  }

  private load() {
    this.config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  }

  public async write<K extends keyof ExtensionConfig>(
    name: K,
    value: ExtensionConfig[K],
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
  ): Promise<void> {
    await this.config.update(name, value, target);
    this.load();
  }

  public read<K extends keyof ExtensionConfig>(name: K): ExtensionConfig[K] {
    return this.config.get<ExtensionConfig[K]>(name, DEFAULT_CONFIG[name]);
  }
}

export const config = new Config();
