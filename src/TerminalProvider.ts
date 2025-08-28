import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { Console } from "console";

const execAsync = promisify(exec);

export interface TerminalOptions {
  type: 'integrated' | 'external' | 'cmd' | 'powershell' | 'bash' | 'git-bash';
  admin?: boolean;
  workingDirectory: string;
  projectName: string;
}

export class TerminalProvider {
  private static instance: TerminalProvider;
  private activeTerminals: Map<string, vscode.Terminal> = new Map();

  public static getInstance(): TerminalProvider {
    if (!TerminalProvider.instance) {
      TerminalProvider.instance = new TerminalProvider();
    }
    return TerminalProvider.instance;
  }

  /**
   * Opens VS Code integrated terminal in project root
   */
  async openIntegratedTerminal(workingDirectory: string, projectName: string): Promise<void> {
    try {
      if (!fs.existsSync(workingDirectory)) {
        vscode.window.showErrorMessage(`❌ Directory does not exist: ${workingDirectory}`);
        return;
      }

      const terminalName = `Terminal - ${projectName}`;
      
      // Check if terminal already exists
      const existingTerminal = this.activeTerminals.get(terminalName);
      if (existingTerminal) {
        existingTerminal.show();
        vscode.window.showInformationMessage(`📋 Switched to existing terminal: ${projectName}`);
        return;
      }

      const terminal = vscode.window.createTerminal({
        name: terminalName,
        cwd: workingDirectory,
        iconPath: new vscode.ThemeIcon("terminal")
      });

      terminal.show();
      this.activeTerminals.set(terminalName, terminal);

      // Clean up when terminal is closed
      const disposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
        if (closedTerminal === terminal) {
          this.activeTerminals.delete(terminalName);
          disposable.dispose();
        }
      });

