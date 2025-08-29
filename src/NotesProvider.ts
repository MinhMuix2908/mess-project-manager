import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export interface Note {
  id: string;
  title: string;
  content: string;
  type: 'command' | 'note';
  createdAt: string;
  tags: string[];
  sheetName: string;
  headerName?: string;
  description?: string;
}

export interface Sheet {
  name: string;
  id: string;
  filePath: string;
  content: string; // Raw text content of the sheet
  headers: Header[]; // Parsed structure from content
}

export interface Header {
  name: string;
  id: string;
  notes: Note[];
}

export class SheetItem extends vscode.TreeItem {
  constructor(
    public readonly sheet: Sheet,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(sheet.name, collapsibleState);

    this.tooltip = `Sheet: ${sheet.name}`;
    this.description = `${this.getItemCount()} items`;
    this.iconPath = new vscode.ThemeIcon('folder');
    this.contextValue = 'sheetItem';
  }

  private getItemCount(): number {
    return this.sheet.headers.reduce((total, header) => total + header.notes.length, 0);
  }

  getSheet(): Sheet {
    return this.sheet;
  }
}

export class HeaderItem extends vscode.TreeItem {
  constructor(
    public readonly header: Header,
    public readonly sheetName: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(header.name, collapsibleState);

    this.tooltip = `Header: ${header.name}`;
    this.description = `${header.notes.length} items`;
    this.iconPath = new vscode.ThemeIcon('symbol-class');
    this.contextValue = 'headerItem';
  }

  getHeader(): Header {
    return this.header;
  }

  getSheetName(): string {
    return this.sheetName;
  }
}

export class NoteItem extends vscode.TreeItem {
  constructor(
    public readonly note: Note,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(note.title, collapsibleState);

    this.tooltip = `${note.type.toUpperCase()}: ${note.content}${note.description ? ' - ' + note.description : ''}`;
    
    // Show description if available, otherwise fall back to generic type
    if (note.description && note.description.length > 0) {
      this.description = note.description;
    } else {
      this.description = note.type === 'command' ? 'Command' : 'Note';
    }
    
    // Set icons based on type
    this.iconPath = new vscode.ThemeIcon(
      note.type === 'command' ? 'terminal' : 'note'
    );

    // Set context value for menus
    this.contextValue = note.type === 'command' ? 'commandItem' : 'noteItem';
    
    // Make items non-collapsible since they don't have children
    this.collapsibleState = vscode.TreeItemCollapsibleState.None;
  }

  getNote(): Note {
    return this.note;
  }
}

type TreeItem = SheetItem | HeaderItem | NoteItem;

