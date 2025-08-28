# Mess Project Manager

A comprehensive Visual Studio Code extension for developers who juggle multiple projects. Organize, manage, and access your projects with advanced features including Git integration, terminal shortcuts, and a powerful Notes & Commands system.

## ✨ Key Features

### 📁 **Advanced Project Management**
- **Multiple Views**: Switch between All Projects, Categorized, Git, and Notes views
- **Drag & Drop**: Intuitive reordering and categorization
- **Smart Detection**: Automatically identifies 15+ project types (React, Vue, Angular, Node.js, Python, Docker, etc.)
- **Quick Access**: One-click opening in new window, current window, or file explorer

### 🏷️ **Organization & Categorization** 
- **Custom Categories**: Create unlimited categories with custom icons
- **Favorites System**: Star important projects for quick access
- **Advanced Search**: Filter projects by name, path, or content in real-time
- **Active/Inactive Toggle**: Show/hide inactive projects as needed

### 🔄 **Git Integration**
- **Repository Detection**: Automatically finds and tracks Git repositories
- **Branch Information**: View current branch and sync status
- **Change Indicators**: Visual indicators for uncommitted changes
- **Git Operations**: Pull repositories and view status directly from the tree
- **Clone Support**: Clone new repositories with built-in dialog

### 🖥️ **Terminal Integration** 
- **Multi-Terminal Support**: Access CMD, PowerShell, Git Bash, and integrated terminal
- **Admin Mode**: Run terminals with elevated privileges when needed
- **Smart Menu**: Platform-aware terminal selection (Windows/macOS/Linux)
- **Quick Launch**: Right-click any project to open terminal in its directory

### 📝 **Notes & Commands System** *(New in v0.0.2)*
- **Sheet-Based Organization**: Create multiple note sheets for different contexts
- **Command Management**: Store and run frequently used commands with one click
- **Hierarchical Structure**: Organize with headers and nested items
- **Quick Copy & Run**: Copy commands to clipboard or execute directly
- **File-Based Storage**: Simple `.txt` files with auto-generated IDs
- **Live Editing**: Edit sheets directly in VS Code with automatic parsing

## 📦 Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for **"Mess Project Manager"**
4. Click **Install**

### Manual Installation
```bash
# Clone repository
git clone https://github.com/MinhMuix2908/mess-project-manager.git
cd mess-project-manager

# Install dependencies
npm install

# Compile extension
npm run compile

# Package for installation
npm install -g vsce
vsce package
```

## 🚀 Quick Start Guide

### 1. Adding Projects
- **Quick Save**: Click the ➕ button while any project is open
- **Manual Config**: Click the ✏️ button to edit `projects.json` directly

### 2. Using Categories
- **Create**: Right-click in Categories view → "Add Category"
- **Assign**: Drag projects to categories or use right-click menu
- **Organize**: Use favorites and custom categories for better organization

### 3. Git Integration
- **Auto-Detection**: Git repos appear automatically in Git view
- **Quick Operations**: Right-click for pull, status, and terminal access
- **Clone Repos**: Use the clone button to add new repositories

### 4. Terminal Access
- **Right-Click Menu**: Access "Terminal Menu" on any project
- **Quick Terminal**: Click terminal icon for integrated terminal
- **Admin Access**: Available for Windows CMD and PowerShell

### 5. Notes & Commands *(New!)*
- **Create Sheet**: Click ➕ in Notes view to create a new sheet
- **Edit Structure**: Open any sheet to edit using this format:
  ```
  Sheet Name
  
      Header Name
          > command to run
          regular note text
          > another command
  ```
- **Copy & Run**: Right-click notes to copy or run commands directly

## 📋 Notes & Commands Format

The Notes system uses a simple indentation-based format:

```text
My Development Sheet

    Git Commands
        > git status
        > git add .
        > git commit -m "Update"
        Remember to check staging area first
        
    Node.js Commands  
        > npm install
        > npm run dev
        > npm run build
        Use --force flag if needed
```

**Rules:**
- **Sheet Name**: First line (no indentation)
- **Headers**: 4 spaces indentation
- **Commands**: 8 spaces + `>` prefix
- **Notes**: 8 spaces (no `>` prefix)

## ⚙️ Configuration

### Extension Settings

```json
{
  "messProjectManager.showInactiveProjects": false
}
```

### Project Configuration

