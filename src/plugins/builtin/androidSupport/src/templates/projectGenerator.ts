// plugins/builtin/androidSupport/src/templates/projectGenerator.ts
// 🚀 Android Project Generator - Creates different types of Android projects

export interface AndroidProjectData {
  name: string;
  packageName: string;
  minSdk: number;
  targetSdk: number;
  compileSdk: number;
  kotlinVersion?: string;
  composeVersion?: string;
  useCompose?: boolean;
  useViewBinding?: boolean;
  architecture?: 'basic' | 'mvvm' | 'mvp' | 'clean';
}

export class AndroidProjectGenerator {
  private readonly DEFAULT_KOTLIN_VERSION = '1.9.10';
  private readonly DEFAULT_COMPOSE_VERSION = '2023.10.01';
  private readonly DEFAULT_TARGET_SDK = 34;
  private readonly DEFAULT_MIN_SDK = 24;

  async createBasicApp(projectPath: string, data: AndroidProjectData): Promise<void> {
    console.log(`🚀 Creating basic Android app at: ${projectPath}`);
    
    const projectData = this.fillDefaults(data);
    
    // Create directory structure
    await this.createDirectoryStructure(projectPath, projectData);
    
    // Generate project files
    await this.generateRootBuildGradle(projectPath, projectData);
    await this.generateAppBuildGradle(projectPath, projectData);
    await this.generateSettingsGradle(projectPath, projectData);
    await this.generateGradleProperties(projectPath);
    await this.generateGradleWrapper(projectPath);
    
    // Generate Android manifest
    await this.generateAndroidManifest(projectPath, projectData);
    
    // Generate main activity
    await this.generateMainActivity(projectPath, projectData);
    await this.generateMainActivityLayout(projectPath, projectData);
    
    // Generate resources
    await this.generateStringResources(projectPath, projectData);
    await this.generateColorResources(projectPath);
    await this.generateThemeResources(projectPath);
    
    console.log('✅ Basic Android app created successfully!');
  }

  async createMVVMApp(projectPath: string, data: AndroidProjectData): Promise<void> {
    console.log(`🏗️ Creating MVVM Android app at: ${projectPath}`);
    
    // First create basic structure
    await this.createBasicApp(projectPath, { ...data, architecture: 'mvvm' });
    
    // Add MVVM-specific dependencies and structure
    await this.addMVVMStructure(projectPath, data);
    
    console.log('✅ MVVM Android app created successfully!');
  }

  async createComposeApp(projectPath: string, data: AndroidProjectData): Promise<void> {
    console.log(`🎨 Creating Compose Android app at: ${projectPath}`);
    
    const composeData = { ...data, useCompose: true };
    
    // Create basic structure with Compose
    await this.createBasicApp(projectPath, composeData);
    
    // Replace traditional layouts with Compose
    await this.generateComposeMainActivity(projectPath, composeData);
    await this.generateComposeTheme(projectPath, composeData);
    
    console.log('✅ Compose Android app created successfully!');
  }

  async createLibrary(projectPath: string, data: AndroidProjectData): Promise<void> {
    console.log(`📚 Creating Android library at: ${projectPath}`);
    
    // Create library structure
    await this.createLibraryStructure(projectPath, data);
    
    console.log('✅ Android library created successfully!');
  }

  // Component generators for existing projects
  async createActivity(projectPath: string, activityName: string): Promise<void> {
    const packagePath = await this.getPackagePath(projectPath);
    const packageName = await this.getPackageName(projectPath);
    
    // Generate activity file
    await this.writeFile(
      `${packagePath}/${activityName}.kt`,
      this.generateActivityTemplate(activityName, packageName)
    );
    
    // Generate layout file
    await this.writeFile(
      `${projectPath}/app/src/main/res/layout/activity_${this.toSnakeCase(activityName)}.xml`,
      this.generateActivityLayoutTemplate(activityName)
    );
    
    // TODO: Update AndroidManifest.xml to register the activity
    await this.addActivityToManifest(projectPath, activityName, packageName);
  }

  async createFragment(projectPath: string, fragmentName: string): Promise<void> {
    const packagePath = await this.getPackagePath(projectPath);
    const packageName = await this.getPackageName(projectPath);
    
    // Generate fragment file
    await this.writeFile(
      `${packagePath}/${fragmentName}.kt`,
      this.generateFragmentTemplate(fragmentName, packageName)
    );
    
    // Generate layout file
    await this.writeFile(
      `${projectPath}/app/src/main/res/layout/fragment_${this.toSnakeCase(fragmentName)}.xml`,
      this.generateFragmentLayoutTemplate(fragmentName)
    );
  }

