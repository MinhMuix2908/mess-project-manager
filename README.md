# Mess Project Manager

A simple and efficient Visual Studio Code extension for managing and organizing your projects with a convenient TreeView interface.

## Features

- **Project Management**: Save and organize your projects in a hierarchical tree structure
- **Quick Navigation**: Open projects in new or current VS Code windows with one click
- **Active/Inactive Projects**: Toggle between showing all projects or just active ones
- **Auto-save Current Location**: Quickly save your current workspace or file directory as a project
- **Configuration Management**: Direct access to edit your projects configuration file
- **Real-time Updates**: Automatic refresh when projects configuration changes

## Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. Press `F5` to launch a new VS Code window with the extension loaded

## Usage

### Adding Projects

1. Open the file or workspace you want to save as a project
2. Click the "Save Current Location" button (➕) in the Mess Project Manager view
3. The project will be automatically saved with the folder name as the project name

### Managing Projects

- **Open in New Window**: Click the new window icon (📋) next to a project
- **Open in Current Window**: Click the arrow icon (➡️) next to a project
- **Edit Configuration**: Click the edit icon (✏️) to directly modify the projects.json file
- **Refresh**: Click the refresh icon (🔄) to reload the project list
- **Toggle Inactive Projects**: Click the eye icon (👁️) to show/hide inactive projects

### Project Configuration

Projects are stored in a `projects.json` file in the extension's global storage. The structure is:

```json
{
  "projects": [
    {
      "label": "Project Name",
      "path": "/path/to/project",
      "active": true
    }
  ]
}
```

## Commands

The extension provides the following commands:

- `messProjectManager.saveCurrentLocation` - Save the current location as a project
- `messProjectManager.editProjectsConfig` - Open the projects configuration file
- `messProjectManager.refreshProjects` - Refresh the project tree view
- `messProjectManager.toggleShowInactive` - Toggle visibility of inactive projects
- `messProjectManager.openProjectNewWindow` - Open project in a new VS Code window
- `messProjectManager.openProjectCurrentWindow` - Open project in the current window

## Configuration

The extension supports the following settings:

- `messProjectManager.showInactiveProjects` (boolean): Whether to show inactive projects in the tree view (default: false)

## Development

### Prerequisites

- Node.js (v20 or later)
- VS Code (v1.90.0 or later)
- TypeScript

### Building

```bash
npm install
npm run compile
```

### Testing

```bash
npm test
```

### Publishing

```bash
npm run vscode:prepublish
vsce package
```

## Repository

GitHub: [https://github.com/MinhMuix2908/mess-project-manager](https://github.com/MinhMuix2908/mess-project-manager)

## License

This project is licensed under the terms specified in the LICENSE.md file.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Author

**DaoQuangMinh**

---

*Extension Version: 0.0.1*
