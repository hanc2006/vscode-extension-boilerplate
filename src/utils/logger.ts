import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel | null = null;

export function initLogger(): void {
  outputChannel = vscode.window.createOutputChannel('AWS & Kube Utils');
}

export function log(message: string): void {
  if (outputChannel) {
    const timestamp = new Date().toISOString();
    outputChannel.appendLine(`[${timestamp}] ${message}`);
  }
}

export function logError(message: string, error?: Error): void {
  if (outputChannel) {
    const timestamp = new Date().toISOString();
    outputChannel.appendLine(`[${timestamp}] ERROR: ${message}`);
    if (error) {
      outputChannel.appendLine(`[${timestamp}] ${error.message}`);
      if (error.stack) {
        outputChannel.appendLine(`[${timestamp}] ${error.stack}`);
      }
    }
  }
}

export function showOutput(): void {
  if (outputChannel) {
    outputChannel.show();
  }
}

export function getOutputChannel(): vscode.OutputChannel | null {
  return outputChannel;
}
