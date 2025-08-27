# Mess Project Manager

A powerful and intuitive Visual Studio Code extension designed for developers who work with multiple projects. Organize, categorize, and manage your projects with advanced features including Git integration, drag-and-drop functionality, and intelligent project type detection.

## ✨ Features

### 📁 Project Management
- **Hierarchical Organization**: Organize projects in a clean tree structure with support for nested folders
- **Multiple Views**: Switch between flat list view, categorized view, and Git repositories view
- **Drag & Drop**: Easily reorder projects and assign them to categories with intuitive drag-and-drop
- **Quick Save**: Instantly save your current workspace or active file directory as a project
- **Smart Filtering**: Search projects by name or path with real-time filtering

### 🏷️ Categorization & Organization
- **Custom Categories**: Create unlimited project categories with custom icons
- **Favorites System**: Mark important projects as favorites for quick access
- **Category Assignment**: Organize projects into categories via drag-and-drop or context menu
- **Visual Indicators**: Different icons for project types (React, Vue, Angular, Node.js, Python, etc.)

### 🔄 Git Integration
- **Repository Detection**: Automatically detect Git repositories in your projects
- **Branch Information**: View current branch, commit status, and sync information
- **Change Indicators**: Visual indicators for uncommitted changes and sync status
- **Ahead/Behind Tracking**: See how many commits you're ahead or behind the remote

### 🎯 Smart Project Detection
- **Automatic Type Detection**: Recognizes 10+ project types including:
  - **Frontend**: React, Vue, Angular, Svelte
  - **Backend**: Node.js, Python, Java, C#, PHP, Go
  - **Mobile**: Flutter/Dart
  - **Containerization**: Docker
  - **Others**: Unity, Ruby, Git repositories

### 🚀 Quick Navigation
- **Multiple Opening Options**: Open projects in new window, current window, or file explorer
- **One-Click Access**: Direct access to projects from the activity bar
- **Context Menus**: Rich right-click context menus with relevant actions
- **Keyboard Shortcuts**: Fast navigation with built-in VS Code shortcuts

### 🔧 Advanced Configuration
- **Active/Inactive Toggle**: Show/hide inactive projects as needed
- **Persistent Settings**: Configuration saved globally across VS Code sessions
- **Real-time Updates**: Automatic refresh when project configurations change
- **Import/Export**: Easy backup and restore of project configurations

## 📦 Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Mess Project Manager"
4. Click Install

### Manual Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/MinhMuix2908/mess-project-manager.git
   ```
2. Install dependencies:
   ```bash
   cd mess-project-manager
   npm install
   ```
3. Compile the extension:
   ```bash
   npm run compile
   ```
4. Press `F5` to launch VS Code with the extension loaded

## 🎮 Usage Guide

### Adding Projects

#### Quick Save Current Location
1. Open any file or workspace in VS Code
2. Click the **Add Project** button (➕) in the Mess Project Manager panel
3. The project is automatically saved with the folder name

#### Manual Configuration
1. Click the **Edit Config** button (✏️) to open `projects.json`
2. Add projects manually:
   ```json
   {
     "projects": [
       {
         "label": "My React App",
         "path": "/path/to/my-react-app",
         "active": true,
         "category": "frontend",
         "favorite": true
       }
     ]
   }
   ```

### Managing Projects

#### Opening Projects
- **New Window**: Click the window icon (🗗) or right-click → "Open in New Window"
- **Current Window**: Click the arrow icon (➡️) or right-click → "Open in Current Window"
- **File Explorer**: Click the folder icon (📁) or right-click → "Open in File Explorer"

#### Organization
- **Drag & Drop**: Drag projects between categories or to reorder
- **Categories**: Right-click on category view to add/remove categories
- **Favorites**: Right-click on any project → "Toggle Favorite"
- **Search**: Use the search icon (🔍) to filter projects instantly

### Three View Modes

#### 1. All Projects View
- Shows all projects in a flat or nested structure
- Supports drag-and-drop reordering
- Displays project type icons and status

#### 2. Categories View
- Groups projects by custom categories
- Shows favorites section at the top
- Allows category management and assignment

#### 3. Git View
- Shows only Git repositories
- Displays branch information and sync status
- Highlights repositories with uncommitted changes
- Shows ahead/behind commit count

## ⚙️ Configuration

### Extension Settings

Access via File → Preferences → Settings → Extensions → Mess Project Manager:

```json
{
  "messProjectManager.showInactiveProjects": false
}
```

### Project Structure

Projects are stored in `projects.json` in VS Code's global storage:

```json
{
  "projects": [
    {
      "label": "E-commerce Site",
      "path": "/Users/dev/projects/ecommerce",
      "active": true,
      "category": "work",
      "favorite": true
    },
    {
      "label": "Personal Blog",
      "path": "/Users/dev/projects/blog",
      "active": true,
      "category": "personal",
      "favorite": false
    }
  ]
}
```

### Categories Structure

Categories are stored in `categories.json`:

```json
{
  "categories": [
    {
      "id": "work",
      "name": "Work Projects",
      "icon": "briefcase"
    },
    {
      "id": "personal",
      "name": "Personal Projects", 
      "icon": "home"
    }
  ]
}
```

## 🔌 Commands

All commands are accessible via Command Palette (Ctrl+Shift+P):

| Command | Description |
|---------|-------------|
| `Mess Project Manager: Save Current Location` | Save current workspace/file location as project |
| `Mess Project Manager: Edit Projects Config` | Open projects.json for manual editing |
| `Mess Project Manager: Refresh Projects` | Reload all project views |
| `Mess Project Manager: Toggle Show Inactive` | Show/hide inactive projects |
| `Mess Project Manager: Search Projects` | Filter projects by name or path |
| `Mess Project Manager: Clear Search` | Clear current search filter |
| `Mess Project Manager: Add Category` | Create a new project category |
| `Mess Project Manager: Remove Category` | Delete an existing category |

## 🛠️ Development

### Prerequisites
- Node.js 20.x or later
- VS Code 1.90.0 or later
- TypeScript 5.x

### Development Setup
```bash
# Clone repository
git clone https://github.com/MinhMuix2908/mess-project-manager.git
cd mess-project-manager

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Launch development instance
code --extensionDevelopmentPath=.
```

### Building & Testing
```bash
# Compile for production
npm run vscode:prepublish

