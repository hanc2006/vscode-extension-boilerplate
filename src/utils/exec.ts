import { exec } from 'child_process';
import { promisify } from 'util';
import { log, logError } from './logger';

const execAsync = promisify(exec);

export interface ExecResult {
  stdout: string;
  stderr: string;
  failed: boolean;
}

export async function executeCommand(command: string, options?: { timeout?: number }): Promise<ExecResult> {
  try {
    log(`Executing command: ${command}`);
    const { stdout, stderr } = await execAsync(command, {
      timeout: options?.timeout || 30000,
      maxBuffer: 10 * 1024 * 1024
    });
    log(`Command succeeded: ${command}`);
    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      failed: false
    };
  } catch (error: any) {
    logError(`Command failed: ${command}`, error);
    return {
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || error.message || '',
      failed: true
    };
  }
}

export async function checkBinaryExists(binaryName: string): Promise<boolean> {
  const command = process.platform === 'win32' 
    ? `where ${binaryName}` 
    : `which ${binaryName}`;
  
  const result = await executeCommand(command);
  return !result.failed && result.stdout.length > 0;
}
