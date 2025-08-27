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

  // Create two providers - one with categories, one without
  const allProjectsProvider = new ProjectProvider(context, "messProjectManagerTreeView", false);
  const categorizedProvider = new ProjectProvider(context, "messProjectManagerCategories", true);

  vscode.window.registerTreeDataProvider("messProjectManagerTreeView", allProjectsProvider);
  vscode.window.registerTreeDataProvider("messProjectManagerCategories", categorizedProvider);

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

    allProjectsProvider.refresh();
    categorizedProvider.refresh();
  });

  const refreshProjectsCommand = vscode.commands.registerCommand("messProjectManager.refreshProjects", () => {
    allProjectsProvider.refresh();
    categorizedProvider.refresh();
  });

  const editProjectsConfigCommand = vscode.commands.registerCommand("messProjectManager.editProjectsConfig", async () => {
    const doc = await vscode.workspace.openTextDocument(configFile);
    await vscode.window.showTextDocument(doc);
  });


  // File Explorer Window Command - receives ProjectItem
  const openFileExplorerWindowCommand = vscode.commands.registerCommand("messProjectManager.openFileExplorerWindow", async (projectItem: ProjectItem) => {
    const fullPath = projectItem.getFullPath();
    if (fullPath) {
      await vscode.env.openExternal(vscode.Uri.file(fullPath));
    } else {
      vscode.window.showWarningMessage("No path available for this item");
    }
  });
  
  // New Window Command - receives ProjectItem
  const openProjectNewWindowCommand = vscode.commands.registerCommand("messProjectManager.openProjectNewWindow", (projectItem: ProjectItem) => {
    const fullPath = projectItem.getFullPath();
    if (fullPath) {
      // console.log("Opening in new window:", projectItem.label, "at path:", fullPath);
      vscode.commands.executeCommand("vscode.env.openExternal", vscode.Uri.file(fullPath), true);
    } else {
      vscode.window.showWarningMessage("No path available for this item");
    }
  });

  // Current Window Command - receives ProjectItem
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
    vscode.window.showInformationMessage(`Please click on the function in the menu on the right. (${projectName})`);
  });

  // 👁️ Toggle Show Inactive Projects Command
  const toggleShowInactiveCommand = vscode.commands.registerCommand("messProjectManager.toggleShowInactive", () => {
    const wasShowing = categorizedProvider.getShowInactiveProjects();
    allProjectsProvider.toggleShowInactiveProjects();
    categorizedProvider.toggleShowInactiveProjects();
    const isNowShowing = categorizedProvider.getShowInactiveProjects();
    
    // console.log(`Toggle inactive projects: was ${wasShowing}, now ${isNowShowing}`);
    
    vscode.window.showInformationMessage(
      isNowShowing 
        ? "👁️ Show all projects (including inactive)" 
        : "🔒 Show only active projects"
    );
  });

  // 🏷️ Add Category Command
  const addCategoryCommand = vscode.commands.registerCommand("messProjectManager.addCategory", async () => {
    const categoryName = await vscode.window.showInputBox({
      prompt: "Enter category name",
      placeHolder: "e.g., Work, Personal, Learning"
    });

    if (!categoryName) return;

    const categoryId = categoryName.toLowerCase().replace(/\s+/g, '-');
    
    const iconOptions = [
      "briefcase", "home", "mortar-board", "code", "tools", 
      "heart", "folder", "project", "rocket"
    ];
    
    const selectedIcon = await vscode.window.showQuickPick(iconOptions, {
      placeHolder: "Select an icon for this category"
    });

    if (!selectedIcon) return;

    categorizedProvider.addCategory({
      id: categoryId,
      name: categoryName,
      icon: selectedIcon
    });

    vscode.window.showInformationMessage(`✅ Category "${categoryName}" added successfully!`);
  });

  // 🏷️ Assign Project to Category Command
  const assignCategoryCommand = vscode.commands.registerCommand("messProjectManager.assignCategory", async (projectItem: any) => {
    const categories = categorizedProvider.getCategories();
    
    const categoryOptions = [
      { label: "Uncategorized", id: undefined },
      ...categories.map(c => ({ label: c.name, id: c.id }))
    ];

    const selected = await vscode.window.showQuickPick(categoryOptions, {
      placeHolder: "Select a category for this project"
    });

    if (selected === undefined) return;

    const projectPath = projectItem.getFullPath();
    if (projectPath) {
      categorizedProvider.assignProjectToCategory(projectPath, selected.id);
      allProjectsProvider.refresh(); // Also refresh the flat view
      vscode.window.showInformationMessage(`✅ Project assigned to ${selected.label}`);
    }
  });

  // 🗑️ Remove Category Command
  const removeCategoryCommand = vscode.commands.registerCommand("messProjectManager.removeCategory", async () => {
    const categories = categorizedProvider.getCategories();
    
    if (categories.length === 0) {
      vscode.window.showInformationMessage("No categories to remove");
      return;
    }

    const categoryOptions = categories.map(c => ({ label: c.name, id: c.id }));

    const selected = await vscode.window.showQuickPick(categoryOptions, {
      placeHolder: "Select a category to remove"
    });

    if (!selected) return;

    const confirm = await vscode.window.showWarningMessage(
      `Are you sure you want to remove the "${selected.label}" category? Projects in this category will become uncategorized.`,
      "Remove",
      "Cancel"
    );

    if (confirm === "Remove") {
      categorizedProvider.removeCategory(selected.id);
      allProjectsProvider.refresh(); // Also refresh the flat view
      vscode.window.showInformationMessage(`✅ Category "${selected.label}" removed`);
    }
  });

  // ⭐ Toggle Favorite Command
  const toggleFavoriteCommand = vscode.commands.registerCommand("messProjectManager.toggleFavorite", async (projectItem: any) => {
    const projectPath = projectItem.getFullPath();
    if (projectPath) {
      categorizedProvider.toggleProjectFavorite(projectPath);
      allProjectsProvider.refresh(); // Also refresh the flat view
      
      const isFavorite = projectItem.favorite;
      vscode.window.showInformationMessage(
        isFavorite 
          ? `⭐ Added "${projectItem.label}" to favorites`
          : `Removed "${projectItem.label}" from favorites`
      );
    }
  });

  // Register all commands to context
  context.subscriptions.push(
    saveCurrentLocationCommand,
    refreshProjectsCommand,
    editProjectsConfigCommand,
    openFileExplorerWindowCommand,
    openProjectNewWindowCommand,
    openProjectCurrentWindowCommand,
    showClickNotificationCommand,
    toggleShowInactiveCommand,
    addCategoryCommand,
    assignCategoryCommand,
    removeCategoryCommand,
    toggleFavoriteCommand,
  );

  // 🔥 Watch file thay đổi -> refresh tree
  const watcher = vscode.workspace.createFileSystemWatcher(configFile);
  watcher.onDidChange(() => {
    allProjectsProvider.refresh();
    categorizedProvider.refresh();
  });
  watcher.onDidCreate(() => {
    allProjectsProvider.refresh();
    categorizedProvider.refresh();
  });
  watcher.onDidDelete(() => {
    allProjectsProvider.refresh();
    categorizedProvider.refresh();
  });
  context.subscriptions.push(watcher);
  
  // Watch for file saves and refresh tree
  const onSaveDisposable = vscode.workspace.onDidSaveTextDocument(doc => {
    if (doc.uri.fsPath === configFile) {
      allProjectsProvider.refresh();
      categorizedProvider.refresh();
    }
  });
  
  context.subscriptions.push(onSaveDisposable);
}

export function deactivate() {}