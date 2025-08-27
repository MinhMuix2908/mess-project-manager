import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { ProjectProvider, ProjectItem } from "./ProjectProvider";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface GitInfo {
  branch: string;
  hasChanges: boolean;
  ahead: number;
  behind: number;
  remoteUrl?: string;
}

export class GitProjectItem extends ProjectItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    fullPath?: string,
    children: ProjectItem[] = [],
    active: boolean = true,
    category?: string,
    isCategory: boolean = false,
    favorite: boolean = false,
    projectType?: string,
    public readonly gitInfo?: GitInfo
  ) {
    super(label, collapsibleState, fullPath, children, active, category, isCategory, favorite, projectType);
    
    if (gitInfo && fullPath && children.length === 0) {
      this.updateWithGitInfo(gitInfo);
    }
  }

  private updateWithGitInfo(gitInfo: GitInfo) {
    // Update description with Git info
    if (this.description) {
      this.description += ` • ${gitInfo.branch}`;
      
      if (gitInfo.hasChanges) {
        this.description += " (*)";
      }
      
      if (gitInfo.ahead > 0 || gitInfo.behind > 0) {
        const aheadBehind = [];
        if (gitInfo.ahead > 0) aheadBehind.push(`↑${gitInfo.ahead}`);
        if (gitInfo.behind > 0) aheadBehind.push(`↓${gitInfo.behind}`);
        this.description += ` ${aheadBehind.join(' ')}`;
      }
    }

    // Update tooltip with Git info
    this.tooltip = `${this.fullPath || this.label}
Branch: ${gitInfo.branch}
${gitInfo.hasChanges ? 'Has uncommitted changes' : 'Clean working directory'}
${gitInfo.ahead > 0 ? `${gitInfo.ahead} commits ahead` : ''}
${gitInfo.behind > 0 ? `${gitInfo.behind} commits behind` : ''}
${gitInfo.remoteUrl ? `Remote: ${gitInfo.remoteUrl}` : 'No remote configured'}`.trim();

    // Note: Icon will be set by the GitProjectProvider based on project type and Git status
  }
}

export class GitProjectProvider extends ProjectProvider {
  constructor(context: vscode.ExtensionContext) {
    super(context, "messProjectManagerGit", false);
  }