      vscode.window.showInformationMessage(`✅ Opened integrated terminal in: ${projectName}`);
    } catch (error: any) {
      vscode.window.showErrorMessage(`❌ Failed to open integrated terminal: ${error.message}`);
    }
  }

  /**
   * Opens specific terminal type (CMD, PowerShell, Bash, etc.)
   */
  async openSpecificTerminal(options: TerminalOptions): Promise<void> {
    const { type, workingDirectory, projectName, admin = false } = options;

    try {
      if (!fs.existsSync(workingDirectory)) {
        vscode.window.showErrorMessage(`❌ Directory does not exist: ${workingDirectory}`);
        return;
      }

      const platform = process.platform;

      switch (type) {
        case 'cmd':
          await this.openCommandPrompt(workingDirectory, projectName, admin);
          break;
        case 'powershell':
          await this.openPowerShell(workingDirectory, projectName, admin);
          break;
        case 'bash':
          await this.openBash(workingDirectory, projectName);
          break;
        case 'git-bash':
          await this.openGitBash(workingDirectory, projectName);
          break;
        default:
          await this.openBash(workingDirectory, projectName);
      }

    } catch (error: any) {
      vscode.window.showErrorMessage(`❌ Failed to open ${type} terminal: ${error.message}`);
    }
  }

  /**
   * Shows terminal selection menu
   */
  async showTerminalSelectionMenu(workingDirectory: string, projectName: string): Promise<void> {
    const platform = process.platform;
    const options: vscode.QuickPickItem[] = [
      {
        label: "🖥️ Integrated Terminal",
        description: "Open in VS Code integrated terminal",
        detail: "Opens terminal inside VS Code"
      }
    ];

    if (platform === 'win32') {
      options.push(
        {
          label: "🔷 Command Prompt",
          description: "Open Windows Command Prompt",
          detail: "cmd.exe"
        },
        {
          label: "🔹 Command Prompt (Admin)",
          description: "Open Windows Command Prompt as Administrator",
          detail: "cmd.exe with elevated privileges"
        },
        {
          label: "💙 PowerShell",
          description: "Open Windows PowerShell",
          detail: "powershell.exe"
        },
        {
          label: "💙 PowerShell (Admin)",
          description: "Open Windows PowerShell as Administrator",
          detail: "powershell.exe with elevated privileges"
        },
        {
          label: "🟢 Git Bash",
          description: "Open Git Bash",
          detail: "Git for Windows bash terminal"
        },
        {
          label: "🖼️ Windows Terminal",
          description: "Open in Windows Terminal (if installed)",
          detail: "Modern Windows terminal app"
        }
      );
    } else if (platform === 'darwin') {
      options.push(
        {
          label: "🍎 Terminal",
          description: "Open macOS Terminal",
          detail: "System terminal application"
        },
        {
          label: "⚡ iTerm2",
          description: "Open iTerm2 (if installed)",
          detail: "Popular macOS terminal alternative"
        },
        {
          label: "🐚 Bash",
          description: "Open Bash shell",
          detail: "/bin/bash"
        },
        {
          label: "🐚 Zsh",
          description: "Open Zsh shell",
          detail: "/bin/zsh"
        }
      );
    } else {
      options.push(
        {
          label: "🐧 Terminal",
          description: "Open system terminal",
          detail: "Default terminal emulator"
        },
        {
          label: "🐚 Bash",
          description: "Open Bash shell",
          detail: "/bin/bash"
        },
        {
          label: "🐚 Zsh",
          description: "Open Zsh shell", 
          detail: "/bin/zsh"
        }
      );
    }

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: `Select terminal type for ${projectName}`,
      title: "Open Terminal"
    });

    if (!selected) return;

    // Handle selection
    if (selected.label.includes("Integrated Terminal")) {
      await this.openIntegratedTerminal(workingDirectory, projectName);
    } else if (selected.label.includes("Command Prompt (Admin)")) {
      await this.openCommandPrompt(workingDirectory, projectName, true);
    } else if (selected.label.includes("Command Prompt")) {
      await this.openCommandPrompt(workingDirectory, projectName, false);
    } else if (selected.label.includes("PowerShell (Admin)")) {
      await this.openPowerShell(workingDirectory, projectName, true);
    } else if (selected.label.includes("PowerShell")) {
      await this.openPowerShell(workingDirectory, projectName, false);
    } else if (selected.label.includes("Git Bash")) {
      await this.openGitBash(workingDirectory, projectName);
    } else if (selected.label.includes("Windows Terminal")) {
      await this.openWindowsTerminal(workingDirectory, projectName, false);
    } else {
      await this.openBash(workingDirectory, projectName);
    }
  }

  // Platform-specific terminal implementations
  private async openWindowsTerminal(workingDirectory: string, projectName: string, admin: boolean): Promise<void> {
    try {
      // Try Windows Terminal first
      const wtCommand = `wt -d "${workingDirectory.replace(/"/g, '\\"')}"`;
      await execAsync(wtCommand);
      vscode.window.showInformationMessage(`✅ Opened Windows Terminal in: ${projectName}`);
    } catch (wtError) {
      // Fallback to Command Prompt
      await this.openCommandPrompt(workingDirectory, projectName, admin);
    }
  }

  private async openCommandPrompt(workingDirectory: string, projectName: string, admin: boolean): Promise<void> {
    try {
      let command: string;
      
      if (admin) {
        // Open Command Prompt as Administrator
        command = `powershell -Command "Start-Process cmd -ArgumentList '/k cd /d \\"${workingDirectory.replace(/"/g, '\\"')}\\"' -Verb RunAs"`;
      } else {
        // Open regular Command Prompt
        command = `powershell -Command "Start-Process cmd -ArgumentList '/k cd /d \\"${workingDirectory.replace(/"/g, '\\"')}\\"'"`;
        // command = `start "" cmd /k "cd /d \\"${workingDirectory.replace(/"/g, '\\"')}\\""`;  
      }

      await execAsync(command);
      const adminText = admin ? " (Admin)" : "";
      vscode.window.showInformationMessage(`✅ Opened Command Prompt${adminText} in: ${projectName}`);
    } catch (error: any) {
      throw new Error(`Command Prompt failed: ${error.message}`);
    }
  }

  private async openPowerShell(workingDirectory: string, projectName: string, admin: boolean): Promise<void> {
    try {
      let command: string;
      
      if (admin) {
        // Open PowerShell as Administrator
        command = `powershell -Command "Start-Process powershell -ArgumentList '-NoExit', '-Command', 'Set-Location \\"${workingDirectory.replace(/"/g, '\\"')}\\"' -Verb RunAs"`;
      } else {
        // Open regular PowerShell
        command = `powershell -Command "Start-Process powershell -ArgumentList '-NoExit', '-Command', 'Set-Location \\"${workingDirectory.replace(/"/g, '\\"')}\\"'"`;
      }

      await execAsync(command);
      const adminText = admin ? " (Admin)" : "";
      vscode.window.showInformationMessage(`✅ Opened PowerShell${adminText} in: ${projectName}`);
    } catch (error: any) {
      throw new Error(`PowerShell failed: ${error.message}`);
    }
  }

  private async openGitBash(workingDirectory: string, projectName: string): Promise<void> {
    try {
      const gitBashPaths = [
        'C:\\Program Files\\Git\\bin\\bash.exe',
        'C:\\Program Files\\Git\\bin\\sh.exe',
        'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
        'C:\\Program Files (x86)\\Git\\bin\\sh.exe',
        'C:\\Git\\bin\\bash.exe'
      ];

      let gitBashPath = '';
      for (const path of gitBashPaths) {
        if (fs.existsSync(path)) {
          gitBashPath = path;
          break;
        }
      }

      if (!gitBashPath) {
        // Try to find git bash in PATH
        try {
          const { stdout } = await execAsync('where git');
          const gitPath = stdout.trim().split('\n')[0];
          gitBashPath = path.join(path.dirname(gitPath), 'sh.exe');
        } catch {
          throw new Error('Git Bash not found. Please install Git for Windows.');
        }
      }

      const command = `start "" "${gitBashPath}" --cd="${workingDirectory.replace(/\\/g, '/')}"`; 
      await execAsync(command);
      vscode.window.showInformationMessage(`✅ Opened Git Bash in: ${projectName}`);
    } catch (error: any) {
      throw new Error(`Git Bash failed: ${error.message}`);
    }
  }

  private async openBash(workingDirectory: string, projectName: string): Promise<void> {
    try {
      const platform = process.platform;
      let command: string;

      if (platform === 'darwin') {
        command = `osascript -e 'tell app "Terminal" to do script "cd \\"${workingDirectory}\\""'`;
      } else {
        // Linux/Unix
        const terminals = ['gnome-terminal', 'konsole', 'xterm', 'terminator'];
        let terminalFound = false;

        for (const terminal of terminals) {
          try {
            if (terminal === 'gnome-terminal') {
              command = `${terminal} --working-directory="${workingDirectory}"`;
            } else if (terminal === 'konsole') {
              command = `${terminal} --workdir "${workingDirectory}"`;
            } else {
              command = `${terminal} -e "cd '${workingDirectory}' && bash"`;
            }
            
            await execAsync(`which ${terminal}`);
            await execAsync(command);
            terminalFound = true;
            break;
          } catch {
            continue;
          }
        }

        if (!terminalFound) {
          throw new Error('No suitable terminal found');
        }
      }

      vscode.window.showInformationMessage(`✅ Opened Bash terminal in: ${projectName}`);
    } catch (error: any) {
      throw new Error(`Bash terminal failed: ${error.message}`);
    }
  }

  private async openMacTerminal(workingDirectory: string, projectName: string): Promise<void> {
    try {
      // Try iTerm2 first, then fallback to Terminal
      try {
        const command = `osascript -e 'tell app "iTerm2" to create window with default profile command "cd \\"${workingDirectory}\\""'`;
        await execAsync(command);
        vscode.window.showInformationMessage(`✅ Opened iTerm2 in: ${projectName}`);
      } catch {
        // Fallback to Terminal
        const command = `osascript -e 'tell app "Terminal" to do script "cd \\"${workingDirectory}\\""'`;
        await execAsync(command);
        vscode.window.showInformationMessage(`✅ Opened Terminal in: ${projectName}`);
      }
    } catch (error: any) {
      throw new Error(`macOS terminal failed: ${error.message}`);
    }
  }

  private async openLinuxTerminal(workingDirectory: string, projectName: string): Promise<void> {
    try {
      const terminals = [
        { name: 'gnome-terminal', args: `--working-directory="${workingDirectory}"` },
        { name: 'konsole', args: `--workdir "${workingDirectory}"` },
        { name: 'xfce4-terminal', args: `--working-directory="${workingDirectory}"` },
        { name: 'terminator', args: `--working-directory="${workingDirectory}"` },
        { name: 'xterm', args: `-e "cd '${workingDirectory}' && bash"` }
      ];

      for (const terminal of terminals) {
        try {
          await execAsync(`which ${terminal.name}`);
          const command = `${terminal.name} ${terminal.args}`;
          await execAsync(command);
          vscode.window.showInformationMessage(`✅ Opened ${terminal.name} in: ${projectName}`);
          return;
        } catch {
          continue;
        }
      }

      throw new Error('No suitable terminal found');
    } catch (error: any) {
      throw new Error(`Linux terminal failed: ${error.message}`);
    }
  }

  /**
   * Clean up all active terminals
   */
  dispose(): void {
    this.activeTerminals.clear();
  }
}