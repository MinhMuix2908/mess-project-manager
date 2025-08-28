# Publishing Guide for VS Code Marketplace

This guide covers publishing version 0.3.1 of Mess Project Manager to the VS Code Marketplace.

## 🔄 Pre-Publishing Checklist

### ✅ Code Quality & Testing
- [x] **Compilation**: `npm run compile` runs without errors
- [x] **TypeScript**: All TypeScript errors resolved
- [x] **Functionality**: All features tested (Projects, Git, Terminal, Notes)
- [x] **Package.json**: Updated with proper metadata
- [x] **README**: Comprehensive documentation created
- [x] **CHANGELOG**: Version 0.3.1 changes documented

### ✅ Marketplace Metadata
- [x] **Description**: Enhanced marketplace description
- [x] **Keywords**: Relevant search keywords added
- [x] **Categories**: Proper categorization (Other, Productivity, Organization)
- [x] **Icon**: Logo configured (SVG format)
- [x] **Gallery Banner**: Dark theme banner configured

## 📦 Building & Packaging

### 1. Install VSCE (if not already installed)
```bash
npm install -g vsce
```

### 2. Login to Visual Studio Marketplace
```bash
vsce login DaoQuangMinh
```
*You'll need your Personal Access Token from Azure DevOps*

### 3. Build Production Version
```bash
# Clean build
npm run compile

# Or use prepublish script
npm run vscode:prepublish
```

### 4. Package Extension
```bash
# Create .vsix package
vsce package

# This creates: mess-project-manager-0.3.1.vsix
```

### 5. Test Package Locally (Optional)
```bash
# Install locally to test
code --install-extension mess-project-manager-0.3.1.vsix
```

## 🚀 Publishing to Marketplace

### Option 1: Publish via Command Line
```bash
# Publish directly
vsce publish

# Or specify version
vsce publish 0.3.1

# Publish with custom message
vsce publish -m "Major update: Notes & Commands system, Terminal integration"
```

### Option 2: Upload via Web Interface
1. Go to [Visual Studio Marketplace Publisher Portal](https://marketplace.visualstudio.com/manage)
2. Sign in with your Microsoft account
3. Select your publisher (DaoQuangMinh)
4. Click "New Extension" → "Visual Studio Code"
5. Upload the `mess-project-manager-0.3.1.vsix` file
6. Add release notes and publish

## 📋 Release Information for v0.3.1

### Short Description (for marketplace)
```
Advanced project manager with Git integration, terminal shortcuts, and Notes & Commands system. Organize multiple projects with categories, favorites, and drag-and-drop functionality.
```

### Release Notes
```markdown
## What's New in v0.3.1

### 🎯 Version Updates
- **Stability Improvements**: Enhanced overall extension stability and performance
- **Documentation Updates**: Updated README and publishing documentation
- **Version Alignment**: Updated to semantic versioning 0.3.1

### 📝 Previous Features (v0.0.2)
- **Notes & Commands System**: Create and manage note sheets with commands
- **Terminal Integration**: Multi-platform terminal support (CMD, PowerShell, Git Bash)
- **Enhanced Git Operations**: Pull repositories and view status directly
- **Improved UI**: Better context menus and visual indicators

Full changelog: https://github.com/MinhMuix2908/mess-project-manager/blob/main/CHANGELOG.md
```

## 🔧 Marketplace Configuration

### Categories
- Other
- Productivity  
- Organization

### Keywords
- project manager
- git integration
- terminal
- notes
- commands
- organization
- productivity
- workspace
- favorites
- categories

### Supported VS Code Version
- **Minimum**: 1.90.0
- **Recommended**: Latest

## 📊 Post-Publishing Steps

### 1. Verify Publication
- Check extension appears in marketplace search
- Test installation from marketplace
- Verify all metadata displays correctly

### 2. Update Repository
```bash
# Tag the release
git tag v0.3.1
git push origin v0.3.1

# Create GitHub release with same notes
```

### 3. Update Documentation
- Ensure README links work
- Check all images display properly
- Verify installation instructions

### 4. Monitor & Support
- Watch for user feedback
- Monitor download statistics
- Respond to issues on GitHub

## 🚨 Troubleshooting

### Common Issues

**Authentication Problems**
```bash
# Re-login if needed
vsce logout
vsce login DaoQuangMinh
```

**Package Size Issues**
```bash
# Check what's included
vsce ls

# Exclude unnecessary files in .vscodeignore
```

**Icon Not Displaying**
- Ensure icon path is correct in package.json
- Use proper format (SVG recommended)
- Check file exists and is accessible

**Marketplace Rejection**
- Verify all required fields are filled
- Check description length and content
- Ensure icon meets requirements
- Review marketplace policies

## 📝 .vscodeignore Configuration

Ensure your `.vscodeignore` excludes:
```
.vscode/**
.vscode-test/**
src/**
.gitignore
.yarnrc
vsc-extension-quickstart.md
**/tsconfig.json
**/*.map
**/*.ts
node_modules/**
.eslintrc.json
**/*.md
!README.md
!CHANGELOG.md
```

## ✅ Final Checklist Before Publishing

- [ ] Version number updated in package.json
- [ ] All features working in development
- [ ] README.md updated with new features
- [ ] CHANGELOG.md documents all changes
- [ ] Package.json has proper marketplace metadata
- [ ] Extension compiles without errors
- [ ] .vsix package created successfully
- [ ] Personal Access Token ready
- [ ] Release notes prepared
- [ ] Git repository up to date

## 📞 Support Resources

- [VSCE Documentation](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Marketplace Publisher Portal](https://marketplace.visualstudio.com/manage)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [Marketplace FAQ](https://code.visualstudio.com/docs/editor/extension-marketplace)

---

**Ready to publish? Run `vsce publish` and share your extension with the world! 🚀**