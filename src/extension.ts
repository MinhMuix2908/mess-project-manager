import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { ProjectProvider, ProjectItem } from "./ProjectProvider";
import { GitProjectProvider, GitProjectItem } from "./GitProjectProvider";
import { TerminalProvider } from "./TerminalProvider";
import { NotesProvider, NoteItem, SheetItem, HeaderItem } from "./NotesProvider";

export async function activate(context: vscode.ExtensionContext) {
  const storagePath = context.globalStorageUri.fsPath;
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }

  const configFile = path.join(storagePath, "projects.json");
  if (!fs.existsSync(configFile)) {
    fs.writeFileSync(configFile, JSON.stringify({ projects: [] }, null, 2));
  }

  // Create four providers - regular, categorized, git, and notes
  const allProjectsProvider = new ProjectProvider(context, "messProjectManagerTreeView", false);
  const categorizedProvider = new ProjectProvider(context, "messProjectManagerCategories", true);
  const gitProvider = new GitProjectProvider(context);
  const notesProvider = new NotesProvider(context);

  // Register tree data providers with drag and drop support
  vscode.window.createTreeView("messProjectManagerTreeView", {
    treeDataProvider: allProjectsProvider,
    dragAndDropController: allProjectsProvider
  });
  
  vscode.window.createTreeView("messProjectManagerCategories", {
    treeDataProvider: categorizedProvider,
    dragAndDropController: categorizedProvider
  });
  
  vscode.window.createTreeView("messProjectManagerGit", {
    treeDataProvider: gitProvider,
    dragAndDropController: gitProvider
  });
  
  vscode.window.createTreeView("messProjectManagerNotes", {
    treeDataProvider: notesProvider
  });

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
    gitProvider.refresh();
  });

  const refreshProjectsCommand = vscode.commands.registerCommand("messProjectManager.refreshProjects", () => {
    allProjectsProvider.refresh();
    categorizedProvider.refresh();
    gitProvider.refresh();
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
    // const wasShowing = categorizedProvider.getShowInactiveProjects();
    allProjectsProvider.toggleShowInactiveProjects();
    categorizedProvider.toggleShowInactiveProjects();
    gitProvider.toggleShowInactiveProjects();
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

  // 🔍 Search Projects Command
  const searchProjectsCommand = vscode.commands.registerCommand("messProjectManager.searchProjects", async () => {
    const searchTerm = await vscode.window.showInputBox({
      prompt: "Search projects by name or path",
      placeHolder: "Enter search term...",
      value: categorizedProvider.getSearchFilter()
    });

    if (searchTerm !== undefined) {
      allProjectsProvider.setSearchFilter(searchTerm);
      categorizedProvider.setSearchFilter(searchTerm);
      gitProvider.setSearchFilter(searchTerm);
      
      if (searchTerm) {
        vscode.window.showInformationMessage(`🔍 Filtering projects: "${searchTerm}"`);
      } else {
        vscode.window.showInformationMessage("🔍 Search filter cleared");
      }
    }
  });

  // ❌ Clear Search Command
  const clearSearchCommand = vscode.commands.registerCommand("messProjectManager.clearSearch", () => {
    allProjectsProvider.clearSearchFilter();
    categorizedProvider.clearSearchFilter();
    gitProvider.clearSearchFilter();
    vscode.window.showInformationMessage("🔍 Search filter cleared");
  });

  // 🔄 Refresh Git Projects Command
  const refreshGitProjectsCommand = vscode.commands.registerCommand("messProjectManager.refreshGitProjects", () => {
    gitProvider.refresh();
    vscode.window.showInformationMessage("🔄 Git projects refreshed");
  });

  // 📥 Clone Repository Command
  const cloneRepositoryCommand = vscode.commands.registerCommand("messProjectManager.cloneRepository", async () => {
    await gitProvider.cloneRepository();
  });

  // ⬇️ Git Pull Command
  const pullRepositoryCommand = vscode.commands.registerCommand("messProjectManager.pullRepository", async (projectItem: GitProjectItem) => {
    if (projectItem && projectItem instanceof GitProjectItem) {
      await gitProvider.pullRepository(projectItem);
    } else {
      vscode.window.showErrorMessage("⚠️ Please select a Git repository to pull from");
    }
  });

  // 📊 Show Git Status Command
  const showGitStatusCommand = vscode.commands.registerCommand("messProjectManager.showGitStatus", async (projectItem: GitProjectItem) => {
    if (projectItem && projectItem instanceof GitProjectItem) {
      await gitProvider.showGitStatus(projectItem);
    } else {
      vscode.window.showErrorMessage("⚠️ Please select a Git repository to show status for");
    }
  });

  // Terminal integration commands
  const terminalProvider = TerminalProvider.getInstance();

  // 🖥️ Terminal Menu Command
  const openTerminalMenuCommand = vscode.commands.registerCommand("messProjectManager.openTerminalMenu", async (projectItem: ProjectItem) => {
    const projectPath = projectItem.getFullPath();
    if (projectPath) {
      await terminalProvider.showTerminalSelectionMenu(projectPath, projectItem.label);
    } else {
      vscode.window.showErrorMessage("⚠️ No path available for this project");
    }
  });

  // 🖥️ Integrated Terminal Command
  const openIntegratedTerminalCommand = vscode.commands.registerCommand("messProjectManager.openIntegratedTerminal", async (projectItem: ProjectItem) => {
    const projectPath = projectItem.getFullPath();
    if (projectPath) {
      await terminalProvider.openIntegratedTerminal(projectPath, projectItem.label);
    } else {
      vscode.window.showErrorMessage("⚠️ No path available for this project");
    }
  });

  // 🔷 Command Prompt Command
  const openCommandPromptCommand = vscode.commands.registerCommand("messProjectManager.openCommandPrompt", async (projectItem: ProjectItem) => {
    const projectPath = projectItem.getFullPath();
    if (projectPath) {
      await terminalProvider.openSpecificTerminal({
        type: 'cmd',
        workingDirectory: projectPath,
        projectName: projectItem.label,
        admin: false
      });
    } else {
      vscode.window.showErrorMessage("⚠️ No path available for this project");
    }
  });

  // 🔷 Command Prompt (Admin) Command
  const openCommandPromptAdminCommand = vscode.commands.registerCommand("messProjectManager.openCommandPromptAdmin", async (projectItem: ProjectItem) => {
    const projectPath = projectItem.getFullPath();
    if (projectPath) {
      await terminalProvider.openSpecificTerminal({
        type: 'cmd',
        workingDirectory: projectPath,
        projectName: projectItem.label,
        admin: true
      });
    } else {
      vscode.window.showErrorMessage("⚠️ No path available for this project");
    }
  });

  // 💙 PowerShell Command
  const openPowerShellCommand = vscode.commands.registerCommand("messProjectManager.openPowerShell", async (projectItem: ProjectItem) => {
    const projectPath = projectItem.getFullPath();
    if (projectPath) {
      await terminalProvider.openSpecificTerminal({
        type: 'powershell',
        workingDirectory: projectPath,
        projectName: projectItem.label,
        admin: false
      });
    } else {
      vscode.window.showErrorMessage("⚠️ No path available for this project");
    }
  });

  // 💙 PowerShell (Admin) Command
  const openPowerShellAdminCommand = vscode.commands.registerCommand("messProjectManager.openPowerShellAdmin", async (projectItem: ProjectItem) => {
    const projectPath = projectItem.getFullPath();
    if (projectPath) {
      await terminalProvider.openSpecificTerminal({
        type: 'powershell',
        workingDirectory: projectPath,
        projectName: projectItem.label,
        admin: true
      });
    } else {
      vscode.window.showErrorMessage("⚠️ No path available for this project");
    }
  });

  // 🟢 Git Bash Command
  const openGitBashCommand = vscode.commands.registerCommand("messProjectManager.openGitBash", async (projectItem: ProjectItem) => {
    const projectPath = projectItem.getFullPath();
    if (projectPath) {
      await terminalProvider.openSpecificTerminal({
        type: 'git-bash',
        workingDirectory: projectPath,
        projectName: projectItem.label
      });
    } else {
      vscode.window.showErrorMessage("⚠️ No path available for this project");
    }
  });

  // Notes-related commands

  // 🔄 Refresh Notes Command
  const refreshNotesCommand = vscode.commands.registerCommand("messProjectManager.refreshNotes", () => {
    notesProvider.refresh();
    vscode.window.showInformationMessage("🔄 Notes refreshed");
  });

  // 📋 Copy Note Content Command
  const copyNoteContentCommand = vscode.commands.registerCommand("messProjectManager.copyNoteContent", async (noteItem: NoteItem) => {
    if (!noteItem) return;

    const note = noteItem.getNote();
    await vscode.env.clipboard.writeText(note.content);
    vscode.window.showInformationMessage(`📋 Copied "${note.title}" to clipboard`);
  });

  // ▶️ Run Command
  const runCommandCommand = vscode.commands.registerCommand("messProjectManager.runCommand", async (noteItem: NoteItem) => {
    if (!noteItem) return;

    const note = noteItem.getNote();
    if (note.type !== 'command') return;

    // Get current workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage("⚠️ No workspace folder found");
      return;
    }

    // Create a new terminal to run the command
    const terminal = vscode.window.createTerminal({
      name: `Run: ${note.title}`,
      cwd: workspaceFolder.uri.fsPath
    });

    terminal.show();
    terminal.sendText(note.content);
  });

  // 📁 Add Sheet Command
  const addSheetCommand = vscode.commands.registerCommand("messProjectManager.addSheet", async () => {
    const sheetName = await vscode.window.showInputBox({
      prompt: "Enter sheet name",
      placeHolder: "e.g., Work Commands, Personal Notes, etc."
    });

    if (!sheetName) return;

    notesProvider.addSheet(sheetName);
  });

  // 📝 Open Sheet Command
  const openSheetCommand = vscode.commands.registerCommand("messProjectManager.openSheet", async (sheetItem: SheetItem) => {
    if (!sheetItem) return;

    const sheet = sheetItem.getSheet();
    await notesProvider.openSheet(sheet.id);
  });

  // 🗑️ Delete Sheet Command
  const deleteSheetCommand = vscode.commands.registerCommand("messProjectManager.deleteSheet", async (sheetItem: SheetItem) => {
    if (!sheetItem) return;

    const sheet = sheetItem.getSheet();
    const totalItems = sheet.headers.reduce((total, header) => total + header.notes.length, 0);
    
    const confirmMessage = totalItems > 0 
      ? `Are you sure you want to delete sheet "${sheet.name}"? This will delete ${totalItems} items.`
      : `Are you sure you want to delete sheet "${sheet.name}"?`;

    const confirm = await vscode.window.showWarningMessage(
      confirmMessage,
      "Delete",
      "Cancel"
    );

    if (confirm === "Delete") {
      notesProvider.deleteSheet(sheet.id);
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
    searchProjectsCommand,
    clearSearchCommand,
    refreshGitProjectsCommand,
    cloneRepositoryCommand,
    pullRepositoryCommand,
    showGitStatusCommand,
    // Terminal commands
    openTerminalMenuCommand,
    openIntegratedTerminalCommand,
    openCommandPromptCommand,
    openCommandPromptAdminCommand,
    openPowerShellCommand,
    openPowerShellAdminCommand,
    openGitBashCommand,
    // Notes commands
    refreshNotesCommand,
    copyNoteContentCommand,
    runCommandCommand,
    addSheetCommand,
    openSheetCommand,
    deleteSheetCommand,
  );

  // 🔥 Watch file thay đổi -> refresh tree
  const watcher = vscode.workspace.createFileSystemWatcher(configFile);
  watcher.onDidChange(() => {
    allProjectsProvider.refresh();
    categorizedProvider.refresh();
    gitProvider.refresh();
  });
  watcher.onDidCreate(() => {
    allProjectsProvider.refresh();
    categorizedProvider.refresh();
    gitProvider.refresh();
  });
  watcher.onDidDelete(() => {
    allProjectsProvider.refresh();
    categorizedProvider.refresh();
    gitProvider.refresh();
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