  async createService(projectPath: string, serviceName: string): Promise<void> {
    const packagePath = await this.getPackagePath(projectPath);
    const packageName = await this.getPackageName(projectPath);
    
    // Generate service file
    await this.writeFile(
      `${packagePath}/${serviceName}.kt`,
      this.generateServiceTemplate(serviceName, packageName)
    );
    
    // Add service to manifest
    await this.addServiceToManifest(projectPath, serviceName, packageName);
  }

  // Private helper methods
  private fillDefaults(data: Partial<AndroidProjectData>): AndroidProjectData {
    return {
      name: data.name || 'MyApp',
      packageName: data.packageName || 'com.example.myapp',
      minSdk: data.minSdk || this.DEFAULT_MIN_SDK,
      targetSdk: data.targetSdk || this.DEFAULT_TARGET_SDK,
      compileSdk: data.compileSdk || this.DEFAULT_TARGET_SDK,
      kotlinVersion: data.kotlinVersion || this.DEFAULT_KOTLIN_VERSION,
      composeVersion: data.composeVersion || this.DEFAULT_COMPOSE_VERSION,
      useCompose: data.useCompose || false,
      useViewBinding: data.useViewBinding || true,
      architecture: data.architecture || 'basic'
    };
  }

  private async createDirectoryStructure(projectPath: string, data: AndroidProjectData): Promise<void> {
    const dirs = [
      // Root
      `${projectPath}`,
      `${projectPath}/app`,
      `${projectPath}/gradle/wrapper`,
      
      // Source directories
      `${projectPath}/app/src/main/java/${data.packageName.replace(/\./g, '/')}`,
      `${projectPath}/app/src/main/res/layout`,
      `${projectPath}/app/src/main/res/values`,
      `${projectPath}/app/src/main/res/values-night`,
      `${projectPath}/app/src/main/res/drawable`,
      `${projectPath}/app/src/main/res/mipmap-hdpi`,
      `${projectPath}/app/src/main/res/mipmap-mdpi`,
      `${projectPath}/app/src/main/res/mipmap-xhdpi`,
      `${projectPath}/app/src/main/res/mipmap-xxhdpi`,
      `${projectPath}/app/src/main/res/mipmap-xxxhdpi`,
      
      // Test directories
      `${projectPath}/app/src/test/java/${data.packageName.replace(/\./g, '/')}`,
      `${projectPath}/app/src/androidTest/java/${data.packageName.replace(/\./g, '/')}`
    ];

    for (const dir of dirs) {
      await this.createDirectory(dir);
    }
  }

  private async generateRootBuildGradle(projectPath: string, data: AndroidProjectData): Promise<void> {
    const content = `// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    id 'com.android.application' version '8.1.2' apply false
    id 'org.jetbrains.kotlin.android' version '${data.kotlinVersion}' apply false${data.useCompose ? `
    id 'org.jetbrains.kotlin.plugin.compose' version '${data.kotlinVersion}' apply false` : ''}
}`;

    await this.writeFile(`${projectPath}/build.gradle`, content);
  }

  private async generateAppBuildGradle(projectPath: string, data: AndroidProjectData): Promise<void> {
    const content = `plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'${data.useCompose ? `
    id 'org.jetbrains.kotlin.plugin.compose'` : ''}
}

android {
    namespace '${data.packageName}'
    compileSdk ${data.compileSdk}

    defaultConfig {
        applicationId "${data.packageName}"
        minSdk ${data.minSdk}
        targetSdk ${data.targetSdk}
        versionCode 1
        versionName "1.0"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"${data.useCompose ? `
        vectorDrawables {
            useSupportLibrary true
        }` : ''}
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
    
    kotlinOptions {
        jvmTarget = '1.8'
    }${data.useViewBinding ? `
    
    buildFeatures {
        viewBinding true${data.useCompose ? `
        compose true` : ''}
    }` : ''}${data.useCompose ? `
    
    composeOptions {
        kotlinCompilerExtensionVersion '1.5.4'
    }
    
    packaging {
        resources {
            excludes += '/META-INF/{AL2.0,LGPL2.1}'
        }
    }` : ''}
}

dependencies {
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.lifecycle:lifecycle-runtime-ktx:2.7.0'${data.useCompose ? `
    implementation 'androidx.activity:activity-compose:1.8.1'
    implementation platform('androidx.compose:compose-bom:${data.composeVersion}')
    implementation 'androidx.compose.ui:ui'
    implementation 'androidx.compose.ui:ui-graphics'
    implementation 'androidx.compose.ui:ui-tooling-preview'
    implementation 'androidx.compose.material3:material3'` : `
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.10.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'`}
    
    testImplementation 'junit:junit:4.13.2'
    androidTestImplementation 'androidx.test.ext:junit:1.1.5'
    androidTestImplementation 'androidx.test.espresso:espresso-core:3.5.1'${data.useCompose ? `
    androidTestImplementation platform('androidx.compose:compose-bom:${data.composeVersion}')
    androidTestImplementation 'androidx.compose.ui:ui-test-junit4'
    debugImplementation 'androidx.compose.ui:ui-tooling'
    debugImplementation 'androidx.compose.ui:ui-test-manifest'` : ''}
}`;

    await this.writeFile(`${projectPath}/app/build.gradle`, content);
  }

  private async generateSettingsGradle(projectPath: string, data: AndroidProjectData): Promise<void> {
    const content = `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "${data.name}"
include ':app'`;

    await this.writeFile(`${projectPath}/settings.gradle`, content);
  }

  private async generateAndroidManifest(projectPath: string, data: AndroidProjectData): Promise<void> {
    const content = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <application
        android:allowBackup="true"
        android:dataExtractionRules="@xml/data_extraction_rules"
        android:fullBackupContent="@xml/backup_rules"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.${data.name.replace(/\s+/g, '')}"
        tools:targetApi="31">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"${data.useCompose ? `
            android:theme="@style/Theme.${data.name.replace(/\s+/g, '')}">` : `>
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>`}
        </activity>
        
    </application>

</manifest>`;

