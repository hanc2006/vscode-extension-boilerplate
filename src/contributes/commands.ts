import * as vscode from "vscode";
import * as path from "path";
import {
  writeEnvLocalFromK8sSecret,
  ServiceName,
  KUBE_NAMESPACES,
  environments,
  Environment,
} from "../libs/kube";
import { logger } from "../utils/logger";
import { PrerequisiteCheckResult } from "../utils/prerequisites";

export async function fetchEnvFromKube(
  prerequisites: PrerequisiteCheckResult
): Promise<void> {
  try {
    logger.info("Fetch Environment from Kube command triggered");

    const { workspaceRoot, serviceName } = prerequisites;

    if (!workspaceRoot || !serviceName) {
      vscode.window.showErrorMessage(
        "Prerequisites not satisfied. Please ensure workspace and package.json are valid."
      );
      return;
    }

    const allServices = Object.values(KUBE_NAMESPACES).flat();
    if (!allServices.includes(serviceName as ServiceName)) {
      vscode.window.showErrorMessage(
        `Service "${serviceName}" is not found in the Kubernetes namespaces configuration.`
      );
      return;
    }

    const selectedEnv = await vscode.window.showQuickPick([...environments], {
      placeHolder: "Select an environment",
      title: "Fetch Environment from Kubernetes",
    });

    if (!selectedEnv) {
      return;
    }

    const envFileName =
      selectedEnv === "test" ? ".env.local" : `.env.${selectedEnv}`;
    const envFilePath = path.join(
      workspaceRoot,
      "src",
      "Common",
      "Environment",
      envFileName
    );

    try {
      const envFileUri = vscode.Uri.file(envFilePath);
      await vscode.workspace.fs.stat(envFileUri);

      const action = await vscode.window.showWarningMessage(
        `File ${envFileName} already exists. Do you want to replace it?`,
        { modal: true },
        "Replace",
        "Skip"
      );

      if (action !== "Replace") {
        logger.info("User chose to skip overwriting existing file");
        return;
      }
    } catch (error) {}

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Fetching ${selectedEnv} environment from Kubernetes...`,
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({ message: "Connecting to Kubernetes cluster..." });

          const outputPath = await writeEnvLocalFromK8sSecret(
            serviceName as ServiceName,
            selectedEnv as Environment,
            workspaceRoot
          );

          progress.report({ message: "Environment file created successfully" });

          vscode.window
            .showInformationMessage(
              `Environment file created: ${envFileName}`,
              "Open File"
            )
            .then((action) => {
              if (action === "Open File") {
                vscode.workspace.openTextDocument(outputPath).then((doc) => {
                  vscode.window.showTextDocument(doc);
                });
              }
            });

          logger.info(`Successfully created environment file: ${outputPath}`);
        } catch (error: any) {
          vscode.window
            .showErrorMessage(
              `Failed to fetch environment: ${error.message}`,
              "View Logs"
            )
            .then((action) => {
              if (action === "View Logs") {
                logger.showOutput();
              }
            });
          logger.error("Failed to fetch environment from Kubernetes", error);
        }
      }
    );
  } catch (error: any) {
    vscode.window.showErrorMessage(`Error: ${error.message}`);
    logger.error("Error in fetchEnvFromKube command", error);
  }
}
