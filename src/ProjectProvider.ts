import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

interface ProjectEntry {
  label: string;
  path: string;
  active: boolean;
}

export class ProjectItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly fullPath?: string,
    public readonly children: ProjectItem[] = [],
    public readonly active: boolean = true
  ) {
    super(label, collapsibleState);
    this.contextValue = "projectItem"; 
    this.tooltip = this.fullPath || this.label;
    
    // console.log(`Creating ProjectItem: ${label}, active: ${active}, fullPath: ${fullPath}`);
    
    // Set description and visual styling for leaf nodes
    if (this.fullPath && children.length === 0) {
      this.description = this.fullPath;

      if (!this.active) {
        this.description += " (inactive)";
      } 
      this.iconPath = new vscode.ThemeIcon("folder", new vscode.ThemeColor("icon.foreground"));
    }
    
    // Set a notification command when users click directly on the item
    if (this.fullPath && children.length === 0) {
      this.command = {
        command: "messProjectManager.showClickNotification",
        title: "Click Notification",
        arguments: [this.label],
      };
    }
  }
  
  getFullPath() {
    return this.fullPath || "";
  }
}

export class ProjectProvider implements vscode.TreeDataProvider<ProjectItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ProjectItem | undefined | void> =
    new vscode.EventEmitter<ProjectItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<ProjectItem | undefined | void> =
    this._onDidChangeTreeData.event;

  private projects: ProjectEntry[] = [];
  private showInactiveProjects: boolean = false;

  constructor(private context: vscode.ExtensionContext) {
    this.loadProjects();
    this.loadShowInactiveProjects();
  }

  refresh(): void {
    this.loadProjects();
    this.loadShowInactiveProjects();
    this._onDidChangeTreeData.fire();
  }

  // Toggle show inactive projects
  toggleShowInactiveProjects(): void {
    this.showInactiveProjects = !this.showInactiveProjects;
    this.saveShowInactiveProjects();
    this.loadProjects();
    this._onDidChangeTreeData.fire();
  }

  getShowInactiveProjects(): boolean {
    return this.showInactiveProjects;
  }

  getTreeItem(element: ProjectItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ProjectItem): Thenable<ProjectItem[]> {
    if (!element) {
      return Promise.resolve(this.buildTree());
    }
    return Promise.resolve(element.children);
  }

  private loadProjects() {
    const filePath = path.join(this.context.globalStorageUri.fsPath, "projects.json");
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        this.projects = parsed.projects || [];
        if (!this.showInactiveProjects){
          this.projects = this.projects.filter(project => project.active == true)
        }
      } catch (e) {
        console.error("Failed to parse projects.json", e);
        this.projects = [];
      }
    } else {
      this.projects = [];
    }
  }

  private loadShowInactiveProjects() {
    // Load from VSCode settings
    const config = vscode.workspace.getConfiguration('messProjectManager');
    this.showInactiveProjects = config.get('showInactiveProjects', false);
  }

  private saveShowInactiveProjects() {
    // Save to VSCode settings
    const config = vscode.workspace.getConfiguration('messProjectManager');
    config.update('showInactiveProjects', this.showInactiveProjects, vscode.ConfigurationTarget.Global);
  }

  private buildTree(): ProjectItem[] {
    const root: any = {};

    for (const project of this.projects) {
      const parts = project.label.split(/[\\/]/); // phân tách theo "/" hoặc "\"
      let current = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (!current[part]) {
          current[part] = { __children: {}, __fullPath: i === parts.length - 1 ? project.path : undefined, __active: project.active };
        } else {
          current[part].__active = project.active;
          // nếu trùng label nhưng đây là leaf -> gán fullPath
          if (i === parts.length - 1) {
            current[part].__fullPath = project.path;
          }
        }
        current = current[part].__children;

      }
    }
// console.log(root);
    return this.convertToTreeItems(root);
  }

  private convertToTreeItems(node: any): ProjectItem[] {
    // console.log(node);
    return Object.entries(node).map(([name, value]: [string, any]) => {
      const children = this.convertToTreeItems(value.__children);
      const isActive = value.__active !== undefined ? value.__active : true;
      
      // console.log(`Converting to TreeItem: ${name}, active: ${isActive}, fullPath: ${value.__fullPath}`);
      
      return new ProjectItem(
        name,
        children.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
        value.__fullPath,
        children,
        isActive
      );
    });
  }
}