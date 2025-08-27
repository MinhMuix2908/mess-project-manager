import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { ProjectCategory } from "./types";

interface ProjectEntry {
  label: string;
  path: string;
  active: boolean;
  category?: string;
  favorite?: boolean;
}

export class ProjectItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly fullPath?: string,
    public readonly children: ProjectItem[] = [],
    public readonly active: boolean = true,
    public readonly category?: string,
    public readonly isCategory: boolean = false,
    public readonly favorite: boolean = false
  ) {
    super(label, collapsibleState);
    
    // Set context value based on item type
    if (this.isCategory) {
      this.contextValue = "categoryItem";
      this.iconPath = new vscode.ThemeIcon("folder", new vscode.ThemeColor("icon.foreground"));
    } else {
      this.contextValue = "projectItem";
    }
    
    this.tooltip = this.fullPath || this.label;
    
    // console.log(`Creating ProjectItem: ${label}, active: ${active}, fullPath: ${fullPath}`);
    
    // Set description and visual styling for leaf nodes
    if (this.fullPath && children.length === 0) {
      this.description = this.fullPath;

      if (!this.active) {
        this.description += " (inactive)";
      }
      
      if (this.category) {
        this.description += ` [${this.category}]`;
      }
      
      // if (this.favorite) {
      //   this.description += " ⭐";
      // }
      
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
  private categories: ProjectCategory[] = [];
  private showInactiveProjects: boolean = false;

  constructor(
    private context: vscode.ExtensionContext,
    private viewId: string = "messProjectManagerTreeView",
    private showCategories: boolean = true
  ) {
    this.loadProjects();
    if (this.showCategories) {
      this.loadCategories();
    }
    this.loadShowInactiveProjects();
  }

  refresh(): void {
    this.loadProjects();
    if (this.showCategories) {
      this.loadCategories();
    }
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

  getCategories(): ProjectCategory[] {
    return this.categories;
  }

  addCategory(category: ProjectCategory): void {
    this.categories.push(category);
    this.saveCategories();
    this.refresh();
  }

  removeCategory(categoryId: string): void {
    this.categories = this.categories.filter(c => c.id !== categoryId);
    // Remove category from all projects
    this.projects.forEach(p => {
      if (p.category === categoryId) {
        p.category = undefined;
      }
    });
    this.saveProjects();
    this.saveCategories();
    this.refresh();
  }

  assignProjectToCategory(projectPath: string, categoryId: string | undefined): void {
    const project = this.projects.find(p => p.path === projectPath);
    if (project) {
      project.category = categoryId;
      this.saveProjects();
      this.refresh();
    }
  }

  toggleProjectFavorite(projectPath: string): void {
    const project = this.projects.find(p => p.path === projectPath);
    if (project) {
      project.favorite = !project.favorite;
      this.saveProjects();
      this.refresh();
    }
  }

  private saveProjects(): void {
    const filePath = path.join(this.context.globalStorageUri.fsPath, "projects.json");
    const projectsData = { projects: this.projects };
    fs.writeFileSync(filePath, JSON.stringify(projectsData, null, 2));
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

  private loadCategories() {
    const filePath = path.join(this.context.globalStorageUri.fsPath, "categories.json");
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        this.categories = parsed.categories || [];
      } catch (e) {
        console.error("Failed to parse categories.json", e);
        this.categories = [];
      }
    } else {
      // Default categories
      this.categories = [
        // { id: "work", name: "Work", icon: "briefcase" },
        // { id: "personal", name: "Personal", icon: "home" },
        // { id: "learning", name: "Learning", icon: "mortar-board" }
      ];
      this.saveCategories();
    }
  }

  private saveCategories() {
    const filePath = path.join(this.context.globalStorageUri.fsPath, "categories.json");
    const categoriesData = { categories: this.categories };
    fs.writeFileSync(filePath, JSON.stringify(categoriesData, null, 2));
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
    if (!this.showCategories) {
      // Show flat list without categories
      return this.buildProjectTree(this.projects);
    }

    // Group projects by favorite and category
    const favoriteProjects: ProjectEntry[] = [];
    const categoryGroups: { [categoryId: string]: ProjectEntry[] } = {};
    const uncategorizedProjects: ProjectEntry[] = [];

    for (const project of this.projects) {
      if (project.favorite) {
        favoriteProjects.push(project);
      }
      
      if (project.category) {
        if (!categoryGroups[project.category]) {
          categoryGroups[project.category] = [];
        }
        categoryGroups[project.category].push(project);
      // } else if (!project.favorite) {
      //   // Only add to uncategorized if it's not a favorite
      //   uncategorizedProjects.push(project);
      // }
      } else {
        // Add to uncategorized even if it's a favorite
        uncategorizedProjects.push(project);
      }
    }

    const result: ProjectItem[] = [];

    // Add favorite projects first (if any)
    if (favoriteProjects.length > 0) {
      const favoriteChildren = this.buildProjectTree(favoriteProjects);
      const favoriteItem = new ProjectItem(
        "Favorite Projects",
        vscode.TreeItemCollapsibleState.Expanded,
        undefined,
        favoriteChildren,
        true,
        "favorites",
        true
      );
      favoriteItem.iconPath = new vscode.ThemeIcon("star-full");
      result.push(favoriteItem);
    }

    // Add categorized projects (excluding favorites already shown)
    for (const category of this.categories) {
      if (category.id === "favorite_projects") continue; // Skip the old favorite category
      
      const projectsInCategory = categoryGroups[category.id] || [];
      if (projectsInCategory.length > 0) {
        const categoryChildren = this.buildProjectTree(projectsInCategory);
        const categoryItem = new ProjectItem(
          category.name,
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
          categoryChildren,
          true,
          category.id,
          true
        );
        
        if (category.icon) {
          categoryItem.iconPath = new vscode.ThemeIcon(category.icon);
        }
        
        result.push(categoryItem);
      }
    }

    // Add uncategorized projects (excluding favorites)
    if (uncategorizedProjects.length > 0) {
      const uncategorizedChildren = this.buildProjectTree(uncategorizedProjects);
      const uncategorizedItem = new ProjectItem(
        "Uncategorized",
        vscode.TreeItemCollapsibleState.Expanded,
        undefined,
        uncategorizedChildren,
        true,
        undefined,
        true
      );
      uncategorizedItem.iconPath = new vscode.ThemeIcon("question");
      result.push(uncategorizedItem);
    }

    return result;
  }

  private buildProjectTree(projects: ProjectEntry[]): ProjectItem[] {
    const root: any = {};

    for (const project of projects) {
      const parts = project.label.split(/[\\/]/); // phân tách theo "/" hoặc "\"
      let current = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (!current[part]) {
          current[part] = { 
            __children: {}, 
            __fullPath: i === parts.length - 1 ? project.path : undefined, 
            __active: project.active,
            __category: project.category,
            __favorite: project.favorite || false
          };
        } else {
          current[part].__active = project.active;
          current[part].__category = project.category;
          current[part].__favorite = project.favorite || false;
          // nếu trùng label nhưng đây là leaf -> gán fullPath
          if (i === parts.length - 1) {
            current[part].__fullPath = project.path;
          }
        }
        current = current[part].__children;
      }
    }

    return this.convertToTreeItems(root);
  }

  private convertToTreeItems(node: any): ProjectItem[] {
    // console.log(node);
    return Object.entries(node).map(([name, value]: [string, any]) => {
      const children = this.convertToTreeItems(value.__children);
      const isActive = value.__active !== undefined ? value.__active : true;
      const category = value.__category;
      const favorite = value.__favorite || false;
      
      // console.log(`Converting to TreeItem: ${name}, active: ${isActive}, fullPath: ${value.__fullPath}`);
      
      return new ProjectItem(
        name,
        children.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
        value.__fullPath,
        children,
        isActive,
        category,
        false,
        favorite
      );
    });
  }
}