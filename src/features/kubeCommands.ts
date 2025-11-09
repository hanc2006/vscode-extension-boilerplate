import * as vscode from 'vscode';
import * as path from 'path';
import { writeEnvLocalFromK8sSecret, ServiceName, KUBE_NAMESPACES } from '../libs/kube';
import { log, logError } from '../utils/logger';

export async function fetchEnvFromKube(uri?: vscode.Uri): Promise<void> {
  try {
    log('Fetch Environment from Kube command triggered');

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace folder is open.');
      return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    if (uri) {
      const targetPath = uri.fsPath;
      const expectedPath = path.join(workspaceRoot, 'src', 'Common', 'Environment');
      
      if (!targetPath.endsWith(path.join('src', 'Common', 'Environment'))) {
        vscode.window.showWarningMessage('This command should be run on the src/Common/Environment folder.');
        return;
      }
    }

    const packageJsonUri = vscode.Uri.joinPath(workspaceFolders[0].uri, 'package.json');
    let serviceName: string;

    try {
      const packageJsonContent = await vscode.workspace.fs.readFile(packageJsonUri);
      const packageJson = JSON.parse(packageJsonContent.toString());
      serviceName = packageJson.name;

      if (!serviceName) {
        vscode.window.showErrorMessage('package.json does not have a "name" property.');
        return;
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to read package.json: ${error.message}`);
      logError('Failed to read package.json', error);
      return;
    }

    const allServices = Object.values(KUBE_NAMESPACES).flat();
    if (!allServices.includes(serviceName as ServiceName)) {
      vscode.window.showErrorMessage(`Service "${serviceName}" is not found in the Kubernetes namespaces configuration.`);
      return;
    }

    const environments: Array<'test' | 'integration' | 'preprod' | 'prod'> = ['test', 'integration', 'preprod', 'prod'];
    const selectedEnv = await vscode.window.showQuickPick(environments, {
      placeHolder: 'Select an environment',
      title: 'Fetch Environment from Kubernetes'
    });

    if (!selectedEnv) {
      return;
    }

    const envFileName = selectedEnv === 'test' ? '.env.local' : `.env.${selectedEnv}`;
    const envFilePath = path.join(workspaceRoot, 'src', 'Common', 'Environment', envFileName);

    try {
      const envFileUri = vscode.Uri.file(envFilePath);
      await vscode.workspace.fs.stat(envFileUri);
      
      const action = await vscode.window.showWarningMessage(
        `File ${envFileName} already exists. Do you want to replace it?`,
        { modal: true },
        'Replace',
        'Skip'
      );

      if (action !== 'Replace') {
        log('User chose to skip overwriting existing file');
        return;
      }
    } catch (error) {
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Fetching ${selectedEnv} environment from Kubernetes...`,
        cancellable: false
      },
      async (progress) => {
        try {
          progress.report({ message: 'Connecting to Kubernetes cluster...' });
          
          const outputPath = await writeEnvLocalFromK8sSecret(
            serviceName as ServiceName,
            selectedEnv as 'test' | 'integration' | 'preprod' | 'prod',
            workspaceRoot
          );

          progress.report({ message: 'Environment file created successfully' });
          
          vscode.window.showInformationMessage(
            `Environment file created: ${envFileName}`,
            'Open File'
          ).then(action => {
            if (action === 'Open File') {
              vscode.workspace.openTextDocument(outputPath).then(doc => {
                vscode.window.showTextDocument(doc);
              });
            }
          });

          log(`Successfully created environment file: ${outputPath}`);
        } catch (error: any) {
          vscode.window.showErrorMessage(
            `Failed to fetch environment: ${error.message}`,
            'View Logs'
          ).then(action => {
            if (action === 'View Logs') {
              vscode.commands.executeCommand('workbench.action.output.show');
            }
          });
          logError('Failed to fetch environment from Kubernetes', error);
        }
      }
    );
  } catch (error: any) {
    vscode.window.showErrorMessage(`Error: ${error.message}`);
    logError('Error in fetchEnvFromKube command', error);
  }
}
