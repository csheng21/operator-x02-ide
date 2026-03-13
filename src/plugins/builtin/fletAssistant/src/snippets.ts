// src/plugins/builtin/fletAssistant/src/snippets.ts

/**
 * Register Flet code snippets
 */
export function registerSnippets(api: any): void {
  // Register snippets if supported by the editor API
  if (typeof api.editor.registerSnippets !== 'function') {
    console.warn('Snippet registration not supported by editor API');
    return;
  }
  
  try {
    api.editor.registerSnippets('python', [
      {
        name: 'ft-app',
        description: 'Flet application template',
        snippet: `import flet as ft

def main(page: ft.Page):
    # Set page properties
    page.title = "\${1:My Flet App}"
    page.padding = \${2:20}
    
    # Define controls
    \${3:title} = ft.Text("\${4:Hello, Flet!}", size=\${5:30})
    
    # Add controls to page
    page.add(
        \${3:title}
    )

ft.app(target=main)
`
      },
      {
        name: 'ft-container',
        description: 'Flet Container',
        snippet: `ft.Container(
    content=\${1:ft.Text("\${2:Content}")},
    width=\${3:200},
    height=\${4:200},
    bgcolor="\${5:#FFFFFF}",
    border_radius=\${6:10}
)`
      },
      {
        name: 'ft-row',
        description: 'Flet Row',
        snippet: `ft.Row(
    controls=[
        \${1:ft.Text("Item 1")},
        \${2:ft.Text("Item 2")}
    ],
    alignment=\${3:ft.MainAxisAlignment.CENTER}
)`
      },
      {
        name: 'ft-column',
        description: 'Flet Column',
        snippet: `ft.Column(
    controls=[
        \${1:ft.Text("Item 1")},
        \${2:ft.Text("Item 2")}
    ],
    spacing=\${3:10}
)`
      }
    ]);
    
    console.log('Flet snippets registered successfully');
  } catch (error) {
    console.error('Failed to register snippets:', error);
  }
}