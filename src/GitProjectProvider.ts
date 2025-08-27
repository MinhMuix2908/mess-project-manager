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

    // Update icon to show Git status
    if (gitInfo.hasChanges) {
      this.iconPath = new vscode.ThemeIcon("source-control-view-icon", new vscode.ThemeColor("gitDecoration.modifiedResourceForeground"));
    } else {
      this.iconPath = new vscode.ThemeIcon("source-control", new vscode.ThemeColor("icon.foreground"));
    }
  }
}

export class GitProjectProvider extends ProjectProvider {
  constructor(context: vscode.ExtensionContext) {
    super(context, "messProjectManagerGit", false);
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

        // Set custom icon based on project type
        if (gitInfo && !gitInfo.hasChanges) {
          const customIcon = this.getProjectIcon(projectType, project.favorite || false);
          gitItem.setCustomIcon(customIcon);
        }

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