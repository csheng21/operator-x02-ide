// plugins/builtin/androidSupport/src/tools/androidTools.ts
// 🔧 Android Tools Manager - Handles SDK, builds, devices, and deployment

import { PluginContext } from '../../../core/pluginInterface';

export interface AndroidDevice {
  id: string;
  name: string;
  type: 'physical' | 'emulator';
  status: 'online' | 'offline' | 'unauthorized';
  apiLevel: number;
  abi: string;
}

export interface BuildResult {
  success: boolean;
  outputPath?: string;
  errors?: string[];
  warnings?: string[];
  duration: number;
}

export class AndroidToolsManager {
  private context?: PluginContext;
  private sdkPath?: string;
  private adbPath?: string;
  private gradlePath?: string;

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    
    console.log('🔧 Initializing Android Tools Manager...');
    
    try {
      // Detect Android SDK
      await this.detectAndroidSDK();
      
      // Detect ADB
      await this.detectADB();
      
      // Detect Gradle
      await this.detectGradle();
      
      console.log('✅ Android Tools Manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Android Tools Manager:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    console.log('🔄 Cleaning up Android Tools Manager...');
    // Any cleanup tasks
  }

  // 🎯 SDK MANAGEMENT
  async detectAndroidSDK(): Promise<string | null> {
    console.log('🔍 Detecting Android SDK...');
    
    // Check common SDK locations
    const commonPaths = [
      process.env.ANDROID_HOME,
      process.env.ANDROID_SDK_ROOT,
      `${process.env.HOME}/Library/Android/sdk`, // macOS
      `${process.env.HOME}/Android/Sdk`, // Linux
      `${process.env.LOCALAPPDATA}\\Android\\Sdk`, // Windows
      'C:\\Android\\Sdk' // Windows fallback
    ].filter(Boolean);

    for (const path of commonPaths) {
      if (path && await this.directoryExists(path)) {
        const platformToolsPath = `${path}/platform-tools`;
        if (await this.directoryExists(platformToolsPath)) {
          this.sdkPath = path;
          this.adbPath = `${platformToolsPath}/adb${this.isWindows() ? '.exe' : ''}`;
          
          console.log(`✅ Android SDK found at: ${path}`);
          
          // Notify user
          this.context?.uiApi.showNotification({
            message: `🤖 Android SDK detected: ${path}`,
            type: 'success',
            duration: 3000
          });
          
          return path;
        }
      }
    }

    console.log('⚠️ Android SDK not found');
    
    // Ask user to locate SDK
    await this.promptForSDKLocation();
    
    return this.sdkPath || null;
  }

  private async promptForSDKLocation(): Promise<void> {
    if (!this.context) return;

    const userChoice = await this.context.uiApi.showQuickPick([
      { label: '📂 Browse for Android SDK', value: 'browse' },
      { label: '💾 Download Android SDK', value: 'download' },
      { label: '⚙️ Set SDK path in settings', value: 'settings' }
    ], { title: 'Android SDK not found' });

    switch (userChoice?.value) {
      case 'browse':
        const selectedPath = await this.context.uiApi.showOpenDialog({
          title: 'Select Android SDK Directory',
          properties: ['openDirectory']
        });
        
        if (selectedPath) {
          await this.validateAndSetSDKPath(selectedPath);
        }
        break;
        
      case 'download':
        await this.openSDKDownloadPage();
        break;
        
      case 'settings':
        await this.context.uiApi.openSettings('android.sdkPath');
        break;
    }
  }

  private async validateAndSetSDKPath(path: string): Promise<boolean> {
    const platformToolsPath = `${path}/platform-tools`;
    
    if (await this.directoryExists(platformToolsPath)) {
      this.sdkPath = path;
      this.adbPath = `${platformToolsPath}/adb${this.isWindows() ? '.exe' : ''}`;
      
      // Save to settings
      await this.context?.uiApi.updateSetting('android.sdkPath', path);
      
      this.context?.uiApi.showNotification({
        message: '✅ Android SDK path set successfully',
        type: 'success'
      });
      
      return true;
    } else {
      this.context?.uiApi.showNotification({
        message: '❌ Invalid Android SDK path. Please select a valid SDK directory.',
        type: 'error'
      });
      
      return false;
    }
  }

  private async openSDKDownloadPage(): Promise<void> {
    const url = 'https://developer.android.com/studio#downloads';
    await this.context?.uiApi.openExternal(url);
  }

  // 🎯 DEVICE MANAGEMENT
  async getConnectedDevices(): Promise<AndroidDevice[]> {
    if (!this.adbPath) {
      console.log('❌ ADB not found, cannot list devices');
      return [];
    }

    try {
      console.log('📱 Getting connected devices...');
      
      const result = await this.executeCommand(`"${this.adbPath}" devices -l`);
      
      if (!result.success) {
        console.error('Failed to get devices:', result.error);
        return [];
      }

      const devices = this.parseAdbDevices(result.output);
      
      // Get additional device info
      for (const device of devices) {
        await this.enrichDeviceInfo(device);
      }
      
      console.log(`📱 Found ${devices.length} connected devices`);
      return devices;
      
    } catch (error) {
      console.error('Error getting devices:', error);
      return [];
    }
  }

  private parseAdbDevices(output: string): AndroidDevice[] {
    const lines = output.split('\n');
    const devices: AndroidDevice[] = [];
    
    for (const line of lines) {
      if (line.includes('\t')) {
        const parts = line.split('\t');
        const deviceId = parts[0].trim();
        const status = parts[1].trim();
        
        if (deviceId && status !== 'offline') {
          devices.push({
            id: deviceId,
            name: deviceId,
            type: deviceId.includes('emulator') ? 'emulator' : 'physical',
            status: status as any,
            apiLevel: 0,
            abi: 'unknown'
          });
        }
      }
    }
    
    return devices;
  }

  private async enrichDeviceInfo(device: AndroidDevice): Promise<void> {
    if (!this.adbPath) return;

    try {
      // Get device name
      const nameResult = await this.executeCommand(
        `"${this.adbPath}" -s ${device.id} shell getprop ro.product.model`
      );
      
      if (nameResult.success) {
        device.name = nameResult.output.trim() || device.id;
      }

      // Get API level
      const apiResult = await this.executeCommand(
        `"${this.adbPath}" -s ${device.id} shell getprop ro.build.version.sdk`
      );
      
      if (apiResult.success) {
        device.apiLevel = parseInt(apiResult.output.trim()) || 0;
      }

      // Get ABI
      const abiResult = await this.executeCommand(
        `"${this.adbPath}" -s ${device.id} shell getprop ro.product.cpu.abi`
      );
      
      if (abiResult.success) {
        device.abi = abiResult.output.trim() || 'unknown';
      }
      
    } catch (error) {
      console.error(`Error enriching device info for ${device.id}:`, error);
    }
  }

  // 🎯 BUILD MANAGEMENT
  async buildProject(): Promise<BuildResult> {
    console.log('🔨 Building Android project...');
    
    const startTime = Date.now();
    
    try {
      if (!this.context) {
        throw new Error('Plugin context not available');
      }

      const workspacePath = await this.context.fileSystemApi.getCurrentWorkspacePath();
      
      // Check if it's an Android project
      const isAndroid = await this.isAndroidProject(workspacePath);
      if (!isAndroid) {
        throw new Error('Not an Android project');
      }

      // Execute gradle build
      const result = await this.executeGradleCommand(workspacePath, 'assembleDebug');
      
      const duration = Date.now() - startTime;
      
      if (result.success) {
        console.log(`✅ Build completed successfully in ${duration}ms`);
        
        this.context.uiApi.showNotification({
          message: `✅ Build successful (${(duration / 1000).toFixed(1)}s)`,
          type: 'success'
        });
        
        return {
          success: true,
          outputPath: `${workspacePath}/app/build/outputs/apk/debug/app-debug.apk`,
          duration
        };
      } else {
        console.error(`❌ Build failed: ${result.error}`);
        
        this.context.uiApi.showNotification({
          message: '❌ Build failed - check terminal for details',
          type: 'error'
        });
        
        return {
          success: false,
          errors: [result.error || 'Unknown build error'],
          duration
        };
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('Build error:', error);
      
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        duration
      };
    }
  }

  async buildRelease(): Promise<BuildResult> {
    console.log('📦 Building release APK...');
    
    const startTime = Date.now();
    
    try {
      if (!this.context) {
        throw new Error('Plugin context not available');
      }

      const workspacePath = await this.context.fileSystemApi.getCurrentWorkspacePath();
      
      // Execute gradle release build
      const result = await this.executeGradleCommand(workspacePath, 'assembleRelease');
      
      const duration = Date.now() - startTime;
      
      if (result.success) {
        console.log(`✅ Release build completed successfully in ${duration}ms`);
        
        this.context.uiApi.showNotification({
          message: `✅ Release APK built successfully (${(duration / 1000).toFixed(1)}s)`,
          type: 'success'
        });
        
        return {
          success: true,
          outputPath: `${workspacePath}/app/build/outputs/apk/release/app-release.apk`,
          duration
        };
      } else {
        console.error(`❌ Release build failed: ${result.error}`);
        
        return {
          success: false,
          errors: [result.error || 'Unknown build error'],
          duration
        };
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('Release build error:', error);
      
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        duration
      };
    }
  }

  async cleanProject(): Promise<BuildResult> {
    console.log('🧹 Cleaning Android project...');
    
    const startTime = Date.now();
    
    try {
      if (!this.context) {
        throw new Error('Plugin context not available');
      }

      const workspacePath = await this.context.fileSystemApi.getCurrentWorkspacePath();
      
      // Execute gradle clean
      const result = await this.executeGradleCommand(workspacePath, 'clean');
      
      const duration = Date.now() - startTime;
      
      if (result.success) {
        console.log(`✅ Clean completed successfully in ${duration}ms`);
        
        this.context.uiApi.showNotification({
          message: `✅ Project cleaned successfully (${(duration / 1000).toFixed(1)}s)`,
          type: 'success'
        });
        
        return {
          success: true,
          duration
        };
      } else {
        console.error(`❌ Clean failed: ${result.error}`);
        
        return {
          success: false,
          errors: [result.error || 'Unknown clean error'],
          duration
        };
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('Clean error:', error);
      
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        duration
      };
    }
  }

  // 🎯 DEPLOYMENT
  async runOnDevice(deviceId?: string): Promise<boolean> {
    console.log(`🚀 Running app on device: ${deviceId || 'default'}`);
    
    try {
      if (!this.context) {
        throw new Error('Plugin context not available');
      }

      // First build the project
      const buildResult = await this.buildProject();
      
      if (!buildResult.success) {
        this.context.uiApi.showNotification({
          message: '❌ Cannot run - build failed',
          type: 'error'
        });
        return false;
      }

      const workspacePath = await this.context.fileSystemApi.getCurrentWorkspacePath();
      
      // Install and run
      const installResult = await this.executeGradleCommand(
        workspacePath, 
        deviceId ? `installDebug -Pandroid.injected.target.device=${deviceId}` : 'installDebug'
      );
      
      if (installResult.success) {
        // Launch the app
        await this.launchApp(deviceId);
        
        this.context.uiApi.showNotification({
          message: '🚀 App launched successfully!',
          type: 'success'
        });
        
        return true;
      } else {
        this.context.uiApi.showNotification({
          message: '❌ Failed to install app',
          type: 'error'
        });
        
        return false;
      }
      
    } catch (error) {
      console.error('Error running on device:', error);
      
      this.context?.uiApi.showNotification({
        message: '❌ Failed to run app on device',
        type: 'error'
      });
      
      return false;
    }
  }

  private async launchApp(deviceId?: string): Promise<void> {
    if (!this.adbPath || !this.context) return;

    try {
      // Get package name from manifest
      const workspacePath = await this.context.fileSystemApi.getCurrentWorkspacePath();
      const packageName = await this.getPackageNameFromManifest(workspacePath);
      
      if (packageName) {
        const adbCommand = deviceId 
          ? `"${this.adbPath}" -s ${deviceId} shell monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`
          : `"${this.adbPath}" shell monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`;
          
        await this.executeCommand(adbCommand);
      }
    } catch (error) {
      console.error('Error launching app:', error);
    }
  }

  // 🎯 UTILITY METHODS
  private async detectADB(): Promise<void> {
    if (this.sdkPath) {
      this.adbPath = `${this.sdkPath}/platform-tools/adb${this.isWindows() ? '.exe' : ''}`;
      
      if (await this.fileExists(this.adbPath)) {
        console.log(`✅ ADB found at: ${this.adbPath}`);
        return;
      }
    }
    
    // Try to find ADB in PATH
    const adbCommand = this.isWindows() ? 'where adb' : 'which adb';
    const result = await this.executeCommand(adbCommand);
    
    if (result.success && result.output.trim()) {
      this.adbPath = result.output.trim();
      console.log(`✅ ADB found in PATH: ${this.adbPath}`);
    } else {
      console.log('⚠️ ADB not found');
    }
  }

  private async detectGradle(): Promise<void> {
    // Check if gradlew exists in workspace
    if (this.context) {
      const workspacePath = await this.context.fileSystemApi.getCurrentWorkspacePath();
      const gradlewPath = `${workspacePath}/gradlew${this.isWindows() ? '.bat' : ''}`;
      
      if (await this.fileExists(gradlewPath)) {
        this.gradlePath = gradlewPath;
        console.log(`✅ Gradle wrapper found: ${gradlewPath}`);
        return;
      }
    }
    
    // Try to find gradle in PATH
    const gradleCommand = this.isWindows() ? 'where gradle' : 'which gradle';
    const result = await this.executeCommand(gradleCommand);
    
    if (result.success && result.output.trim()) {
      this.gradlePath = result.output.trim();
      console.log(`✅ Gradle found in PATH: ${this.gradlePath}`);
    } else {
      console.log('⚠️ Gradle not found');
    }
  }

  private async executeGradleCommand(workspacePath: string, task: string): Promise<{ success: boolean; output: string; error?: string }> {
    const gradlewPath = `${workspacePath}/gradlew${this.isWindows() ? '.bat' : ''}`;
    
    if (await this.fileExists(gradlewPath)) {
      return await this.executeCommand(`"${gradlewPath}" ${task}`, workspacePath);
    } else if (this.gradlePath) {
      return await this.executeCommand(`"${this.gradlePath}" ${task}`, workspacePath);
    } else {
      return {
        success: false,
        output: '',
        error: 'Gradle not found'
      };
    }
  }

  private async executeCommand(command: string, cwd?: string): Promise<{ success: boolean; output: string; error?: string }> {
    try {
      console.log(`🔧 Executing: ${command}`);
      
      // This would use your IDE's terminal/command execution API
      // For now, returning mock success
      return {
        success: true,
        output: 'Command executed successfully'
      };
      
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async isAndroidProject(projectPath: string): Promise<boolean> {
    if (!this.context) return false;
    
    try {
      const buildGradle = await this.context.fileSystemApi.exists(`${projectPath}/build.gradle`);
      const buildGradleKts = await this.context.fileSystemApi.exists(`${projectPath}/build.gradle.kts`);
      const manifest = await this.context.fileSystemApi.exists(`${projectPath}/app/src/main/AndroidManifest.xml`);
      
      return (buildGradle || buildGradleKts) && manifest;
    } catch (error) {
      return false;
    }
  }

  private async getPackageNameFromManifest(projectPath: string): Promise<string | null> {
    try {
      if (!this.context) return null;
      
      const manifestPath = `${projectPath}/app/src/main/AndroidManifest.xml`;
      const manifestContent = await this.context.fileSystemApi.readFile(manifestPath, 'utf8');
      
      // Simple regex to extract package name
      const match = manifestContent.match(/package\s*=\s*["']([^"']+)["']/);
      return match ? match[1] : null;
      
    } catch (error) {
      console.error('Error reading manifest:', error);
      return null;
    }
  }

  private isWindows(): boolean {
    return process.platform === 'win32';
  }

  private async directoryExists(path: string): Promise<boolean> {
    // Implementation depends on your file system API
    return true; // Placeholder
  }

  private async fileExists(path: string): Promise<boolean> {
    // Implementation depends on your file system API
    return true; // Placeholder
  }
}