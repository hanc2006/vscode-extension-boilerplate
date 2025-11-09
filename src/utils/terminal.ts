import * as vscode from 'vscode';
import { Logger } from './logger';

const logger = new Logger();

export interface TerminalExecResult {
  stdout: string;
  stderr: string;
  failed: boolean;
}

export class TerminalExecutor {
  private terminal: vscode.Terminal | undefined;
  private outputBuffer: string = '';
  private disposables: vscode.Disposable[] = [];

  constructor(private terminalName: string = 'AWS-Kube-Utils') {}

  private getOrCreateTerminal(): vscode.Terminal {
    if (!this.terminal || this.terminal.exitStatus !== undefined) {
      this.terminal = vscode.window.createTerminal({
        name: this.terminalName,
        hideFromUser: true
      });
    }
    return this.terminal;
  }

  async executeCommand(command: string, options?: { timeout?: number }): Promise<TerminalExecResult> {
    return new Promise((resolve, reject) => {
      const terminal = this.getOrCreateTerminal();
      this.outputBuffer = '';
      
      logger.info(`Executing terminal command: ${command}`);

      const timeout = options?.timeout || 30000;
      let timeoutHandle: NodeJS.Timeout;
      let dataListener: vscode.Disposable | undefined;

      const cleanup = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        if (dataListener) {
          dataListener.dispose();
          const index = this.disposables.indexOf(dataListener);
          if (index > -1) {
            this.disposables.splice(index, 1);
          }
        }
      };

      dataListener = vscode.window.onDidWriteTerminalData((event) => {
        if (event.terminal === terminal) {
          this.outputBuffer += event.data;
          
          if (this.outputBuffer.includes('\n') && 
              (this.outputBuffer.trim().endsWith('$') || 
               this.outputBuffer.trim().endsWith('>') ||
               this.outputBuffer.includes('command not found') ||
               this.outputBuffer.includes('error:'))) {
            cleanup();
            
            const output = this.outputBuffer.trim();
            const failed = output.includes('error:') || 
                          output.includes('command not found') ||
                          output.includes('Error:');
            
            logger.info(`Terminal command completed: ${command}`);
            
            resolve({
              stdout: output,
              stderr: failed ? output : '',
              failed
            });
          }
        }
      });

      this.disposables.push(dataListener);

      timeoutHandle = setTimeout(() => {
        cleanup();
        const output = this.outputBuffer.trim();
        
        if (output.length > 0) {
          logger.info(`Terminal command completed (timeout): ${command}`);
          resolve({
            stdout: output,
            stderr: '',
            failed: false
          });
        } else {
          logger.error(`Terminal command timeout: ${command}`);
          reject(new Error(`Command timeout after ${timeout}ms: ${command}`));
        }
      }, timeout);

      terminal.sendText(command, true);
    });
  }

  async executeCommandWithMarkers(command: string, options?: { timeout?: number }): Promise<TerminalExecResult> {
    return new Promise((resolve, reject) => {
      const terminal = this.getOrCreateTerminal();
      this.outputBuffer = '';
      
      const startMarker = `__START_${Date.now()}__`;
      const endMarker = `__END_${Date.now()}__`;
      
      logger.info(`Executing terminal command with markers: ${command}`);

      const timeout = options?.timeout || 30000;
      let timeoutHandle: NodeJS.Timeout;
      let dataListener: vscode.Disposable | undefined;
      let captureStarted = false;
      let capturedOutput = '';

      const cleanup = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        if (dataListener) {
          dataListener.dispose();
          const index = this.disposables.indexOf(dataListener);
          if (index > -1) {
            this.disposables.splice(index, 1);
          }
        }
      };

      dataListener = vscode.window.onDidWriteTerminalData((event) => {
        if (event.terminal === terminal) {
          this.outputBuffer += event.data;
          
          if (!captureStarted && this.outputBuffer.includes(startMarker)) {
            captureStarted = true;
            const startIndex = this.outputBuffer.indexOf(startMarker) + startMarker.length;
            this.outputBuffer = this.outputBuffer.substring(startIndex);
          }
          
          if (captureStarted && this.outputBuffer.includes(endMarker)) {
            const endIndex = this.outputBuffer.indexOf(endMarker);
            capturedOutput = this.outputBuffer.substring(0, endIndex).trim();
            
            cleanup();
            
            logger.info(`Terminal command completed with markers: ${command}`);
            
            resolve({
              stdout: capturedOutput,
              stderr: '',
              failed: false
            });
          }
        }
      });

      this.disposables.push(dataListener);

      timeoutHandle = setTimeout(() => {
        cleanup();
        logger.error(`Terminal command timeout: ${command}`);
        reject(new Error(`Command timeout after ${timeout}ms: ${command}`));
      }, timeout);

      terminal.sendText(`echo "${startMarker}"`, true);
      terminal.sendText(command, true);
      terminal.sendText(`echo "${endMarker}"`, true);
    });
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = undefined;
    }
  }
}

let kubectlExecutor: TerminalExecutor | undefined;

export function getKubectlExecutor(): TerminalExecutor {
  if (!kubectlExecutor) {
    kubectlExecutor = new TerminalExecutor('kubectl-executor');
  }
  return kubectlExecutor;
}

export function disposeKubectlExecutor(): void {
  if (kubectlExecutor) {
    kubectlExecutor.dispose();
    kubectlExecutor = undefined;
  }
}
