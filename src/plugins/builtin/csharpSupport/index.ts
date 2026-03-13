class CSharpSupportPlugin {
  constructor() {
    this.id = 'csharpSupport';
    this.name = 'C# Language Support';
    this.version = '1.0.0';
    this.isActive = false;
  }

  async activate(api) {
    this.isActive = true;
    console.log('🚀 C# Support Plugin activated!');
    
    // Store templates globally for now
    window.__csharpTemplates = this.getCSharpTemplates();
    
    if (window.showNotification) {
      window.showNotification('C# support is now available!', 'success');
    }
  }

  async deactivate() {
    this.isActive = false;
    console.log('🔄 C# Support Plugin deactivated');
  }

  getCSharpTemplates() {
    return [
      {
        id: 'csharp-wpf',
        name: 'WPF Application',
        description: 'Windows Presentation Foundation application',
        icon: '🖥️',
        category: 'desktop',
        language: 'csharp',
        files: [
          {
            path: '{projectName}.csproj',
            content: `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net8.0-windows</TargetFramework>
    <UseWPF>true</UseWPF>
  </PropertyGroup>
</Project>`
          },
          {
            path: 'Program.cs',
            content: `using System.Windows;

namespace {projectName};

public partial class App : Application
{
    [STAThread]
    public static void Main()
    {
        var app = new App();
        app.Run();
    }
}`
          }
        ]
      }
    ];
  }

  getTemplates() {
    return this.getCSharpTemplates();
  }
}

// Export for your plugin system
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CSharpSupportPlugin;
} else {
  window.CSharpSupportPlugin = CSharpSupportPlugin;
}

const plugin = new CSharpSupportPlugin();