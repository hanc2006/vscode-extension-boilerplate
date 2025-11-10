import * as vscode from "vscode";
import { lookpath } from "lookpath";
import { logger } from "./logger";
import {
  isWorkspaceValid,
  getWorkspaceRoot,
  getServiceName,
} from "./workspace";

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
    packageJsonValid: false,
  };

  logger.info("Checking prerequisites...");

  const awsPath = await lookpath("aws");
  const kubectlPath = await lookpath("kubectl");

  if (!awsPath) {
    result.missingBinaries.push("aws");
    logger.info("AWS CLI not found in PATH");
  }

  if (!kubectlPath) {
    result.missingBinaries.push("kubectl");
    logger.info("kubectl not found in PATH");
  }

  if (!isWorkspaceValid()) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      result.errorMessage =
        "No workspace folder is open. Please open a workspace to use this extension.";
    } else {
      result.errorMessage =
        "Multi-root workspaces are not supported. Please open a single workspace folder.";
    }
    logger.error(result.errorMessage);
    return result;
  }

  result.workspaceValid = true;
  result.workspaceRoot = getWorkspaceRoot();

  const serviceName = await getServiceName();
  if (!serviceName) {
    result.errorMessage =
      'Failed to read package.json or package.json does not have a valid "name" property.';
    logger.error(result.errorMessage);
    return result;
  }

  result.packageJsonValid = true;
  result.serviceName = serviceName;
  logger.info(`Found service name: ${result.serviceName}`);

  result.allPresent =
    result.missingBinaries.length === 0 &&
    result.workspaceValid &&
    result.packageJsonValid;

  if (result.allPresent) {
    logger.info("All prerequisites are satisfied");
  } else {
    logger.info(
      `Prerequisites check failed. Missing binaries: ${result.missingBinaries.join(
        ", "
      )}`
    );
  }

  return result;
}

export async function showPrerequisiteError(
  result: PrerequisiteCheckResult
): Promise<void> {
  if (result.missingBinaries.length > 0) {
    const message = `Missing required binaries: ${result.missingBinaries.join(
      ", "
    )}. Please install them to use this extension.`;
    const action = await vscode.window.showErrorMessage(
      message,
      "Open Setup Guide"
    );
    if (action === "Open Setup Guide") {
      await vscode.commands.executeCommand(
        "workbench.action.openWalkthrough",
        "microservitors.vscode-extension-boilerplate#awsKubeSetup"
      );
    }
  } else if (result.errorMessage) {
    const action = await vscode.window.showErrorMessage(
      result.errorMessage,
      "Open Setup Guide"
    );
    if (action === "Open Setup Guide") {
      await vscode.commands.executeCommand(
        "workbench.action.openWalkthrough",
        "microservitors.vscode-extension-boilerplate#awsKubeSetup"
      );
    }
  }
}
