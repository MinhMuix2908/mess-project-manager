# Changelog

All notable changes to the Mess Project Manager extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2025-08-28

### 🎯 Version Update
- **Version Bump**: Updated extension version to 0.3.1
- **Stability Improvements**: Enhanced overall extension stability and performance
- **Documentation Updates**: Updated README and publishing documentation
- **Fixed Can Not Open in New Window**: Resolved issue where command syntax are incorrect

## [0.0.2] - 2025-08-28

### ✨ Major Features Added

#### 📝 Notes & Commands System
- **Sheet-Based Organization**: Create and manage multiple note sheets
- **Command Management**: Store frequently used commands with one-click execution
- **Hierarchical Structure**: Organize content with headers and nested items
- **Live Editing**: Edit sheets directly in VS Code with automatic parsing
- **Copy & Run**: Copy commands to clipboard or execute them directly in terminal
- **File-Based Storage**: Simple `.txt` files with auto-generated IDs for better reliability

#### 🖥️ Terminal Integration
- **Multi-Platform Support**: Windows (CMD, PowerShell, Git Bash), macOS, Linux
- **Admin Mode**: Run terminals with elevated privileges when needed
- **Smart Menu System**: Platform-aware terminal selection
- **Quick Access**: Right-click any project to open terminal in its directory
- **Integrated Terminal**: Direct access to VS Code's integrated terminal

#### 🔄 Enhanced Git Operations
- **Pull Repositories**: Pull changes directly from the tree view
- **Git Status**: View repository status with visual indicators
- **Clone Support**: Clone new repositories with built-in dialog
- **Better Branch Info**: Enhanced branch and sync status display

### 🛠️ Improvements

#### 🎨 UI/UX Enhancements
- **Improved Context Menus**: More intuitive right-click actions
- **Better Icons**: Enhanced visual indicators for different item types
- **Cleaner Interface**: Streamlined view organization
- **Updated View Names**: More descriptive panel titles

#### 🔧 Technical Improvements
- **File-Based Architecture**: Simplified storage system for better reliability
- **Removed Complex Tracking**: Eliminated document tracking that caused save issues
- **Better Error Handling**: Improved user feedback and error messages
- **Performance Optimizations**: Faster refresh and loading times

### 🐛 Bug Fixes
- **Fixed Git Bash Terminal**: Resolved issue where Git Bash commands weren't executing
- **Save/Reopen Issues**: Fixed notes losing content after save/close cycles
- **Refresh Problems**: Eliminated need to restart VS Code after changes
- **Command Registration**: Cleaned up unused command definitions

### 📋 Notes & Commands Format

The new Notes system uses an indentation-based format:

```text
Sheet Name

    Header Name (4 spaces)
        > command to run (8 spaces + >)
        regular note text (8 spaces)
```

### 🎯 Breaking Changes
- **Notes Storage**: Migrated from JSON to individual `.txt` files
- **Command Structure**: Removed individual note/command management in favor of sheet editing
- **File Organization**: Notes now stored in sheets folder with auto-generated IDs

### 📦 Package Updates
- **Better Marketplace Metadata**: Enhanced description and keywords
- **Category Updates**: Added Productivity and Organization categories
- **Icon Configuration**: Proper icon setup for marketplace

## [0.0.1] - Initial Release

### ✨ Features
- **Project Management**: Basic project organization with TreeView
- **Multiple Views**: All Projects and Categorized views
- **Git Integration**: Basic Git repository detection
- **Drag & Drop**: Project reordering and categorization
- **Categories**: Custom project categories with icons
- **Favorites**: Mark projects as favorites
- **Search**: Filter projects by name or path
- **Project Types**: Auto-detection of 15+ project types
- **Quick Actions**: Open in new window, current window, or file explorer

---

**For complete installation and usage instructions, see the [README.md](README.md)**