import * as vscode from 'vscode';
import { checkBinaryExists } from './exec';
import { log, logError } from './logger';

export interface PrerequisiteCheckResult {
  allPresent: boolean;
  missingBinaries: string[];
  workspaceValid: boolean;
  packageJsonValid: boolean;
  serviceName?: string;
  workspaceRoot?: string;
  errorMessage?: string;
}

export async function checkPrerequisites(): Promise<PrerequisiteCheckResult> {
  const result: PrerequisiteCheckResult = {
    allPresent: false,
    missingBinaries: [],
    workspaceValid: false,
    packageJsonValid: false
  };

  log('Checking prerequisites...');

  const awsExists = await checkBinaryExists('aws');
  const kubectlExists = await checkBinaryExists('kubectl');

  if (!awsExists) {
    result.missingBinaries.push('aws');
    log('AWS CLI not found in PATH');
  }

  if (!kubectlExists) {
    result.missingBinaries.push('kubectl');
    log('kubectl not found in PATH');
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  
  if (!workspaceFolders || workspaceFolders.length === 0) {
    result.errorMessage = 'No workspace folder is open. Please open a workspace to use this extension.';
    logError(result.errorMessage);
    return result;
  }

  if (workspaceFolders.length > 1) {
    result.errorMessage = 'Multi-root workspaces are not supported. Please open a single workspace folder.';
    logError(result.errorMessage);
    return result;
  }

  result.workspaceValid = true;
  result.workspaceRoot = workspaceFolders[0].uri.fsPath;

  try {
    const packageJsonUri = vscode.Uri.joinPath(workspaceFolders[0].uri, 'package.json');
    const packageJsonContent = await vscode.workspace.fs.readFile(packageJsonUri);
    const packageJson = JSON.parse(packageJsonContent.toString());

    if (!packageJson.name || typeof packageJson.name !== 'string') {
      result.errorMessage = 'package.json does not have a valid "name" property. Please add a service name to your package.json.';
      logError(result.errorMessage);
      return result;
    }

    result.packageJsonValid = true;
    result.serviceName = packageJson.name;
    log(`Found service name: ${result.serviceName}`);
  } catch (error: any) {
    result.errorMessage = `Failed to read or parse package.json: ${error.message}`;
    logError(result.errorMessage, error);
    return result;
  }

  result.allPresent = result.missingBinaries.length === 0 && 
                      result.workspaceValid && 
                      result.packageJsonValid;

  if (result.allPresent) {
    log('All prerequisites are satisfied');
  } else {
    log(`Prerequisites check failed. Missing binaries: ${result.missingBinaries.join(', ')}`);
  }

  return result;
}

export async function showPrerequisiteError(result: PrerequisiteCheckResult): Promise<void> {
  if (result.missingBinaries.length > 0) {
    const message = `Missing required binaries: ${result.missingBinaries.join(', ')}. Please install them to use this extension.`;
    const action = await vscode.window.showErrorMessage(message, 'Open Setup Guide');
    if (action === 'Open Setup Guide') {
      await vscode.commands.executeCommand('workbench.action.openWalkthrough', 'microservitors.vscode-extension-boilerplate#awsKubeSetup');
    }
  } else if (result.errorMessage) {
    const action = await vscode.window.showErrorMessage(result.errorMessage, 'Open Setup Guide');
    if (action === 'Open Setup Guide') {
      await vscode.commands.executeCommand('workbench.action.openWalkthrough', 'microservitors.vscode-extension-boilerplate#awsKubeSetup');
    }
  }
}