    await this.writeFile(`${projectPath}/app/src/main/AndroidManifest.xml`, content);
  }

  private async generateMainActivity(projectPath: string, data: AndroidProjectData): Promise<void> {
    const packagePath = `${projectPath}/app/src/main/java/${data.packageName.replace(/\./g, '/')}`;
    
    const content = `package ${data.packageName}

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity${data.useViewBinding ? `
import ${data.packageName}.databinding.ActivityMainBinding` : ''}

class MainActivity : AppCompatActivity() {${data.useViewBinding ? `
    private lateinit var binding: ActivityMainBinding` : ''}

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)${data.useViewBinding ? `
        
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        // Example: Set click listener
        binding.textView.setOnClickListener {
            binding.textView.text = "Hello from Android AI IDE!"
        }` : `
        setContentView(R.layout.activity_main)`}
    }
}`;

    await this.writeFile(`${packagePath}/MainActivity.kt`, content);
  }

  private async generateMainActivityLayout(projectPath: string, data: AndroidProjectData): Promise<void> {
    const content = `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout 
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    tools:context=".MainActivity">

    <TextView
        android:id="@+id/textView"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Hello ${data.name}!"
        android:textSize="24sp"
        android:textStyle="bold"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="parent" />

    <Button
        android:id="@+id/button"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="32dp"
        android:text="Click Me!"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toBottomOf="@+id/textView" />

</androidx.constraintlayout.widget.ConstraintLayout>`;

    await this.writeFile(`${projectPath}/app/src/main/res/layout/activity_main.xml`, content);
  }

  private async generateStringResources(projectPath: string, data: AndroidProjectData): Promise<void> {
    const content = `<resources>
    <string name="app_name">${data.name}</string>
    <string name="hello_world">Hello World!</string>
    <string name="welcome_message">Welcome to ${data.name}</string>
</resources>`;

    await this.writeFile(`${projectPath}/app/src/main/res/values/strings.xml`, content);
  }

  private async generateColorResources(projectPath: string): Promise<void> {
    const content = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="black">#FF000000</color>
    <color name="white">#FFFFFFFF</color>
    <color name="purple_200">#FFBB86FC</color>
    <color name="purple_500">#FF6200EE</color>
    <color name="purple_700">#FF3700B3</color>
    <color name="teal_200">#FF03DAC5</color>
    <color name="teal_700">#FF018786</color>
</resources>`;

    await this.writeFile(`${projectPath}/app/src/main/res/values/colors.xml`, content);
  }

  private async generateThemeResources(projectPath: string): Promise<void> {
    const content = `<resources xmlns:tools="http://schemas.android.com/tools">
    <!-- Base application theme. -->
    <style name="Base.Theme.MyApp" parent="Theme.Material3.DayNight">
        <!-- Customize your light theme here. -->
        <item name="colorPrimary">@color/purple_500</item>
    </style>

    <style name="Theme.MyApp" parent="Base.Theme.MyApp" />
</resources>`;

    await this.writeFile(`${projectPath}/app/src/main/res/values/themes.xml`, content);
  }

  // Template generators for individual components
  private generateActivityTemplate(activityName: string, packageName: string): string {
    return `package ${packageName}

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import ${packageName}.databinding.Activity${activityName.replace('Activity', '')}Binding

class ${activityName} : AppCompatActivity() {
    private lateinit var binding: Activity${activityName.replace('Activity', '')}Binding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        binding = Activity${activityName.replace('Activity', '')}Binding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setupUI()
    }
    
    private fun setupUI() {
        // TODO: Initialize your UI components here
    }
}`;
  }

  private generateFragmentTemplate(fragmentName: string, packageName: string): string {
    return `package ${packageName}

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import ${packageName}.databinding.Fragment${fragmentName.replace('Fragment', '')}Binding

