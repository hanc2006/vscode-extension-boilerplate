import * as vscode from "vscode";

export class Logger {
  private outputChannel: vscode.OutputChannel;

  constructor(channelName: string = "AWS & Kube Utils") {
    this.outputChannel = vscode.window.createOutputChannel(channelName);
  }

  info(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] INFO: ${message}`);
  }

  error(message: string, error?: Error): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] ERROR: ${message}`);
    if (error) {
      this.outputChannel.appendLine(`[${timestamp}] ${error.message}`);
      if (error.stack) {
        this.outputChannel.appendLine(`[${timestamp}] ${error.stack}`);
      }
    }
  }

  showOutput(): void {
    this.outputChannel.show();
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}

export const logger = new Logger();
