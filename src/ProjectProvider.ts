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
    public readonly favorite: boolean = false,
    public readonly projectType?: string
  ) {
    super(label, collapsibleState);
    
    // Set context value based on item type
    if (this.isCategory) {
      this.contextValue = "categoryItem";
      this.iconPath = new vscode.ThemeIcon("folder", new vscode.ThemeColor("icon.foreground"));
    } else {
      this.contextValue = "projectItem";
      // Make project items draggable
      this.resourceUri = this.fullPath ? vscode.Uri.file(this.fullPath) : undefined;
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
      
      // Use custom icon based on project type - this will be set by the provider
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

  setCustomIcon(iconPath: vscode.ThemeIcon | { light: vscode.Uri; dark: vscode.Uri }) {
    this.iconPath = iconPath;
  }
}

export class ProjectProvider implements vscode.TreeDataProvider<ProjectItem>, vscode.TreeDragAndDropController<ProjectItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ProjectItem | undefined | void> =
    new vscode.EventEmitter<ProjectItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<ProjectItem | undefined | void> =
    this._onDidChangeTreeData.event;

  // Drag and drop support
  public readonly dragMimeTypes = ['application/vnd.code.tree.messProjectManager'];
  public readonly dropMimeTypes = ['application/vnd.code.tree.messProjectManager'];

  private projects: ProjectEntry[] = [];
  private categories: ProjectCategory[] = [];
  private showInactiveProjects: boolean = false;
  private searchFilter: string = "";

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

  setSearchFilter(filter: string): void {
    this.searchFilter = filter.toLowerCase();
    this.refresh();
  }

  getSearchFilter(): string {
    return this.searchFilter;
  }

  clearSearchFilter(): void {
    this.searchFilter = "";
    this.refresh();
  }

  private detectProjectType(projectPath: string): string {
    if (!fs.existsSync(projectPath)) {
      return "folder";
    }

    // Check for specific files/folders that indicate project type
    const files = fs.readdirSync(projectPath);

    // React/Next.js projects
    if (files.includes("package.json")) {
      try {
        const packageJsonPath = path.join(projectPath, "package.json");
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        
        // Check dependencies for React/Next.js
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        if (deps.react || deps["@types/react"]) {
          if (deps.next) return "react"; // Next.js uses React icon
          return "react";
        }
        
        // Vue.js
        if (deps.vue || deps["@vue/cli-service"]) return "vue";
        
        // Angular
        if (deps["@angular/core"]) return "angular";
        
        // Svelte
        if (deps.svelte) return "svelte";
        
        // Electron
        if (deps.electron) return "electron";
        
        // Express/Node.js server
        if (deps.express || deps.koa || deps.fastify) return "nodejs";
        
        // General Node.js project
        return "nodejs";
      } catch (e) {
        // If can't read package.json, still treat as Node.js
        return "nodejs";
      }
    }
    
    // Python projects
    if (files.includes("requirements.txt") || 
        files.includes("setup.py") || 
        files.includes("pyproject.toml") ||
        files.includes("Pipfile") ||
        files.some(f => f.endsWith(".py"))) {
      return "python";
    }
    
    // Java projects
    if (files.includes("pom.xml") || 
        files.includes("build.gradle") ||
        files.includes("build.gradle.kts") ||
        files.some(f => f.endsWith(".java"))) {
      return "java";
    }
    
    // C# projects
    if (files.some(f => f.endsWith(".csproj") || f.endsWith(".sln")) ||
        files.some(f => f.endsWith(".cs"))) {
      return "csharp";
    }
    
    // PHP projects
    if (files.includes("composer.json") || 
        files.some(f => f.endsWith(".php"))) {
      return "php";
    }
    
    // Ruby projects
    if (files.includes("Gemfile") || 
        files.some(f => f.endsWith(".rb"))) {
      return "ruby";
    }
    
    // Go projects
    if (files.includes("go.mod") || 
        files.some(f => f.endsWith(".go"))) {
      return "go";
    }
    
    // Flutter/Dart projects
    if (files.includes("pubspec.yaml") || 
        files.some(f => f.endsWith(".dart"))) {
      return "flutter";
    }
    
    // Unity projects
    if (files.includes("ProjectSettings") && files.includes("Assets")) {
      return "unity";
    }
    
    // Docker projects
    if (files.includes("Dockerfile") || files.includes("docker-compose.yml")) {
      return "docker";
    }
    
    // Git repositories
    if (files.includes(".git")) {
      return "git";
    }
    
    // Default folder icon
    return "folder";
  }

  private getProjectIcon(projectType: string, isFavorite: boolean = false): vscode.ThemeIcon | { light: vscode.Uri; dark: vscode.Uri } {
    if (isFavorite) {
      return new vscode.ThemeIcon("star");
    }

    // Custom SVG icons for better visual representation
    const customIconTypes = ["react", "vue", "angular", "nodejs", "python", "java", "docker", "flutter", "go", "csharp", "php"];
    
    if (customIconTypes.includes(projectType)) {
      const iconPath = path.join(this.context.extensionPath, "icons");
      return {
        light: vscode.Uri.file(path.join(iconPath, "light", `${projectType}.svg`)),
        dark: vscode.Uri.file(path.join(iconPath, "dark", `${projectType}.svg`))
      };
    }

    // Fallback to theme icons for other types
    const iconMap: { [key: string]: string } = {
      "svelte": "flame",
      "ruby": "ruby",
      "unity": "symbol-misc",
      "git": "source-control",
      "electron": "device-desktop",
      "folder": "folder"
    };

    const iconName = iconMap[projectType] || "folder";
    return new vscode.ThemeIcon(iconName, new vscode.ThemeColor("icon.foreground"));
  }

  // Drag and Drop Implementation
  public async handleDrag(source: ProjectItem[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
    // Only allow dragging actual projects (not categories)
    const draggableItems = source.filter(item => !item.isCategory && item.fullPath);
    if (draggableItems.length === 0) return;
    
    const dragData = draggableItems.map(item => ({
      label: item.label,
      path: item.fullPath,
      category: item.category,
      favorite: item.favorite,
      active: item.active
    }));
    
    dataTransfer.set('application/vnd.code.tree.messProjectManager', new vscode.DataTransferItem(JSON.stringify(dragData)));
  }

  public async handleDrop(target: ProjectItem | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
    const transferItem = dataTransfer.get('application/vnd.code.tree.messProjectManager');
    if (!transferItem) return;

    let dragData: any[];
    try {
      dragData = JSON.parse(transferItem.value as string);
    } catch (error) {
      console.error('Failed to parse drag data:', error);
      return;
    }

    // Handle different drop scenarios
    if (!target) {
      // Dropped on empty space - move to end of list
      this.moveProjectsToEnd(dragData);
    } else if (target.isCategory) {
      // Dropped on a category - assign to that category
      this.assignProjectsToCategory(dragData, target.category);
    } else {
      // Dropped on another project - reorder
      this.reorderProjects(dragData, target);
    }
  }

  private moveProjectsToEnd(draggedProjects: any[]): void {
    for (const draggedProject of draggedProjects) {
      const projectIndex = this.projects.findIndex(p => p.path === draggedProject.path);
      if (projectIndex !== -1) {
        const project = this.projects.splice(projectIndex, 1)[0];
        this.projects.push(project);
      }
    }
    this.saveProjects();
    this.refresh();
  }

  private assignProjectsToCategory(draggedProjects: any[], categoryId: string | undefined): void {
    for (const draggedProject of draggedProjects) {
      const project = this.projects.find(p => p.path === draggedProject.path);
      if (project) {
        project.category = categoryId;
      }
    }
    this.saveProjects();
    this.refresh();
    
    const categoryName = categoryId 
      ? this.categories.find(c => c.id === categoryId)?.name || categoryId
      : 'Uncategorized';
    
    vscode.window.showInformationMessage(
      `✅ ${draggedProjects.length} project(s) moved to ${categoryName}`
    );
  }

  private reorderProjects(draggedProjects: any[], targetProject: ProjectItem): void {
    const targetIndex = this.projects.findIndex(p => p.path === targetProject.fullPath);
    if (targetIndex === -1) return;

    // Remove dragged projects from their current positions
    const movedProjects: ProjectEntry[] = [];
    for (const draggedProject of draggedProjects) {
      const projectIndex = this.projects.findIndex(p => p.path === draggedProject.path);
      if (projectIndex !== -1) {
        movedProjects.push(this.projects.splice(projectIndex, 1)[0]);
      }
    }

    // Insert at target position
    const newTargetIndex = this.projects.findIndex(p => p.path === targetProject.fullPath);
    this.projects.splice(newTargetIndex, 0, ...movedProjects);

    this.saveProjects();
    this.refresh();
    
    // vscode.window.showInformationMessage(
    //   `✅ Reordered ${draggedProjects.length} project(s)`
    // );
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
        let projects = parsed.projects || [];
        
        // Filter by active status
        if (!this.showInactiveProjects){
          projects = projects.filter((project: ProjectEntry) => project.active == true);
        }
        
        // Filter by search term
        if (this.searchFilter) {
          projects = projects.filter((project: ProjectEntry) => {
            const nameMatch = project.label.toLowerCase().includes(this.searchFilter);
            const pathMatch = project.path.toLowerCase().includes(this.searchFilter);
            return nameMatch || pathMatch;
          });
        }
        
        this.projects = projects;
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
      favoriteItem.iconPath = new vscode.ThemeIcon("star");
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
      
      // Detect project type for leaf nodes (actual projects)
      let projectType = "folder";
      if (value.__fullPath && children.length === 0) {
        projectType = this.detectProjectType(value.__fullPath);
      }
      
      // console.log(`Converting to TreeItem: ${name}, active: ${isActive}, fullPath: ${value.__fullPath}, type: ${projectType}`);
      
      const projectItem = new ProjectItem(
        name,
        children.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
        value.__fullPath,
        children,
        isActive,
        category,
        false,
        favorite,
        projectType
      );

      // Set custom icon based on project type
      if (value.__fullPath && children.length === 0) {
        const customIcon = this.getProjectIcon(projectType, favorite);
        projectItem.setCustomIcon(customIcon);
      }
      
      return projectItem;
    });
  }
}