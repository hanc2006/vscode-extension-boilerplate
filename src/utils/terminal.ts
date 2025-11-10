import * as vscode from "vscode";
import { logger } from "./logger";
import spawn from "nano-spawn";

export interface TerminalExecResult {
  stdout: string[];
  stderr: string[];
  failed: boolean;
}

export class TerminalExecutor implements vscode.Disposable {
  /**
   * Execute a command in a hidden terminal and wait for its output.
   * We append an `echo END_MARKER` to know when the command completed.
   */
  async executeCommand(
    command: string,
    args: string[]
  ): Promise<TerminalExecResult> {
    logger.info(`Executing terminal command: ${command} ${args.join(" ")}`);

    const result = await spawn(command, args);

    return {
      stdout: result.stdout.split("\n"),
      stderr: result.stderr.split("\n"),
      failed: result.stderr.length > 0,
    };
  }

  dispose() {}
}

export const terminal = new TerminalExecutor();