  // Git Clone functionality
  async cloneRepository(): Promise<void> {
    const repoUrl = await vscode.window.showInputBox({
      prompt: "Enter Git repository URL to clone",
      placeHolder: "https://github.com/user/repo.git",
      validateInput: (value) => {
        if (!value) return "Repository URL is required";
        const gitUrlPattern = /^(https?:\/\/)|(git@)|(ssh:\/\/)/;
        if (!gitUrlPattern.test(value)) {
          return "Please enter a valid Git repository URL";
        }
        return null;
      }
    });

    if (!repoUrl) return;

    const folderUri = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      openLabel: "Select destination folder"
    });

    if (!folderUri || folderUri.length === 0) return;

    const destinationPath = folderUri[0].fsPath;
    const repoName = path.basename(repoUrl, '.git');
    const targetPath = path.join(destinationPath, repoName);

    try {
      vscode.window.showInformationMessage(`🔄 Cloning repository: ${repoName}...`);
      
      await execAsync(`git clone "${repoUrl}" "${targetPath}"`, {
        timeout: 20000
      });

      // Ask if user wants to add the cloned repository to projects
      const addToProjects = await vscode.window.showInformationMessage(
        `✅ Repository cloned successfully! Add "${repoName}" to your projects?`,
        "Add to Projects",
        "Open in New Window",
        "Cancel"
      );

      if (addToProjects === "Add to Projects") {
        await this.addClonedProjectToConfig(repoName, targetPath);
      } else if (addToProjects === "Open in New Window") {
        await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(targetPath), true);
      }

    } catch (error: any) {
      vscode.window.showErrorMessage(`❌ Failed to clone repository: ${error.message}`);
    }
  }

  private async addClonedProjectToConfig(name: string, projectPath: string): Promise<void> {
    const configFile = path.join(this.context.globalStorageUri.fsPath, "projects.json");
    
    try {
      const raw = fs.readFileSync(configFile, "utf-8");
      const config = JSON.parse(raw);
      
      if (!config.projects) config.projects = [];
      
      // Check if project already exists
      const existingProject = config.projects.find((p: any) => p.path === projectPath);
      if (existingProject) {
        vscode.window.showWarningMessage(`Project "${name}" already exists in your project list.`);
        return;
      }
      
      config.projects.push({ label: name, path: projectPath, active: true });
      fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
      
      // Refresh all views
      this.refresh();
      vscode.commands.executeCommand('messProjectManager.refreshProjects');
      
      vscode.window.showInformationMessage(`✅ Added "${name}" to your projects!`);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to add project to configuration: ${error.message}`);
    }
  }

  async getChildren(element?: ProjectItem): Promise<ProjectItem[]> {
    if (!element) {
      const gitProjects = await this.buildGitTree();
      return gitProjects;
    }
    return Promise.resolve(element.children);
  }

  private async buildGitTree(): Promise<ProjectItem[]> {
    const allProjects = this.getFilteredProjects();
    const gitProjects: GitProjectItem[] = [];

    // Process each project to check for Git repositories
    for (const project of allProjects) {
      if (await this.isGitRepository(project.path)) {
        const gitInfo = await this.getGitInfo(project.path);
        const projectType = this.detectProjectType(project.path);
        
        const gitItem = new GitProjectItem(
          project.label,
          vscode.TreeItemCollapsibleState.None,
          project.path,
          [],
          project.active,
          project.category,
          false,
          project.favorite || false,
          projectType,
          gitInfo
        );

        // Set custom icon based on project type and Git status
        const customIcon = this.getGitProjectIcon(projectType, project.favorite || false, gitInfo);
        gitItem.setCustomIcon(customIcon);

        gitProjects.push(gitItem);
      }
    }

    // Sort by repository status (dirty repos first, then by name)
    gitProjects.sort((a, b) => {
      if (a.gitInfo?.hasChanges && !b.gitInfo?.hasChanges) return -1;
      if (!a.gitInfo?.hasChanges && b.gitInfo?.hasChanges) return 1;
      return a.label.localeCompare(b.label);
    });

    return gitProjects;
  }

  private async isGitRepository(projectPath: string): Promise<boolean> {
    try {
      const gitPath = path.join(projectPath, '.git');
      const stats = fs.statSync(gitPath);
      return stats.isDirectory() || stats.isFile(); // .git can be a file in case of git worktrees
    } catch (error) {
      return false;
    }
  }

  private async getGitInfo(projectPath: string): Promise<GitInfo | undefined> {
    try {
      // Get current branch
      const { stdout: branchOutput } = await execAsync('git branch --show-current', { 
        cwd: projectPath,
        timeout: 5000
      });
      const branch = branchOutput.trim() || 'HEAD';

      // Check for uncommitted changes
      const { stdout: statusOutput } = await execAsync('git status --porcelain', { 
        cwd: projectPath,
        timeout: 5000
      });
      const hasChanges = statusOutput.trim().length > 0;

      // Get ahead/behind info
      let ahead = 0, behind = 0;
      try {
        const { stdout: aheadBehindOutput } = await execAsync('git rev-list --count --left-right @{upstream}...HEAD', { 
          cwd: projectPath,
          timeout: 5000
        });
        const match = aheadBehindOutput.trim().match(/(\d+)\s+(\d+)/);
        if (match) {
          behind = parseInt(match[1], 10);
          ahead = parseInt(match[2], 10);
        }
      } catch (error) {
        // No upstream branch configured
      }

      // Get remote URL
      let remoteUrl: string | undefined;
      try {
        const { stdout: remoteOutput } = await execAsync('git remote get-url origin', { 
          cwd: projectPath,
          timeout: 5000
        });
        remoteUrl = remoteOutput.trim();
      } catch (error) {
        // No remote configured
      }

      return {
        branch,
        hasChanges,
        ahead,
        behind,
        remoteUrl
      };
    } catch (error) {
      console.error(`Failed to get Git info for ${projectPath}:`, error);
      return undefined;
    }
  }

  // Git Pull functionality
  async pullRepository(projectItem: GitProjectItem): Promise<void> {
    const projectPath = projectItem.getFullPath();
    if (!projectPath || !await this.isGitRepository(projectPath)) {
      vscode.window.showErrorMessage("❌ Not a Git repository");
      return;
    }

    try {
      vscode.window.showInformationMessage(`🔄 Pulling latest changes for "${projectItem.label}"...`);
      
      const { stdout, stderr } = await execAsync('git pull', {
        cwd: projectPath,
        timeout: 60000 // 1 minute timeout
      });

      if (stderr && !stderr.includes('Already up to date')) {
        vscode.window.showWarningMessage(`⚠️ Git pull completed with warnings:\n${stderr}`);
      } else {
        vscode.window.showInformationMessage(`✅ "${projectItem.label}" updated successfully!`);
      }

      // Refresh Git view to show updated status
      this.refresh();

    } catch (error: any) {
      if (error.message.includes('Please commit your changes')) {
        vscode.window.showErrorMessage(`❌ Cannot pull: You have uncommitted changes in "${projectItem.label}". Please commit or stash your changes first.`);
      } else {
        vscode.window.showErrorMessage(`❌ Failed to pull "${projectItem.label}": ${error.message}`);
      }
    }
  }

  // Git Status functionality
  async showGitStatus(projectItem: GitProjectItem): Promise<void> {
    const projectPath = projectItem.getFullPath();
    if (!projectPath || !await this.isGitRepository(projectPath)) {
      vscode.window.showErrorMessage("❌ Not a Git repository");
      return;
    }

    try {
      const { stdout: statusOutput } = await execAsync('git status --porcelain', {
        cwd: projectPath,
        timeout: 10000
      });

      const { stdout: branchOutput } = await execAsync('git branch --show-current', {
        cwd: projectPath,
        timeout: 5000
      });

      const branch = branchOutput.trim() || 'HEAD';
      
      if (!statusOutput.trim()) {
        vscode.window.showInformationMessage(`✅ "${projectItem.label}" (${branch}): Working directory clean`);
        return;
      }

      // Parse git status output
      const lines = statusOutput.trim().split('\n');
      const changes = {
        modified: [] as string[],
        added: [] as string[],
        deleted: [] as string[],
        renamed: [] as string[],
        untracked: [] as string[]
      };

      lines.forEach(line => {
        const status = line.substring(0, 2);
        const file = line.substring(3);
        
        if (status.includes('M')) changes.modified.push(file);
        else if (status.includes('A')) changes.added.push(file);
        else if (status.includes('D')) changes.deleted.push(file);
        else if (status.includes('R')) changes.renamed.push(file);
        else if (status.includes('??')) changes.untracked.push(file);
      });

      // Build status message
      let statusMessage = `📊 Git Status for "${projectItem.label}" (${branch}):\n\n`;
      
      if (changes.modified.length > 0) {
        statusMessage += `📝 Modified (${changes.modified.length}): ${changes.modified.slice(0, 5).join(', ')}${changes.modified.length > 5 ? '...' : ''}\n`;
      }
      if (changes.added.length > 0) {
        statusMessage += `➕ Added (${changes.added.length}): ${changes.added.slice(0, 5).join(', ')}${changes.added.length > 5 ? '...' : ''}\n`;
      }
      if (changes.deleted.length > 0) {
        statusMessage += `❌ Deleted (${changes.deleted.length}): ${changes.deleted.slice(0, 5).join(', ')}${changes.deleted.length > 5 ? '...' : ''}\n`;
      }
      if (changes.renamed.length > 0) {
        statusMessage += `🔄 Renamed (${changes.renamed.length}): ${changes.renamed.slice(0, 5).join(', ')}${changes.renamed.length > 5 ? '...' : ''}\n`;
      }
      if (changes.untracked.length > 0) {
        statusMessage += `❓ Untracked (${changes.untracked.length}): ${changes.untracked.slice(0, 5).join(', ')}${changes.untracked.length > 5 ? '...' : ''}\n`;
      }

      // Show in information message or open in editor for detailed view
      const action = await vscode.window.showInformationMessage(
        statusMessage,
        "Open Git Panel",
        "Open in Terminal",
        "OK"
      );

      if (action === "Open Git Panel") {
        await vscode.commands.executeCommand('workbench.view.scm');
        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectPath), false);
      } else if (action === "Open in Terminal") {
        const terminal = vscode.window.createTerminal({
          name: `Git - ${projectItem.label}`,
          cwd: projectPath
        });
        terminal.show();
        terminal.sendText('git status');
      }

    } catch (error: any) {
      vscode.window.showErrorMessage(`❌ Failed to get Git status for "${projectItem.label}": ${error.message}`);
    }
  }

  // Custom icon method for Git view that combines project type with Git status
  private getGitProjectIcon(projectType: string, isFavorite: boolean = false, gitInfo?: GitInfo): vscode.ThemeIcon | { light: vscode.Uri; dark: vscode.Uri } {
    // If has uncommitted changes, show modified icon with warning color
    if (gitInfo?.hasChanges) {
      // For custom SVG icons, we can't easily overlay status, so use a modified theme icon
      const customIconTypes = ["react", "vue", "angular", "nodejs", "python", "java", "docker", "flutter", "go", "csharp", "php"];
      
      if (customIconTypes.includes(projectType)) {
        // Use the custom project type icon but with a warning decoration color
        const iconPath = path.join(this.context.extensionPath, "icons");
        return {
          light: vscode.Uri.file(path.join(iconPath, "light", `${projectType}.svg`)),
          dark: vscode.Uri.file(path.join(iconPath, "dark", `${projectType}.svg`))
        };
      } else {
        // Fall back to theme icon with warning color for non-custom types
        return new vscode.ThemeIcon("source-control-view-icon", new vscode.ThemeColor("gitDecoration.modifiedResourceForeground"));
      }
    }
    
    // If favorite, show star icon
    if (isFavorite) {
      return new vscode.ThemeIcon("star", new vscode.ThemeColor("gitDecoration.addedResourceForeground"));
    }

    // Otherwise, use the regular project type icon from parent class
    return this.getProjectIcon(projectType, false);
  }

  private getFilteredProjects() {
    // Get all projects from the parent class
    const filePath = path.join(this.context.globalStorageUri.fsPath, "projects.json");
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        let projects = parsed.projects || [];
        
        // Filter by active status
        if (!this.getShowInactiveProjects()) {
          projects = projects.filter((project: any) => project.active === true);
        }
        
        // Filter by search term
        const searchFilter = this.getSearchFilter();
        if (searchFilter) {
          projects = projects.filter((project: any) => {
            const nameMatch = project.label.toLowerCase().includes(searchFilter);
            const pathMatch = project.path.toLowerCase().includes(searchFilter);
            return nameMatch || pathMatch;
          });
        }
        
        return projects;
      } catch (e) {
        console.error("Failed to parse projects.json", e);
        return [];
      }
    } else {
      return [];
    }
  }
}