# Run tests
npm test

# Package extension
npm install -g vsce
vsce package
```

### Project Structure
```
mess-project-manager/
├── src/
│   ├── extension.ts          # Main extension entry point
│   ├── ProjectProvider.ts    # Core project management logic
│   ├── GitProjectProvider.ts # Git integration functionality  
│   └── types.ts             # TypeScript type definitions
├── icons/                   # Project type icons (light/dark themes)
├── out/                     # Compiled JavaScript output
├── package.json            # Extension manifest
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

## 🎨 Customization

### Custom Icons
The extension includes custom SVG icons for different project types. Icons are located in:
- `icons/light/` - Light theme icons
- `icons/dark/` - Dark theme icons

Supported project type icons:
- Angular, React, Vue, Node.js
- Python, Java, C#, PHP, Go
- Docker, Flutter

### Theme Integration
The extension respects VS Code's theme settings and provides appropriate icons and colors for both light and dark themes.

## 🚀 Future Features

Planned enhancements (see `future_features.txt`):
- Terminal integration (open terminal in project root)
- Enhanced Git operations (clone, pull, push)
- Package manager integration (npm, yarn commands)
- Project templates and scaffolding
- Advanced search and filtering options
- Project statistics and insights

## 🐛 Troubleshooting

### Common Issues

**Projects not appearing?**
- Check if projects are marked as `active: true`
- Verify project paths exist and are accessible
- Try refreshing the project view

**Git information not showing?**
- Ensure Git is installed and accessible from command line
- Check that projects contain `.git` directories
- Verify Git repositories have proper remotes configured

**Drag & drop not working?**
- Make sure you're in the Categories view for category assignments
- Only project items (not categories) can be dragged
- Try refreshing the view if issues persist

### Reset Configuration
To reset all settings:
1. Open Command Palette (Ctrl+Shift+P)
2. Run "Developer: Reload Window"
3. Delete storage files if needed (extension will recreate them)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Contributing Guidelines
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Add appropriate error handling
- Include JSDoc comments for public methods
- Test your changes with multiple project types
- Ensure compatibility with VS Code's latest version

## 📊 Repository Stats

- **Version**: 0.0.2
- **Publisher**: DaoQuangMinh
- **GitHub**: [https://github.com/MinhMuix2908/mess-project-manager](https://github.com/MinhMuix2908/mess-project-manager)
- **VS Code Compatibility**: ^1.90.0
- **License**: MIT

---

### 📱 Connect

For questions, suggestions, or support:
- GitHub Issues: [Report a bug or request a feature](https://github.com/MinhMuix2908/mess-project-manager/issues)
- Email: daoquangminh2908@gmail.com

**Made with ❤️ for the developer community**