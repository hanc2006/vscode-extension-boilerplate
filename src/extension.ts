import * as vscode from 'vscode';
import { initLogger, log, logError } from './utils/logger';
import { checkPrerequisites, showPrerequisiteError } from './utils/prerequisites';
import { AwsProfileStatusBar } from './features/statusBar';
import { fetchEnvFromKube } from './features/kubeCommands';
import { disposeKubectlExecutor } from './utils/terminal';

let statusBar: AwsProfileStatusBar | undefined;

export async function activate(context: vscode.ExtensionContext) {
  initLogger();
  log('AWS & Kubernetes Utilities extension is activating...');

  const prerequisites = await checkPrerequisites();

  if (!prerequisites.allPresent) {
    log('Prerequisites check failed, showing error to user');
    await showPrerequisiteError(prerequisites);
    
    const openWalkthroughCmd = vscode.commands.registerCommand(
      'aws-kube-utils.openSetupWalkthrough',
      async () => {
        await vscode.commands.executeCommand(
          'workbench.action.openWalkthrough',
          'microservitors.vscode-extension-boilerplate#awsKubeSetup'
        );
      }
    );
    context.subscriptions.push(openWalkthroughCmd);
    
    log('Extension activation completed with errors (prerequisites not met)');
    return;
  }

  log('All prerequisites satisfied, initializing extension features...');

  statusBar = new AwsProfileStatusBar(context);
  context.subscriptions.push(statusBar);
  log('Status bar initialized');

  const fetchEnvCmd = vscode.commands.registerCommand(
    'aws-kube-utils.fetchEnvFromKube',
    async (uri?: vscode.Uri) => {
      await fetchEnvFromKube(uri);
    }
  );
  context.subscriptions.push(fetchEnvCmd);
  log('Fetch Environment from Kube command registered');

  const switchProfileCmd = vscode.commands.registerCommand(
    'aws-kube-utils.switchAwsProfile',
    async () => {
      if (statusBar) {
        await statusBar.switchProfile();
      }
    }
  );
  context.subscriptions.push(switchProfileCmd);
  log('Switch AWS Profile command registered');

  const openWalkthroughCmd = vscode.commands.registerCommand(
    'aws-kube-utils.openSetupWalkthrough',
    async () => {
      await vscode.commands.executeCommand(
        'workbench.action.openWalkthrough',
        'microservitors.vscode-extension-boilerplate#awsKubeSetup'
      );
    }
  );
  context.subscriptions.push(openWalkthroughCmd);
  log('Open Setup Walkthrough command registered');

  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('awsKubeUtils')) {
      log('Configuration changed, refreshing status bar');
      if (statusBar) {
        statusBar.refresh();
      }
    }
  });

  log('AWS & Kubernetes Utilities extension activated successfully');
  vscode.window.showInformationMessage('AWS & Kubernetes Utilities extension is ready!');
}

export function deactivate() {
  log('AWS & Kubernetes Utilities extension is deactivating...');
  disposeKubectlExecutor();
  log('Extension deactivated');
}