export class NotesProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private sheets: Sheet[] = [];
  private searchFilter: string = "";
  private sheetsFolder: string;

  constructor(private context: vscode.ExtensionContext) {
    const storagePath = context.globalStorageUri.fsPath;
    this.sheetsFolder = path.join(storagePath, "sheets");
    
    // Ensure sheets folder exists
    if (!fs.existsSync(this.sheetsFolder)) {
      fs.mkdirSync(this.sheetsFolder, { recursive: true });
    }
    
    this.loadSheets();
  }

  private loadSheets(): void {
    try {
      this.sheets = [];
      
      // Always ensure Useful Tips sheet exists and is up-to-date on every startup
      this.createOrUpdateUsefulTipsSheet();
      
      // Scan the sheets folder for other .txt files
      if (fs.existsSync(this.sheetsFolder)) {
        const files = fs.readdirSync(this.sheetsFolder);
        
        for (const file of files) {
          if (file.endsWith('.txt') && file !== 'useful-tips.txt') { // Skip useful-tips.txt as it's already handled
            const filePath = path.join(this.sheetsFolder, file);
            try {
              const content = fs.readFileSync(filePath, 'utf8');
              const lines = content.split('\n');
              const sheetName = lines[0]?.trim() || file.replace('.txt', '');
              const id = file.replace('.txt', '');
              
              const sheet: Sheet = {
                name: sheetName,
                id: id,
                filePath: filePath,
                content: content,
                headers: []
              };
              
              // Parse the content to populate headers
              sheet.headers = this.parseSheetContent(content);
              this.updateSheetNameInNotes(sheet);
              
              this.sheets.push(sheet);
            } catch (error) {
              console.error(`Error loading sheet file ${file}:`, error);
            }
          }
        }
      }
      
      // Sort sheets to ensure Useful Tips is always first
      this.sheets.sort((a, b) => {
        if (a.id === 'useful-tips') return -1;
        if (b.id === 'useful-tips') return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error("Error loading sheets:", error);
      this.createOrUpdateUsefulTipsSheet();
    }
  }

  private createOrUpdateUsefulTipsSheet(): void {
    const usefulTipsContent = `Useful Tips\n\n    Git Commands\n        > git status # Check repository status and changes\n        > git add . # Stage all changes for commit\n        > git add filename # Stage specific file for commit\n        > git commit -m "your message" # Commit staged changes with message\n        > git commit --amend # Modify the last commit\n        > git push # Push commits to remote repository\n        > git push -u origin branch-name # Push new branch to remote\n        > git pull # Fetch and merge changes from remote\n        > git fetch # Download changes without merging\n        > git branch -a # List all branches (local and remote)\n        > git branch -d branch-name # Delete local branch\n        > git checkout -b new-branch # Create and switch to new branch\n        > git checkout branch-name # Switch to existing branch\n        > git merge branch-name # Merge specified branch into current\n        > git rebase main # Rebase current branch onto main\n        > git log --oneline # View commit history in compact format\n        > git log --graph # View commit history with branch graph\n        > git reset --hard HEAD # Discard all local changes\n        > git reset --soft HEAD~1 # Undo last commit, keep changes staged\n        > git stash # Temporarily save current changes\n        > git stash pop # Restore previously stashed changes\n        > git diff # Show unstaged changes\n        > git diff --staged # Show staged changes\n        > git tag v1.0.0 # Create a new tag\n        > git clone repo-url # Clone remote repository\n\n    NPM/Yarn Commands\n        > npm install # Install all dependencies from package.json\n        > npm install package-name # Install specific package\n        > npm install -g package-name # Install package globally\n        > npm install --save-dev package-name # Install as dev dependency\n        > npm uninstall package-name # Remove package\n        > npm update # Update all packages to latest versions\n        > npm run start # Start the application\n        > npm run build # Build the project for production\n        > npm run test # Run test suite\n        > npm run dev # Start development server\n        > npm run lint # Run linting checks\n        > npm audit # Check for security vulnerabilities\n        > npm audit fix # Fix security vulnerabilities automatically\n        > npm list # Show installed packages tree\n        > npm outdated # Check for outdated packages\n        > yarn install # Install dependencies using Yarn\n        > yarn add package-name # Add package with Yarn\n        > yarn remove package-name # Remove package with Yarn\n        > yarn start # Start application with Yarn\n        > yarn build # Build project with Yarn\n        > yarn test # Run tests with Yarn\n        > npx command # Run package without installing globally\n\n    Docker Commands\n        > docker ps # List running containers\n        > docker ps -a # List all containers (running and stopped)\n        > docker images # List all Docker images\n        > docker build -t image-name . # Build image from Dockerfile\n        > docker run -d -p 8080:80 image-name # Run container in background\n        > docker run -it image-name bash # Run container interactively\n        > docker stop container-name # Stop running container\n        > docker start container-name # Start stopped container\n        > docker restart container-name # Restart container\n        > docker rm container-name # Remove container\n        > docker rmi image-name # Remove Docker image\n        > docker logs container-name # View container logs\n        > docker logs -f container-name # Follow container logs in real-time\n        > docker exec -it container-name bash # Execute command in running container\n        > docker-compose up # Start services defined in docker-compose.yml\n        > docker-compose up -d # Start services in background\n        > docker-compose down # Stop and remove all services\n        > docker-compose build # Build all services\n        > docker-compose logs # View logs from all services\n        > docker system prune # Remove unused containers, images, networks\n\n    System Commands (Linux/Mac)\n        > ls -la # List all files with detailed information\n        > ls -lh # List files with human-readable file sizes\n        > cd .. # Go to parent directory\n        > cd ~ # Go to home directory\n        > pwd # Show current directory path\n        > mkdir folder-name # Create new directory\n        > mkdir -p path/to/folder # Create nested directories\n        > rmdir folder-name # Remove empty directory\n        > rm -rf folder-name # Remove directory and all contents\n        > cp file1.txt file2.txt # Copy file\n        > cp -r folder1 folder2 # Copy directory recursively\n        > mv oldname.txt newname.txt # Move/rename file\n        > chmod +x script.sh # Make file executable\n        > chmod 755 file.txt # Set specific permissions\n        > chown user:group file.txt # Change file ownership\n        > find . -name "*.txt" # Find files by name pattern\n        > grep "search-term" file.txt # Search for text in file\n        > grep -r "search-term" . # Search recursively in directory\n        > ps aux # Show running processes\n        > top # Show running processes with resource usage\n        > htop # Enhanced process viewer (if installed)\n        > kill -9 process-id # Force kill process by ID\n        > killall process-name # Kill all processes by name\n        > df -h # Show disk usage\n        > du -sh folder # Show directory size\n        > free -h # Show memory usage\n        > which command # Show path to command\n        > wget url # Download file from URL\n        > curl -O url # Download file with curl\n        > tar -czf archive.tar.gz folder/ # Create compressed archive\n        > tar -xzf archive.tar.gz # Extract compressed archive\n        > ssh user@server # Connect to remote server via SSH\n        > scp file.txt user@server:/path # Copy file to remote server\n\n    Windows Commands\n        > dir # List directory contents\n        > cd .. # Go to parent directory\n        > cd \\ # Go to root directory\n        > md folder-name # Create directory\n        > rd /s folder-name # Remove directory and contents\n        > copy file1.txt file2.txt # Copy file\n        > move oldname.txt newname.txt # Move/rename file\n        > del file.txt # Delete file\n        > type file.txt # Display file contents\n        > find "search-term" file.txt # Search for text in file\n        > tasklist # Show running processes\n        > taskkill /pid process-id # Kill process by ID\n        > taskkill /im process-name.exe # Kill process by name\n        > ipconfig # Show network configuration\n        > ping google.com # Test network connectivity\n        > netstat -an # Show network connections\n\n    Python Commands\n        > python --version # Check Python version\n        > python script.py # Run Python script\n        > python -m pip install package # Install Python package\n        > python -m pip list # List installed packages\n        > python -m pip freeze > requirements.txt # Export dependencies\n        > python -m pip install -r requirements.txt # Install from requirements\n        > python -m venv env # Create virtual environment\n        > source env/bin/activate # Activate virtual environment (Linux/Mac)\n        > env\\Scripts\\activate # Activate virtual environment (Windows)\n        > deactivate # Deactivate virtual environment\n        > python -m pytest # Run tests with pytest\n        > python -m http.server 8000 # Start simple HTTP server\n\n    Database Commands\n        > psql -U username -d database # Connect to PostgreSQL\n        > mysql -u username -p database # Connect to MySQL\n        > mongosh # Connect to MongoDB shell\n        > redis-cli # Connect to Redis CLI\n        > sqlite3 database.db # Open SQLite database\n\n    Development Notes\n        Keep dependencies up to date regularly # Security and performance benefits\n        Use semantic versioning (major.minor.patch) # Clear version communication\n        Always test before pushing to main branch # Prevent breaking production\n        Commit frequently with meaningful messages # Better project history\n        Document your code and APIs thoroughly # Help future developers\n        Use environment variables for configuration # Keep secrets secure\n        Follow coding standards and best practices # Maintain code quality\n        Backup your work regularly # Prevent data loss\n        Use version control for all projects # Track changes and collaborate\n        Review code before merging # Catch bugs and improve quality\n        Set up CI/CD pipelines # Automate testing and deployment\n        Monitor application performance # Identify issues early\n        Use linting tools and formatters # Consistent code style\n        Write unit and integration tests # Ensure code reliability\n        Keep production and development environments separate # Avoid conflicts\n\n    Useful Links\n        GitHub documentation: https://docs.github.com # Git and GitHub help\n        NPM registry: https://www.npmjs.com # JavaScript package repository\n        Docker Hub: https://hub.docker.com # Container image registry\n        Stack Overflow: https://stackoverflow.com # Programming Q&A community\n        MDN Web Docs: https://developer.mozilla.org # Web development reference\n        VS Code Marketplace: https://marketplace.visualstudio.com # Editor extensions\n        Can I Use: https://caniuse.com # Browser compatibility checker\n        Regex101: https://regex101.com # Regular expression tester\n        JSON Formatter: https://jsonformatter.org # JSON validation and formatting\n        Base64 Encode/Decode: https://www.base64encode.org # Base64 utilities`;
    
    const filePath = path.join(this.sheetsFolder, "useful-tips.txt");
    
    try {
      // Always overwrite the Useful Tips sheet with default content
      fs.writeFileSync(filePath, usefulTipsContent, 'utf8');
      
      const sheet: Sheet = {
        name: "Useful Tips",
        id: "useful-tips",
        filePath: filePath,
        content: usefulTipsContent,
        headers: []
      };
      
      // Parse the default content
      sheet.headers = this.parseSheetContent(sheet.content);
      this.updateSheetNameInNotes(sheet);
      
      // Insert at beginning to ensure it's always at the top
      const existingIndex = this.sheets.findIndex(s => s.id === "useful-tips");
      if (existingIndex !== -1) {
        this.sheets[existingIndex] = sheet;
      } else {
        this.sheets.unshift(sheet);
      }
    } catch (error) {
      console.error('Error creating/updating Useful Tips sheet:', error);
    }
  }

  private createDefaultSheet(): void {
    // This method is now only called if no sheets exist at all
    // It will create the Useful Tips sheet
    this.createOrUpdateUsefulTipsSheet();
  }

  refresh(): void {
    this.loadSheets();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeItem): Thenable<TreeItem[]> {
    if (!element) {
      // Return root level items (sheets)
      let filteredSheets = this.sheets;

      // Apply search filter if exists
      if (this.searchFilter) {
        filteredSheets = this.sheets.filter(sheet => this.sheetMatchesSearch(sheet));
      }

      return Promise.resolve(filteredSheets.map(sheet => 
        new SheetItem(sheet, vscode.TreeItemCollapsibleState.Collapsed)
      ));
    }

    if (element instanceof SheetItem) {
      // Return headers for this sheet
      const sheet = element.getSheet();
      let filteredHeaders = sheet.headers;

      if (this.searchFilter) {
        filteredHeaders = sheet.headers.filter(header => this.headerMatchesSearch(header));
      }

      return Promise.resolve(filteredHeaders.map(header => 
        new HeaderItem(header, sheet.name, vscode.TreeItemCollapsibleState.Collapsed)
      ));
    }

    if (element instanceof HeaderItem) {
      // Return notes for this header
      const header = element.getHeader();
      let filteredNotes = header.notes;

      if (this.searchFilter) {
        const filter = this.searchFilter.toLowerCase();
        filteredNotes = header.notes.filter(note =>
          note.title.toLowerCase().includes(filter) ||
          note.content.toLowerCase().includes(filter) ||
          note.tags.some(tag => tag.toLowerCase().includes(filter))
        );
      }

      // Sort by creation date (newest first)
      filteredNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return Promise.resolve(filteredNotes.map(note => 
        new NoteItem(note, vscode.TreeItemCollapsibleState.None)
      ));
    }

    return Promise.resolve([]);
  }

  private sheetMatchesSearch(sheet: Sheet): boolean {
    const filter = this.searchFilter.toLowerCase();
    
    // Check sheet name
    if (sheet.name.toLowerCase().includes(filter)) {
      return true;
    }

    // Check if any header or note in this sheet matches
    return sheet.headers.some(header => this.headerMatchesSearch(header));
  }

  private headerMatchesSearch(header: Header): boolean {
    const filter = this.searchFilter.toLowerCase();
    
    // Check header name
    if (header.name.toLowerCase().includes(filter)) {
      return true;
    }

    // Check if any note in this header matches
    return header.notes.some(note =>
      note.title.toLowerCase().includes(filter) ||
      note.content.toLowerCase().includes(filter) ||
      note.tags.some(tag => tag.toLowerCase().includes(filter))
    );
  }

  // Note access methods
  getNote(id: string): Note | undefined {
    return this.findNoteById(id);
  }

  private findNoteById(id: string): Note | undefined {
    for (const sheet of this.sheets) {
      for (const header of sheet.headers) {
        const note = header.notes.find(note => note.id === id);
        if (note) {
          return note;
        }
      }
    }
    return undefined;
  }

  getAllNotes(): Note[] {
    const allNotes: Note[] = [];
    for (const sheet of this.sheets) {
      for (const header of sheet.headers) {
        allNotes.push(...header.notes);
      }
    }
    return allNotes;
  }

  // Sheet management
  addSheet(name: string): void {
    const id = this.generateId();
    const defaultContent = `${name}\n\n    This is a header\n        > npm install\n        > npm run build\n\n    This also is a header\n        This is a sample note\n        All command can easy be copied and ran in Note view`;
    
    const filePath = path.join(this.sheetsFolder, `${id}.txt`);
    
    try {
      fs.writeFileSync(filePath, defaultContent, 'utf8');
      
      const sheet: Sheet = {
        name,
        id: id,
        filePath: filePath,
        content: defaultContent,
        headers: []
      };

      // Parse the default content to populate headers
      sheet.headers = this.parseSheetContent(sheet.content);
      // Update sheetName for all notes
      this.updateSheetNameInNotes(sheet);

      this.sheets.push(sheet);
      this.refresh();
      
      vscode.window.showInformationMessage(`✅ Sheet "${name}" added successfully!`);
    } catch (error) {
      console.error('Error creating sheet file:', error);
      vscode.window.showErrorMessage(`❌ Failed to create sheet: ${error}`);
    }
  }

  private updateSheetNameInNotes(sheet: Sheet): void {
    for (const header of sheet.headers) {
      for (const note of header.notes) {
        note.sheetName = sheet.name;
      }
    }
  }

  // Open sheet for editing
  async openSheet(sheetId: string): Promise<void> {
    const sheet = this.sheets.find(s => s.id === sheetId);
    if (!sheet) return;

    try {
      // Open the file directly using its stored path
      const doc = await vscode.workspace.openTextDocument(sheet.filePath);
      const editor = await vscode.window.showTextDocument(doc, {
        preview: false,
        viewColumn: vscode.ViewColumn.One
      });
      
      vscode.window.showInformationMessage(`📝 Opened sheet "${sheet.name}" for editing`);
    } catch (error) {
      vscode.window.showErrorMessage(`❌ Failed to open sheet: ${error}`);
    }
  }



  updateSheet(id: string, name: string): void {
    const sheet = this.sheets.find(s => s.id === id);
    if (sheet) {
      // Update the first line of the file with the new name
      try {
        const content = fs.readFileSync(sheet.filePath, 'utf8');
        const lines = content.split('\n');
        lines[0] = name; // Update the first line which is the sheet name
        const newContent = lines.join('\n');
        
        fs.writeFileSync(sheet.filePath, newContent, 'utf8');
        
        vscode.window.showInformationMessage(`✅ Sheet renamed to "${name}"!`);
        
        // Refresh to reload all sheets from files
        this.refresh();
      } catch (error) {
        console.error('Error updating sheet file:', error);
        vscode.window.showErrorMessage(`❌ Failed to rename sheet: ${error}`);
      }
    }
  }

  deleteSheet(id: string): void {
    const sheet = this.sheets.find(s => s.id === id);
    if (sheet) {
      try {
        // Remove the physical file
        if (fs.existsSync(sheet.filePath)) {
          fs.unlinkSync(sheet.filePath);
        }
        
        vscode.window.showInformationMessage(`✅ Sheet "${sheet.name}" deleted successfully!`);
        
        // Refresh to reload all sheets from files
        this.refresh();
      } catch (error) {
        console.error('Error deleting sheet file:', error);
        vscode.window.showErrorMessage(`❌ Failed to delete sheet: ${error}`);
      }
    }
  }


  // Search functionality
  setSearchFilter(filter: string): void {
    this.searchFilter = filter;
    this.refresh();
  }

  getSearchFilter(): string {
    return this.searchFilter;
  }

  clearSearchFilter(): void {
    this.searchFilter = "";
    this.refresh();
  }

  // Utility methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Parse sheet content based on indentation
  private parseSheetContent(content: string): Header[] {
    const lines = content.split('\n');
    const headers: Header[] = [];
    let currentHeader: Header | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;

      // Count leading spaces/tabs for indentation level
      const indentLevel = this.getIndentLevel(line);

      if (indentLevel === 1) {
        // Header level (1 indent)
        currentHeader = {
          name: trimmedLine,
          id: this.generateId(),
          notes: []
        };
        headers.push(currentHeader);
      } else if (indentLevel === 2 && currentHeader) {
        // Note/Command level (2 indents)
        const isCommand = trimmedLine.startsWith('>');
        let content = isCommand ? trimmedLine.substring(1).trim() : trimmedLine;
        let description = '';
        
        // Check for # separator to extract description
        const hashIndex = content.indexOf(' #');
        if (hashIndex !== -1) {
          description = content.substring(hashIndex + 2).trim();
          content = content.substring(0, hashIndex).trim();
        }
        
        const type = isCommand ? 'command' : 'note';

        const note: Note = {
          id: this.generateId(),
          title: this.generateTitleFromContent(content),
          content: content,
          type: type as 'command' | 'note',
          createdAt: new Date().toISOString(),
          tags: [],
          sheetName: '', // Will be set by caller
          headerName: currentHeader.name,
          description: description // Add description field
        };

        currentHeader.notes.push(note);
      }
    }

    return headers;
  }

  private getIndentLevel(line: string): number {
    let indentCount = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === ' ') {
        indentCount++;
      } else if (line[i] === '\t') {
        indentCount += 4; // Treat tab as 4 spaces
      } else {
        break;
      }
    }
    
    // Convert to logical levels (4 spaces = 1 level)
    return Math.floor(indentCount / 4);
  }

  private generateTitleFromContent(content: string): string {
    // Generate a reasonable title from content (first few words or the command itself)
    const words = content.trim().split(/\s+/);
    if (words.length <= 3) {
      return content;
    }
    return words.slice(0, 3).join(' ') + '...';
  }


  // Generate markdown document
  generateMarkdown(): string {
    let markdown = `# Notes & Commands\n\n`;
    markdown += `*Generated on ${new Date().toLocaleString()}*\n\n`;

    let totalCommands = 0;
    let totalNotes = 0;

    // Process each sheet
    this.sheets.forEach((sheet, sheetIndex) => {
      markdown += `## ${sheet.name}\n\n`;

      if (sheet.headers.length === 0) {
        markdown += `*No headers in this sheet*\n\n`;
        return;
      }

      // Process each header in the sheet
      sheet.headers.forEach((header, headerIndex) => {
        markdown += `### ${header.name}\n\n`;

        if (header.notes.length === 0) {
          markdown += `*No items in this header*\n\n`;
          return;
        }

        // Sort notes by creation date (newest first)
        const sortedNotes = [...header.notes].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        sortedNotes.forEach((note, noteIndex) => {
          if (note.type === 'command') {
            totalCommands++;
            markdown += `#### ⚡ ${note.title}\n\n`;
            markdown += `\`\`\`bash\n${note.content}\n\`\`\`\n\n`;
          } else {
            totalNotes++;
            markdown += `#### 📝 ${note.title}\n\n`;
            markdown += `${note.content}\n\n`;
          }

          if (note.tags && note.tags.length > 0) {
            markdown += `**Tags:** ${note.tags.map(tag => `\`${tag}\``).join(', ')}\n\n`;
          }
          
          markdown += `*Created: ${new Date(note.createdAt).toLocaleString()}*\n\n`;
          markdown += `---\n\n`;
        });
      });
    });

    if (this.sheets.length === 0 || totalCommands + totalNotes === 0) {
      markdown += `*No notes or commands found. Start by adding some!*\n\n`;
    }

    markdown += `---\n\n`;
    markdown += `**Summary:**\n`;
    markdown += `- **Sheets:** ${this.sheets.length}\n`;
    markdown += `- **Commands:** ${totalCommands}\n`;
    markdown += `- **Notes:** ${totalNotes}\n`;
    markdown += `- **Total Items:** ${totalCommands + totalNotes}\n\n`;
    markdown += `*This document is read-only. Use the Notes panel to add, edit, or delete items.*`;

    return markdown;
  }
}