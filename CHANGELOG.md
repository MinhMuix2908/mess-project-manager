# Changelog

All notable changes to the Mess Project Manager extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.2] - 2025-08-29

### 🚀 Major Enhancements

#### 📚 Enhanced Useful Tips Sheet
- **Comprehensive Command Library**: Added 100+ commonly used commands across multiple categories
- **Git Commands**: 25+ essential git operations with clear descriptions
- **NPM/Yarn Commands**: 20+ package management and build commands
- **Docker Commands**: 15+ container management operations
- **System Commands**: 25+ file operations and process management (Linux/Mac)
- **Windows Commands**: 10+ Windows-specific system commands
- **Python Commands**: 10+ virtual environment and package management
- **Database Commands**: PostgreSQL, MySQL, MongoDB, Redis, SQLite connection commands
- **Development Notes**: 15 best practices and tips for developers
- **Useful Links**: 10 essential development resources and documentation

#### 🎯 Smart Description System
- **Command Descriptions**: Added `#` separator for detailed command explanations
- **Visual Enhancement**: Tree view now shows helpful descriptions instead of generic "Command/Note"
- **Educational Value**: Each command includes what it does and when to use it
- **Better UX**: Tooltips show both command and description for complete context

#### ⚡ Auto-Refresh Useful Tips
- **Always Updated**: Useful Tips sheet automatically refreshes with latest content on every startup
- **Consistent Experience**: All users get the same comprehensive command library
- **Version Control**: Sheet content stays current with extension updates
- **Top Priority**: Useful Tips always appears first in Notes & Commands view

### 🛠️ Improvements

#### 🎨 UI/UX Enhancements
- **Better Project Navigation**: ProjectItem onClick now properly opens in current window
- **Enhanced Descriptions**: Meaningful descriptions replace generic type labels
- **Improved Tooltips**: More informative hover text with command details

#### 🔧 Technical Improvements
- **Fixed Extension Icon**: Proper marketplace icon configuration with PNG format
- **Stable Sheet Management**: Useful Tips uses fixed filename and ID for consistency
- **Better Parsing**: Enhanced content parsing with description extraction
- **Clean Architecture**: Separated default sheet creation from user sheets

### 🐛 Bug Fixes
- **Extension Icon**: Resolved marketplace icon display issues
- **Click Behavior**: Fixed ProjectItem onClick to open in current window as expected
- **Sheet Positioning**: Useful Tips now consistently appears at the top of the list

### 📋 New Command Categories Added

#### Git Operations
```bash
git status # Check repository status and changes
git add . # Stage all changes for commit
git commit -m "message" # Commit staged changes with message
git push # Push commits to remote repository
# ... and 20+ more git commands
```

#### Development Workflow
```bash
npm install # Install all dependencies from package.json
npm run build # Build the project for production
docker ps # List running containers
python -m venv env # Create virtual environment
# ... and 70+ more commands across all categories
```

### 🎯 User Benefits
- **Instant Productivity**: 100+ ready-to-use commands at your fingertips
- **Learning Tool**: Descriptions help developers understand what each command does
- **Copy-Paste Ready**: All commands are properly formatted and executable
- **Always Current**: Content updates automatically with extension releases
- **Educational**: Great for onboarding new developers or learning new tools

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