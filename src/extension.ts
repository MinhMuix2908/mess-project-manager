import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { ProjectProvider, ProjectItem } from "./ProjectProvider";

export async function activate(context: vscode.ExtensionContext) {
  const storagePath = context.globalStorageUri.fsPath;
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }

  const configFile = path.join(storagePath, "projects.json");
  if (!fs.existsSync(configFile)) {
    fs.writeFileSync(configFile, JSON.stringify({ projects: [] }, null, 2));
  }

  const projectProvider = new ProjectProvider(context);

  vscode.window.registerTreeDataProvider("messProjectManagerTreeView", projectProvider);

  // Register all commands
  const saveCurrentLocationCommand = vscode.commands.registerCommand("messProjectManager.saveCurrentLocation", async () => {
    const activeEditor = vscode.window.activeTextEditor;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    let targetPath: string | undefined;

    if (activeEditor) {
      targetPath = path.dirname(activeEditor.document.uri.fsPath);
    } else if (workspaceFolder) {
      targetPath = workspaceFolder.uri.fsPath;
    }

    if (!targetPath) {
      vscode.window.showWarningMessage("Không tìm thấy thư mục hoặc file hiện tại để lưu.");
      return;
    }

    const name = path.basename(targetPath);

    // đọc config
    const raw = fs.readFileSync(configFile, "utf-8");
    const config = JSON.parse(raw);

    if (!config.projects) config.projects = [];

    config.projects.push({ label: name, path: targetPath, active: true });

    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

    vscode.window.showInformationMessage(`✅ Đã lưu ${name} vào projects.json`);

    projectProvider.refresh();
  });

  const refreshProjectsCommand = vscode.commands.registerCommand("messProjectManager.refreshProjects", () => {
    projectProvider.refresh();
  });

  const editProjectsConfigCommand = vscode.commands.registerCommand("messProjectManager.editProjectsConfig", async () => {
    const doc = await vscode.workspace.openTextDocument(configFile);
    await vscode.window.showTextDocument(doc);
  });

  // 🎯 New Window Command - receives ProjectItem
  const openProjectNewWindowCommand = vscode.commands.registerCommand("messProjectManager.openProjectNewWindow", (projectItem: ProjectItem) => {
    const fullPath = projectItem.getFullPath();
    if (fullPath) {
      // console.log("Opening in new window:", projectItem.label, "at path:", fullPath);
      vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(fullPath), true);
    } else {
      vscode.window.showWarningMessage("No path available for this item");
    }
  });

  // 🎯 Current Window Command - receives ProjectItem
  const openProjectCurrentWindowCommand = vscode.commands.registerCommand("messProjectManager.openProjectCurrentWindow", (projectItem: ProjectItem) => {
    const fullPath = projectItem.getFullPath();
    if (fullPath) {
      // console.log("Opening in current window:", projectItem.label, "at path:", fullPath);
      vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(fullPath), false);
    } else {
      vscode.window.showWarningMessage("No path available for this item");
    }
  });

  // 🔔 Click Notification Command
  const showClickNotificationCommand = vscode.commands.registerCommand("messProjectManager.showClickNotification", (projectName: string) => {
    vscode.window.showInformationMessage(`Vui lòng ấn 2 nút bên phải thay vì click vào đây (${projectName})`);
  });

  // 👁️ Toggle Show Inactive Projects Command
  const toggleShowInactiveCommand = vscode.commands.registerCommand("messProjectManager.toggleShowInactive", () => {
    const wasShowing = projectProvider.getShowInactiveProjects();
    projectProvider.toggleShowInactiveProjects();
    const isNowShowing = projectProvider.getShowInactiveProjects();
    
    // console.log(`Toggle inactive projects: was ${wasShowing}, now ${isNowShowing}`);
    
    vscode.window.showInformationMessage(
      isNowShowing 
        ? "👁️ Hiển thị tất cả projects (bao gồm inactive)" 
        : "🔒 Chỉ hiển thị active projects"
    );
  });

  // Register all commands to context
  context.subscriptions.push(
    saveCurrentLocationCommand,
    refreshProjectsCommand,
    editProjectsConfigCommand,
    openProjectNewWindowCommand,
    openProjectCurrentWindowCommand,
    showClickNotificationCommand,
    toggleShowInactiveCommand,
  );

  // 🔥 Watch file thay đổi -> refresh tree
  const watcher = vscode.workspace.createFileSystemWatcher(configFile);
  watcher.onDidChange(() => projectProvider.refresh());
  watcher.onDidCreate(() => projectProvider.refresh());
  watcher.onDidDelete(() => projectProvider.refresh());
  context.subscriptions.push(watcher);
  
  // Watch for file saves and refresh tree
  const onSaveDisposable = vscode.workspace.onDidSaveTextDocument(doc => {
    if (doc.uri.fsPath === configFile) {
      projectProvider.refresh();
    }
  });
  
  context.subscriptions.push(onSaveDisposable);
}

export function deactivate() {}