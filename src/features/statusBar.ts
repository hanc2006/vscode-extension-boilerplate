import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { Config } from '../utils/config';
import { TerminalExecutor } from '../utils/terminal';

const logger = new Logger();

export class AwsProfileStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private currentProfile: string | undefined;
  private refreshInterval: NodeJS.Timeout | undefined;
  private context: vscode.ExtensionContext;
  private config: Config;
  private terminalExecutor: TerminalExecutor;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.config = new Config();
    this.terminalExecutor = new TerminalExecutor('aws-profile-manager');
    
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'aws-kube-utils.switchAwsProfile';
    this.statusBarItem.tooltip = 'Click to switch AWS profile';
    
    this.currentProfile = context.globalState.get<string>('awsCurrentProfile');
    
    this.updateStatusBar();
    this.startAutoRefresh();
  }

  private async updateStatusBar(): Promise<void> {
    if (this.currentProfile) {
      const isValid = await this.validateProfile(this.currentProfile);
      if (isValid) {
        this.statusBarItem.text = `$(cloud) AWS: ${this.currentProfile}`;
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.tooltip = `AWS Profile: ${this.currentProfile} (authenticated)`;
      } else {
        this.statusBarItem.text = `$(cloud) AWS: ${this.currentProfile} $(warning)`;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        this.statusBarItem.tooltip = `AWS Profile: ${this.currentProfile} (session expired - click to login)`;
      }
    } else {
      this.statusBarItem.text = '$(cloud) AWS: Not configured';
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip = 'Click to select AWS profile';
    }
    this.statusBarItem.show();
  }

  private async validateProfile(profile: string): Promise<boolean> {
    try {
      const result = await this.terminalExecutor.executeCommandWithMarkers(
        `aws sts get-caller-identity --profile ${profile}`
      );
      return !result.failed;
    } catch (error) {
      return false;
    }
  }

  private startAutoRefresh(): void {
    const interval = this.config.getStatusBarRefreshInterval();
    
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    this.refreshInterval = setInterval(() => {
      this.updateStatusBar();
    }, interval);
  }

  async setProfile(profile: string): Promise<void> {
    this.currentProfile = profile;
    await this.context.globalState.update('awsCurrentProfile', profile);
    logger.info(`AWS profile set to: ${profile}`);
    await this.updateStatusBar();
  }

  async switchProfile(): Promise<void> {
    try {
      logger.info('Fetching AWS profiles...');
      const result = await this.terminalExecutor.executeCommandWithMarkers('aws configure list-profiles');
      
      if (result.failed || !result.stdout) {
        vscode.window.showErrorMessage('Failed to fetch AWS profiles. Make sure AWS CLI is installed and configured.');
        logger.error('Failed to fetch AWS profiles', new Error(result.stderr));
        return;
      }

      const profiles = result.stdout.split('\n').filter(p => p.trim().length > 0);
      
      if (profiles.length === 0) {
        vscode.window.showErrorMessage('No AWS profiles found. Please configure AWS CLI first.');
        return;
      }

      const selected = await vscode.window.showQuickPick(profiles, {
        placeHolder: 'Select an AWS profile',
        title: 'AWS Profile Selection'
      });

      if (selected) {
        await this.setProfile(selected);
        await this.loginToProfile(selected);
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to switch AWS profile: ${error.message}`);
      logger.error('Failed to switch AWS profile', error);
    }
  }

  private async loginToProfile(profile: string): Promise<void> {
    const caBundlePath = this.config.getAwsCaBundlePath();

    let command = `aws sso login --profile ${profile}`;
    if (caBundlePath) {
      command += ` --ca-bundle "${caBundlePath}"`;
    }

    logger.info(`Executing AWS SSO login for profile: ${profile}`);

    const loginTerminal = new TerminalExecutor(`AWS SSO Login - ${profile}`);
    const terminal = vscode.window.createTerminal({
      name: `AWS SSO Login - ${profile}`,
      hideFromUser: false
    });
    
    terminal.show();
    terminal.sendText(command, true);

    vscode.window.showInformationMessage(`AWS SSO login initiated for profile: ${profile}. Please complete the authentication in the terminal.`);
  }

  async refresh(): Promise<void> {
    this.config.refresh();
    await this.updateStatusBar();
  }

  dispose(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.terminalExecutor.dispose();
    this.statusBarItem.dispose();
  }
}
