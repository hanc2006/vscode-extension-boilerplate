import * as vscode from "vscode";
import { setInterval } from "node:timers/promises";
import { logger } from "../utils/logger";
import { config } from "../utils/config";
import { terminal } from "../utils/terminal";
import path from "path";

export class AwsProfileStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private currentProfile: string | undefined;
  private refreshInterval: NodeJS.Timeout | undefined;
  private vpnInterval: NodeJS.Timeout | undefined;
  private context: vscode.ExtensionContext;
  private lastVpnOk: boolean = false;
  private isVpnChecking: boolean = false;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;

    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = "aws-kube-utils.switchAwsProfile";
    this.statusBarItem.tooltip = "Click to switch AWS profile";

    this.currentProfile = context.globalState.get<string>("awsCurrentProfile");

    this.startVpnWatcher();
    this.startAutoRefresh();
  }

  private async updateStatusBar(): Promise<void> {
    if (!this.lastVpnOk) {
      this.statusBarItem.text = "$(cloud) AWS: No VPN Connection";
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.warningBackground"
      );
      this.statusBarItem.tooltip =
        "No VPN connection detected. Connect VPN to validate AWS profile.";
      this.statusBarItem.show();
      return;
    }

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

  private async checkVpnNow(): Promise<void> {
    if (this.isVpnChecking) {
      return;
    }

    this.isVpnChecking = true;
    const previousState = this.lastVpnOk;

    try {
      await terminal.executeCommand("curl", [
        "-sSf",
        "--max-time",
        "2",
        "https://oidc.eu-west-1.amazonaws.com",
      ]);
      this.lastVpnOk = true;
    } catch (error) {
      this.lastVpnOk = false;
    } finally {
      this.isVpnChecking = false;
    }

    if (previousState !== this.lastVpnOk) {
      logger.info(`VPN connection state changed: ${this.lastVpnOk ? "connected" : "disconnected"}`);
      await this.updateStatusBar();
    }
  }

  private startVpnWatcher(): void {
    const vpnIntervalMs = Math.min(
      30000,
      config.read("statusBarRefreshInterval")
    );

    void this.checkVpnNow();

    if (this.vpnInterval) {
      clearInterval(this.vpnInterval);
    }

    this.vpnInterval = setInterval(() => {
      void this.checkVpnNow();
    }, vpnIntervalMs);
  }

  private async startScheduler(): Promise<void> {
    const refreshMs = config.read("statusBarRefreshInterval");
    const vpnMs = Math.min(30000, refreshMs);
    const tickMs = Math.min(vpnMs, refreshMs);

    this.schedulerAbort?.abort();
    this.schedulerAbort = new AbortController();
    const { signal } = this.schedulerAbort;

    await this.checkVpnNow();
    await this.updateStatusBar();
    this.lastVpnCheckAt = Date.now();
    this.lastRefreshAt = Date.now();

    try {
      for await (const _ of setInterval(tickMs, undefined, {
        signal,
        ref: false,
      })) {
        const now = Date.now();
        if (now - this.lastVpnCheckAt >= vpnMs) {
          await this.checkVpnNow();
          this.lastVpnCheckAt = now;
        }
        if (now - this.lastRefreshAt >= refreshMs) {
          await this.updateStatusBar();
          this.lastRefreshAt = now;
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        logger.error("Scheduler error", error);
      }
    }
  }

  async setProfile(profile: string): Promise<void> {
    this.currentProfile = profile;
    await this.context.globalState.update("awsCurrentProfile", profile);
    logger.info(`AWS profile set to: ${profile}`);
    await this.updateStatusBar();
  }

  async switchProfile(): Promise<void> {
    try {
      await this.checkVpnNow();
      if (!this.lastVpnOk) {
        vscode.window.showErrorMessage(
          "No VPN connection detected. Connect VPN and try again."
        );
        logger.error("Failed to switch AWS profile: No VPN connection");
        return;
      }

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
    this.schedulerAbort?.abort();

    if (this.vpnInterval) {
      clearInterval(this.vpnInterval);
    }

    terminal.dispose();
    this.statusBarItem.dispose();
  }
}
