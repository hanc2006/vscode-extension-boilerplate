import * as vscode from 'vscode';
import * as path from 'path';

export function isWorkspaceValid(): boolean {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  return !!(workspaceFolders && workspaceFolders.length === 1);
}

export function getWorkspaceRoot(): string | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined;
  }
  return workspaceFolders[0].uri.fsPath;
}

export async function getServiceName(): Promise<string | undefined> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined;
  }

  try {
    const packageJsonUri = vscode.Uri.joinPath(workspaceFolders[0].uri, 'package.json');
    const packageJsonContent = await vscode.workspace.fs.readFile(packageJsonUri);
    const packageJson = JSON.parse(packageJsonContent.toString());
    return packageJson.name;
  } catch (error) {
    return undefined;
  }
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  const uri = vscode.Uri.file(filePath);
  const dirUri = vscode.Uri.file(path.dirname(filePath));
  
  await vscode.workspace.fs.createDirectory(dirUri);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
}
