import * as vscode from "vscode";
import { logger } from "../utils/logger";
import { config } from "../utils/config";
import { terminal } from "../utils/terminal";
import path from "path";

export class AwsProfileStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private currentProfile: string | undefined;
  private refreshInterval: NodeJS.Timeout | undefined;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;

    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = "aws-kube-utils.switchAwsProfile";
    this.statusBarItem.tooltip = "Click to switch AWS profile";

    this.currentProfile = context.globalState.get<string>("awsCurrentProfile");

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
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.warningBackground"
        );
        this.statusBarItem.tooltip = `AWS Profile: ${this.currentProfile} (session expired - click to login)`;
      }
    } else {
      this.statusBarItem.text = "$(cloud) AWS: Not configured";
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip = "Click to select AWS profile";
    }
    this.statusBarItem.show();
  }

  private async validateProfile(profile: string): Promise<boolean> {
    try {
      const result = await terminal.executeCommand("aws", [
        "sts",
        "get-caller-identity",
        "--cli-read-timeout",
        "5",
        "--cli-connect-timeout",
        "5",
        "--profile",
        profile,
      ]);
      return !result.failed;
    } catch (error) {
      return false;
    }
  }

  private startAutoRefresh(): void {
    const interval = config.read("statusBarRefreshInterval");

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(() => {
      this.updateStatusBar();
    }, interval);
  }

  async setProfile(profile: string): Promise<void> {
    this.currentProfile = profile;
    await this.context.globalState.update("awsCurrentProfile", profile);
    logger.info(`AWS profile set to: ${profile}`);
    await this.updateStatusBar();
  }

  async switchProfile(): Promise<void> {
    try {
      logger.info("Fetching AWS profiles...");
      const result = await terminal.executeCommand("aws", [
        "configure",
        "list-profiles",
      ]);

      if (result.failed) {
        vscode.window.showErrorMessage(
          "Failed to fetch AWS profiles. Make sure AWS CLI is installed and configured."
        );
        logger.error(
          "Failed to fetch AWS profiles",
          new Error(result.stderr.join("\n"))
        );
        return;
      }

      const profiles = result.stdout;

      if (profiles.length === 0) {
        vscode.window.showErrorMessage(
          "No AWS profiles found. Please configure AWS CLI first."
        );
        return;
      }

      const selected = await vscode.window.showQuickPick(profiles, {
        placeHolder: "Select an AWS profile",
        title: "AWS Profile Selection",
      });

      if (selected) {
        await this.setProfile(selected);
        await this.loginToProfile(selected);
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(
        `Failed to switch AWS profile: ${error.message}`
      );
      logger.error("Failed to switch AWS profile", error);
    }
  }

  private async loginToProfile(profile: string): Promise<void> {
    const caBundlePath = path.join(
      this.context.extensionPath,
      config.read("awsCaBundlePath")
    );

    logger.info(`Executing AWS SSO login for profile: ${profile}`);

    const loginTerminal = vscode.window.createTerminal({
      name: `AWS SSO Login - ${profile}`,
      hideFromUser: false,
    });

    loginTerminal.show();
    loginTerminal.sendText(
      `aws sso login --profile ${profile} --ca-bundle ${caBundlePath}`,
      true
    );

    vscode.window.showInformationMessage(
      `AWS SSO login initiated for profile: ${profile}. Please complete the authentication in the terminal.`
    );
  }

  async refresh(): Promise<void> {
    await this.updateStatusBar();
  }

  dispose(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    terminal.dispose();
    this.statusBarItem.dispose();
  }
}
