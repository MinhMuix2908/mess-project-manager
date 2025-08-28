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

    this.tooltip = `${note.type.toUpperCase()}: ${note.content}`;
    this.description = note.type === 'command' ? 'Command' : 'Note';
    
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
      
      // Scan the sheets folder for .txt files
      if (fs.existsSync(this.sheetsFolder)) {
        const files = fs.readdirSync(this.sheetsFolder);
        
        for (const file of files) {
          if (file.endsWith('.txt')) {
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
      
      // If no sheets exist, create a default one
      if (this.sheets.length === 0) {
        this.createDefaultSheet();
      }
    } catch (error) {
      console.error("Error loading sheets:", error);
      this.createDefaultSheet();
    }
  }

  private createDefaultSheet(): void {
    const id = this.generateId();
    const defaultContent = `My Default Sheet\n\n    Getting Started\n        > echo "Welcome to Notes & Commands!"\n        This is your first note. Edit this sheet to add more content.`;
    
    const filePath = path.join(this.sheetsFolder, `${id}.txt`);
    
    try {
      fs.writeFileSync(filePath, defaultContent, 'utf8');
      
      const sheet: Sheet = {
        name: "My Default Sheet",
        id: id,
        filePath: filePath,
        content: defaultContent,
        headers: []
      };
      
      // Parse the default content
      sheet.headers = this.parseSheetContent(sheet.content);
      this.updateSheetNameInNotes(sheet);
      
      this.sheets.push(sheet);
    } catch (error) {
      console.error('Error creating default sheet:', error);
    }
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
        const content = isCommand ? trimmedLine.substring(1).trim() : trimmedLine;
        const type = isCommand ? 'command' : 'note';

        const note: Note = {
          id: this.generateId(),
          title: this.generateTitleFromContent(content),
          content: content,
          type: type as 'command' | 'note',
          createdAt: new Date().toISOString(),
          tags: [],
          sheetName: '', // Will be set by caller
          headerName: currentHeader.name
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