// src/directFileOpener/content/mockFileData.ts

interface MockFile {
  name: string;
  isDirectory: boolean;
}

/**
 * Get mock files for a specific directory
 */
export function getMockFilesForDirectory(dirName: string): MockFile[] {
  // Generate different files based on directory name
  switch (dirName) {
    case 'android':
      return [
        {name: 'app', isDirectory: true},
        {name: 'gradle', isDirectory: true},
        {name: 'build.gradle', isDirectory: false},
        {name: 'settings.gradle', isDirectory: false},
        {name: 'gradlew', isDirectory: false},
        {name: 'gradlew.bat', isDirectory: false}
      ];
      
    case 'ios':
      return [
        {name: 'MyApp', isDirectory: true},
        {name: 'Pods', isDirectory: true},
        {name: 'MyApp.xcodeproj', isDirectory: true},
        {name: 'Podfile', isDirectory: false},
        {name: 'Info.plist', isDirectory: false}
      ];
      
    case 'src':
      return [
        {name: 'components', isDirectory: true},
        {name: 'screens', isDirectory: true},
        {name: 'utils', isDirectory: true},
        {name: 'App.tsx', isDirectory: false},
        {name: 'index.ts', isDirectory: false}
      ];
      
    case 'components':
      return [
        {name: 'Button.tsx', isDirectory: false},
        {name: 'Card.tsx', isDirectory: false},
        {name: 'Header.tsx', isDirectory: false},
        {name: 'Footer.tsx', isDirectory: false},
        {name: 'index.ts', isDirectory: false}
      ];
      
    case 'screens':
      return [
        {name: 'Home.tsx', isDirectory: false},
        {name: 'Profile.tsx', isDirectory: false},
        {name: 'Settings.tsx', isDirectory: false},
        {name: 'index.ts', isDirectory: false}
      ];
      
    default:
      // Default files for any other directory
      return [
        {name: 'example1.ts', isDirectory: false},
        {name: 'example2.ts', isDirectory: false},
        {name: 'subfolder', isDirectory: true}
      ];
  }
}