Projects are stored in `projects.json`:

```json
{
  "projects": [
    {
      "label": "E-commerce Site",
      "path": "/path/to/project",
      "active": true,
      "category": "work",
      "favorite": true
    }
  ]
}
```

## 🎮 Available Commands

Access via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

### Project Management
- `Mess Project Manager: Save Current Location`
- `Mess Project Manager: Edit Projects Config`
- `Mess Project Manager: Refresh Projects`
- `Mess Project Manager: Search Projects`

### Git Operations  
- `Mess Project Manager: Refresh Git Projects`
- `Mess Project Manager: Clone Repository`

### Notes & Commands
- `Mess Project Manager: Add Sheet`
- `Mess Project Manager: Refresh Notes`

### Terminal Access
- Multiple terminal options available via context menus

## 📱 Supported Project Types

The extension automatically detects and provides appropriate icons for:

**Frontend**: React, Vue, Angular, Svelte  
**Backend**: Node.js, Python, Java, C#, PHP, Go, Ruby  
**Mobile**: Flutter/Dart  
**DevOps**: Docker  
**Others**: Unity, Git repositories, general projects

## 🛠️ Development

### Prerequisites
- Node.js 20.x+
- VS Code 1.90.0+  
- TypeScript 5.x

### Development Setup
```bash
git clone https://github.com/MinhMuix2908/mess-project-manager.git
cd mess-project-manager
npm install
npm run compile
npm run watch  # For development
```

### Building
```bash
npm run vscode:prepublish  # Production build
vsce package              # Create .vsix file
```

## 🔧 What's New in v0.3.1

### 🎯 **Latest Updates**
- **Version 0.3.1**: Stability improvements and documentation updates
- **Enhanced Performance**: Optimized extension loading and refresh operations
- **Better Documentation**: Comprehensive guides and troubleshooting sections

## 🔧 Previous Updates - v0.0.2

### ✨ **Major Features Added**
- **Notes & Commands System**: Complete sheet-based note management
- **Terminal Integration**: Multi-platform terminal support with admin mode  
- **Enhanced Git**: Pull operations and status viewing
- **Improved UI**: Better icons and context menus

### 🐛 **Fixes & Improvements**
- Simplified file-based storage for better reliability
- Removed complex document tracking that caused save issues
- Streamlined refresh logic for better performance
- Cleaner command structure and menu organization

### 🚀 **Technical Improvements**
- Pure file-based system for notes (no more JSON complexity)
- Auto-generated sheet IDs for better organization
- Improved error handling and user feedback
- Better TypeScript typing and code organization

## 🐛 Troubleshooting

### Common Issues

**Projects not appearing?**
- Verify paths exist and are accessible
- Check if projects are marked as `active: true`
- Try refreshing the view

**Git features not working?**
- Ensure Git is installed and in PATH
- Check that projects have `.git` directories
- Verify remote repositories are configured

**Terminal not opening?**
- Check platform-specific terminal availability
- Try different terminal types from the menu
- Verify admin permissions for elevated terminals

**Notes not saving properly?**
- Ensure sheets folder exists and is writable
- Check file permissions in VS Code global storage
- Try refreshing the Notes view

## 🔮 Roadmap

### Planned Features
- **Advanced Git**: Branch switching, merge operations
- **Package Manager**: npm/yarn command shortcuts
- **Project Templates**: Quick project scaffolding
- **Cloud Sync**: Sync settings across devices
- **Enhanced Search**: Global search across all notes and projects
- **Workspace Integration**: Better multi-root workspace support

## 📄 License

MIT License - see [LICENSE.md](LICENSE.md) for details.

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Submit a Pull Request

See our [Contributing Guidelines](https://github.com/MinhMuix2908/mess-project-manager/blob/main/CONTRIBUTING.md) for details.

## 📊 Extension Info

- **Version**: 0.3.1
- **Publisher**: DaoQuangMinh  
- **Repository**: [GitHub](https://github.com/MinhMuix2908/mess-project-manager)
- **VS Code**: ^1.90.0
- **License**: MIT

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/MinhMuix2908/mess-project-manager/issues)
- **Email**: daoquangminh2908@gmail.com
- **Discussions**: [GitHub Discussions](https://github.com/MinhMuix2908/mess-project-manager/discussions)

**Made with ❤️ for developers everywhere**