class ${fragmentName} : Fragment() {
    private var _binding: Fragment${fragmentName.replace('Fragment', '')}Binding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = Fragment${fragmentName.replace('Fragment', '')}Binding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupUI()
    }
    
    private fun setupUI() {
        // TODO: Initialize your UI components here
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}`;
  }

  private generateServiceTemplate(serviceName: string, packageName: string): string {
    return `package ${packageName}

import android.app.Service
import android.content.Intent
import android.os.IBinder

class ${serviceName} : Service() {

    override fun onBind(intent: Intent): IBinder? {
        // Return null since this is not a bound service
        return null
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // TODO: Implement your service logic here
        
        return START_STICKY
    }
    
    override fun onDestroy() {
        super.onDestroy()
        // TODO: Clean up resources
    }
}`;
  }

  // Utility methods
  private toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }

  private async getPackageName(projectPath: string): Promise<string> {
    // TODO: Parse from AndroidManifest.xml or build.gradle
    return 'com.example.myapp';
  }

  private async getPackagePath(projectPath: string): Promise<string> {
    const packageName = await this.getPackageName(projectPath);
    return `${projectPath}/app/src/main/java/${packageName.replace(/\./g, '/')}`;
  }

  // File system operations (these would be implemented using your IDE's file system API)
  private async createDirectory(path: string): Promise<void> {
    // Implementation depends on your file system API
    console.log(`📁 Creating directory: ${path}`);
  }

  private async writeFile(path: string, content: string): Promise<void> {
    // Implementation depends on your file system API
    console.log(`📝 Writing file: ${path}`);
  }

  // Additional methods for MVVM, Compose, etc. would go here...
  private async addMVVMStructure(projectPath: string, data: AndroidProjectData): Promise<void> {
    // TODO: Add ViewModel, Repository, etc.
  }

  private async generateComposeMainActivity(projectPath: string, data: AndroidProjectData): Promise<void> {
    // TODO: Generate Compose-based MainActivity
  }

  private async generateComposeTheme(projectPath: string, data: AndroidProjectData): Promise<void> {
    // TODO: Generate Compose theme files
  }

  private async createLibraryStructure(projectPath: string, data: AndroidProjectData): Promise<void> {
    // TODO: Create Android library structure
  }

  private async addActivityToManifest(projectPath: string, activityName: string, packageName: string): Promise<void> {
    // TODO: Parse and update AndroidManifest.xml
  }

  private async addServiceToManifest(projectPath: string, serviceName: string, packageName: string): Promise<void> {
    // TODO: Parse and update AndroidManifest.xml
  }

  private async generateGradleProperties(projectPath: string): Promise<void> {
    const content = `# Project-wide Gradle settings.
# IDE (e.g. Android Studio) users:
# Gradle settings configured through the IDE *will override*
# any settings specified in this file.
# For more details on how to configure your build environment visit
# http://www.gradle.org/docs/current/userguide/build_environment.html

# Specifies the JVM arguments used for the daemon process.
# The setting is particularly useful for tweaking memory settings.
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8

# When configured, Gradle will run in incubating parallel mode.
# This option should only be used with decoupled projects. More details, visit
# http://www.gradle.org/docs/current/userguide/multi_project_builds.html#sec:decoupled_projects
# org.gradle.parallel=true

# AndroidX package structure to make it clearer which packages are bundled with the
# Android operating system, and which are packaged with your app's APK
# https://developer.android.com/topic/libraries/support-library/androidx-rn
android.useAndroidX=true

# Kotlin code style for this project: "official" or "obsolete":
kotlin.code.style=official

# Enables namespacing of each library's R class so that its R class includes only the
# resources declared in the library itself and none from the library's dependencies,
# thereby reducing the size of the R class for that library
android.nonTransitiveRClass=true`;

    await this.writeFile(`${projectPath}/gradle.properties`, content);
  }

  private async generateGradleWrapper(projectPath: string): Promise<void> {
    // Generate gradle wrapper files
    const gradleWrapperProperties = `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.0-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists`;

    await this.writeFile(`${projectPath}/gradle/wrapper/gradle-wrapper.properties`, gradleWrapperProperties);
  }
}