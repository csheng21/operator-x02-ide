// src-tauri/src/main.rs
// Complete Tauri v2 main.rs with all features including Arduino Integration

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod git_commands;
use git_commands::*;
use serde_json::json;
use std::fs;
use std::process::Command;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tauri::Manager;

// ================================
// WINDOWS: Hide CMD windows in production
// ================================
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

// ================================
// BUILD SYSTEM INTEGRATION MODULE
// ================================
mod build_commands;
use build_commands::*;

// SVN Integration Module
mod svn_commands;
use svn_commands::*;

// ================================
// ðŸ”Œ ARDUINO INTEGRATION MODULE
// ================================
mod arduino_commands;
use arduino_commands::*;

// ================================
// ANDROID INTEGRATION MODULE
// ================================
mod android_commands;
use android_commands::*;

// ================================
// RASPBERRY PI REMOTE MODULE
// ================================
mod pi_remote_commands;
use pi_remote_commands::*;

// ================================
// ðŸ“Š SERIAL PORT COMMANDS MODULE
// ================================
mod serial_commands;
use serial_commands::*;

// ================================
// SURGICAL EDIT ENGINE MODULE
// ================================
mod surgical_edit_commands;
use surgical_edit_commands::*;

// ================================
// SURGICAL BACKUP MANAGER MODULE
// ================================
mod surgical_backup_commands;
use surgical_backup_commands::*;

// ================================
// UNIFIED BACKUP SYSTEM MODULE
// ================================
mod unified_backup_commands;
use unified_backup_commands::*;

// ================================
// ðŸ§  IDE SCRIPT COMMANDS MODULE
// ================================
mod ide_script_commands;
use ide_script_commands::*;

mod ide_script_commands_v2;
use ide_script_commands_v2::*;

// ================================
// [GPU] NVIDIA GPU DETECTION MODULE
// ================================
mod nvidia_commands;
mod ssh_manager;
use nvidia_commands::*;

// ================================
// MAIN APPLICATION ENTRY POINT
// ================================


// ================================
// HELPER: Create command with hidden window (Windows only)
// ================================
#[cfg(target_os = "windows")]
fn create_hidden_command(program: &str) -> Command {
    let mut cmd = Command::new(program);
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

#[cfg(not(target_os = "windows"))]
fn create_hidden_command(program: &str) -> Command {
    Command::new(program)
}

// ================================
// ðŸ“ OPERATOR X02 HOME FOLDER SETUP
// ================================

/// Get the OperatorX02 home directory: C:\Users\{user}\OperatorX02
fn get_operator_home() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join("OperatorX02")
}

/// Create all required app folders on first launch
fn ensure_app_folders() {
    let base = get_operator_home();
    let folders = [
        "conversations",    // AI chat history
        "projects",         // Default project workspace
        "plugins",          // User plugins
        "backups",          // Auto-backups
        "config",           // Settings, preferences, API keys
        "logs",             // App logs
        "templates",        // Project templates
        "backups/ide_scripts", // IDE Script backups
    ];

    for folder in &folders {
        let path = base.join(folder);
        if !path.exists() {
            if let Err(e) = fs::create_dir_all(&path) {
                eprintln!("âš ï¸ Failed to create folder {}: {}", path.display(), e);
            }
        }
    }
}

/// Get the OperatorX02 home directory path
#[tauri::command]
fn get_app_home_path() -> Result<String, String> {
    Ok(get_operator_home().to_string_lossy().to_string())
}

/// Get the conversations storage path
#[tauri::command]
fn get_conversations_path() -> Result<String, String> {
    Ok(get_operator_home().join("conversations").to_string_lossy().to_string())
}

/// Get the config directory path
#[tauri::command]
fn get_config_path() -> Result<String, String> {
    Ok(get_operator_home().join("config").to_string_lossy().to_string())
}

/// Get the backups directory path
#[tauri::command]
fn get_backups_path() -> Result<String, String> {
    Ok(get_operator_home().join("backups").to_string_lossy().to_string())
}

/// Get the plugins directory path
#[tauri::command]
fn get_plugins_path() -> Result<String, String> {
    Ok(get_operator_home().join("plugins").to_string_lossy().to_string())
}

/// Get the projects directory path
#[tauri::command]
fn get_projects_path() -> Result<String, String> {
    Ok(get_operator_home().join("projects").to_string_lossy().to_string())
}

/// Get all app folder paths at once
#[tauri::command]
fn get_all_app_paths() -> Result<HashMap<String, String>, String> {
    let base = get_operator_home();
    let mut paths = HashMap::new();
    paths.insert("home".to_string(), base.to_string_lossy().to_string());
    paths.insert("conversations".to_string(), base.join("conversations").to_string_lossy().to_string());
    paths.insert("projects".to_string(), base.join("projects").to_string_lossy().to_string());
    paths.insert("plugins".to_string(), base.join("plugins").to_string_lossy().to_string());
    paths.insert("backups".to_string(), base.join("backups").to_string_lossy().to_string());
    paths.insert("config".to_string(), base.join("config").to_string_lossy().to_string());
    paths.insert("logs".to_string(), base.join("logs").to_string_lossy().to_string());
    paths.insert("templates".to_string(), base.join("templates").to_string_lossy().to_string());
    Ok(paths)
}


// =============================================================================
// STORAGE CONFIG COMMANDS  (patched by patch_storage_default.ps1)
// =============================================================================

/// Read storage config. On first install auto-creates default (Custom Folder).
#[tauri::command]
fn get_storage_config() -> Result<serde_json::Value, String> {
    let config_path = get_operator_home().join("config").join("storage.json");

    if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Read error: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Parse error: {}", e))
    } else {
        // First install: default = Custom Folder -> ~/OperatorX02/conversations
        let default_path = get_operator_home().join("conversations");
        let default_cfg = serde_json::json!({
            "mode": "custom",
            "path": default_path.to_string_lossy()
        });
        let json = serde_json::to_string_pretty(&default_cfg)
            .map_err(|e| format!("Serialize error: {}", e))?;
        fs::write(&config_path, &json)
            .map_err(|e| format!("Write error: {}", e))?;
        println!("Storage config created (first install): {}", config_path.display());
        Ok(default_cfg)
    }
}

/// Persist storage settings chosen by the user.
#[tauri::command]
fn save_storage_config(mode: String, path: Option<String>) -> Result<(), String> {
    let config_path = get_operator_home().join("config").join("storage.json");
    let val = serde_json::json!({ "mode": mode, "path": path });
    let json = serde_json::to_string_pretty(&val)
        .map_err(|e| format!("Serialize error: {}", e))?;
    fs::write(&config_path, &json)
        .map_err(|e| format!("Write error: {}", e))?;
    println!("Storage config saved: mode={}", mode);
    Ok(())
}
pub fn run() {
    tauri::Builder::default()
        // âœ… SINGLE INSTANCE PLUGIN - Prevents multiple windows opening
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            // When user tries to open second instance, focus the existing window
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
        }))
        
        // âœ… REGISTER OTHER PLUGINS
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        
        // Register ALL commands
        .manage(ssh_manager::SshState::new())
        .manage(pi_remote_commands::PiState::new())
        .invoke_handler(tauri::generate_handler![
            // CMD and PowerShell commands
            execute_build_command,
            execute_build_with_context,
            list_build_directory,
            get_build_cwd,
            kill_build_process,
            send_build_stdin,
            open_cmd,
            open_powershell,
            execute_project_script,
            open_folder,
            get_resource_path,
            
            // Path memory dialog commands
            open_folder_dialog_with_path,
            open_file_dialog_with_path,
            save_file_dialog_with_path,
            
            // Legacy dialog commands (backwards compatibility)
            open_folder_dialog,
            open_file_dialog,
            save_file_dialog_legacy,
            
            // File Explorer integration commands
            reveal_in_explorer,
            open_in_explorer,
            open_downloads_folder,
            open_terminal,
            write_clipboard,
            get_os,
            run_command,
            
            // Persistence commands for IDE state
            write_state_file,
            read_state_file,
            delete_state_file,
            get_state_directory_info,
            
            // File creation and execution commands
            save_file_dialog,
            execute_file_direct,
            delete_file,
            
            // AI API commands
            call_claude_api,
            call_claude_vision_api,
            call_ai_api,
            test_tauri_api,
            
            // File execution commands
            execute_command,
            write_file,
            get_system_info,
            check_python,
            check_node,
            get_env_var,
            get_safe_env_vars,
            
            // File operation commands
            create_directory,
            read_file_content,
            write_file_content,
            read_directory_simple,
            read_directory_detailed,
            read_directory_contents,
            read_directory_recursive,
            file_exists,
            path_exists,
            get_file_metadata,
            delete_path,
            rename_file,
            create_file,
            is_directory,
            show_message_dialog,
            get_app_info,
            close_app,
            
            // SVN Integration commands
            svn_check_installed,
            svn_status,
            svn_info,
            svn_commit,
            svn_update,
            svn_revert,
            svn_add,
            svn_delete,
            svn_diff,
            svn_log,
            svn_resolve,
            svn_cat,
            open_tortoise_svn,
            svn_cleanup,
            
            // ðŸ” AI File Explorer commands
            ai_search_files,
            ai_search_file_contents,
            ai_list_directory_recursive,
            ai_generate_tree_text,
            create_files_batch,
            
            // ðŸ”€ Git Integration commands
            git_check_installed,
            git_is_repo,
            git_is_repo_root,
            git_get_repo_root,
            git_get_config,
            git_set_config,
            git_info,
            git_status,
            git_diff,
            git_add,
            git_add_all,
            git_unstage,
            git_commit,
            git_commit_amend,
            git_push,
            git_pull,
            git_fetch,
            git_branches,
            git_branch_create,
            git_checkout,
            git_branch_delete,
            git_log,
            git_discard,
            git_revert,
            git_reset,
            git_stash,
            git_stash_pop,
            git_stash_list,
            git_init,
            git_clone,
            open_tortoise_git,
            
            // ðŸš€ Git Virtual Scrolling / Batch Operations
            git_stage,
            git_stage_all,
            git_unstage_files,
            git_unstage_all,
            git_discard_files,
            git_discard_all,
            git_status_paginated,
            git_status_count,
            git_diff_file,
            git_current_branch,
            
            // ðŸ†• Git Advanced Features - Stash Manager
            git_stash_list_detailed,
            git_stash_save,
            git_stash_apply,
            git_stash_drop,
            git_stash_clear,
            git_stash_show_files,
            git_stash_branch,
            
            // ðŸ†• Git Blame
            git_blame,
            
            // ðŸ†• Git Extended History
            git_log_extended,
            git_show_files,
            git_show,
            git_show_file,
            
            // ðŸ†• Git Merge Conflict Resolution
            git_get_conflict_files,
            git_show_version,
            git_resolve,
            git_merge_abort,
            git_merge,
            git_cherry_pick,
            
            // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            // ðŸ”Œ ARDUINO INTEGRATION COMMANDS
            // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            
            // Arduino CLI Detection
            arduino_check_cli,
            arduino_install_cli,  // NEW: Auto-install Arduino CLI
            arduino_get_config,
            arduino_init_config,
            
            // Board Detection
            arduino_list_boards,
            arduino_list_serial_ports,
            arduino_check_ch341_driver,
            
            // Compilation
            arduino_compile,
            arduino_preprocess,
            
            // Upload
            arduino_upload,
            arduino_compile_and_upload,
            
            // Core Management
            arduino_install_core,
            arduino_uninstall_core,
            arduino_list_cores,
            arduino_search_cores,
            arduino_update_core_index,
            
            // Library Management
            arduino_install_library,
            arduino_install_library_zip,
            arduino_install_library_git,
            arduino_uninstall_library,
            arduino_list_libraries,
            arduino_search_libraries,
            arduino_update_library_index,
            arduino_upgrade_libraries,
            
            // Board Manager URLs
            arduino_add_board_url,
            arduino_remove_board_url,
            arduino_list_board_urls,
            arduino_get_common_board_urls,
            
            // Serial Monitor
            arduino_serial_monitor_start,
            arduino_serial_monitor_stop,
            arduino_serial_monitor_send,
            arduino_serial_set_dtr,
            arduino_reset_board,
            
            // Sketch Management
            arduino_new_sketch,
            arduino_sketch_info,
            
            // Updates
            arduino_update_all_indexes,
            arduino_upgrade_cli,
            
            // Bootloader & Debug
            arduino_burn_bootloader,
            arduino_list_programmers,
            arduino_debug_check,
            
            // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

            // ANDROID INTEGRATION COMMANDS
            android_check_adb,
            android_get_sdk_path,
            android_list_devices,
            android_connect_wireless,
            android_disconnect,
            android_pair_device,
            android_logcat_dump,
            android_logcat_clear,
            android_get_app_pid,
            android_install_apk,
            android_uninstall_app,
            android_launch_app,
            android_force_stop,
            android_clear_data,
            android_list_packages,
            android_screenshot, install_scrcpy, install_scrcpy, launch_scrcpy, open_external_url, open_external_url, read_file_base64,
            android_shell,
            android_push_file,
            android_pull_file,
            android_open_deeplink,
            android_gradle_build,
            android_build_and_run,
            android_arduino_bridge_status,
            android_forward_port,
            android_reverse_port,
            android_install_adb,

            // ðŸ“Š SERIAL PORT COMMANDS (Monitor & Plotter)
            // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            list_serial_ports,
            serial_read_values,
            serial_read_lines,
            serial_write,
            serial_port_exists,
            serial_port_info,
            serial_get_baud_rates,
            
            // ðŸ“ App Folder Commands
            get_app_home_path,
            get_conversations_path,
            get_config_path,
            get_backups_path,
            get_plugins_path,
            get_projects_path,
            get_all_app_paths,

            // Surgical Edit Engine Commands
            surgical_recon,
            surgical_search,
            surgical_search_files,
            surgical_read_lines,
            surgical_find_block,
            surgical_edit,
            surgical_edit_batch,
            surgical_verify,
            surgical_diff_preview,
            surgical_rollback,
            surgical_list_backups,

            // Surgical Backup Manager Commands
            surgical_backup_stats,
            surgical_backup_list_all,
            surgical_backup_list_for_file,
            surgical_backup_preview,
            surgical_backup_diff,
            surgical_backup_delete,
            surgical_backup_delete_batch,
            surgical_backup_cleanup,
            surgical_backup_export,
            surgical_backup_get_dir,

            // Unified Backup System Commands
            unified_backup_list_all,
            unified_backup_list_filtered,
            unified_backup_list_for_file,
            unified_backup_stats,
            unified_backup_preview,
            unified_backup_restore,
            unified_backup_delete,
            unified_backup_cleanup,

            // ðŸ§  IDE Script Commands (AI high-level operations)
            ide_analyse,
            ide_review,
            ide_search,
            ide_patch,
            ide_patch_batch,
            ide_insert,
            ide_rollback,
            ide_script_status,

            // IDE Script v2 - File Management Commands
            ide_create_file,
            ide_create_folder,
            ide_delete,
            ide_rename,
            ide_read_file,

            // [GPU,
            ssh_manager::jetson_connect,
            ssh_manager::jetson_disconnect,
            ssh_manager::jetson_connection_status,
            ssh_manager::jetson_execute,
            ssh_manager::jetson_device_info,
            ssh_manager::jetson_upload_file,
            ssh_manager::jetson_upload_directory,
            ssh_manager::jetson_deploy_and_run,
            ssh_manager::jetson_start_monitoring,
            ssh_manager::jetson_stop_monitoring,
            ssh_manager::jetson_tegrastats_snapshot,
            ssh_manager::jetson_save_profile,
            ssh_manager::jetson_delete_profile,
            ssh_manager::jetson_list_profiles,
            ssh_manager::jetson_load_profiles,
            ssh_manager::jetson_persist_profiles,
            nvidia_check_gpu,
            nvidia_quick_poll,
            nvidia_check_cuda,
            nvidia_get_processes,

            // Android Commands
            android_list_devices,
            android_disconnect,
            android_install_apk,
            android_launch_app,
            android_gradle_build,
            android_list_packages,
            android_check_adb,
            android_install_adb,
            android_logcat_dump,
            android_logcat_clear,
            android_screenshot, install_scrcpy, install_scrcpy, launch_scrcpy, open_external_url, open_external_url, read_file_base64,
            android_reverse_port,
            // Setup Wizard
            android_check_environment,
            android_setup_install_studio,
            android_setup_install_jdk,
            android_setup_fix_env,
            android_setup_install_sdk_component,
            android_setup_download_gradle_wrapper,
            android_setup_open_sdk_manager,
            android_setup_adapt_gradle,
            android_setup_all,
            // === RASPBERRY PI COMMANDS ===
            pi_connect,
            pi_disconnect,
            pi_ping,
            pi_execute,
            pi_run_python,
            pi_list_directory,
            pi_read_file,
            pi_write_file,
            pi_delete_file,
            pi_create_directory,
            pi_upload_file,
            pi_get_system_info,
            pi_scan_network,
            pi_gpio_readall,
            pi_gpio_set,
            pi_gpio_read,
            pi_gpio_test_pin,
            pi_generate_gpio_code,
            pi_service_list,
            pi_service_control,
            pi_create_service,
            pi_service_logs,
            pi_install_package,
            pi_ensure_gpio_deps,
            pi_save_devices,
            pi_load_devices,

            // Storage Config Commands (patched by patch_storage_default.ps1)
            get_storage_config,
            save_storage_config,
        ])
         .setup(|app| {
            // âœ… Create OperatorX02 home folders on first launch
            ensure_app_folders();
            
            // âœ… Only auto-open DevTools in dev builds (F12 still works in production)
            #[cfg(debug_assertions)]
            if let Some(window) = app.get_webview_window("main") {
                window.open_devtools();
            }
            
            let home_path = get_operator_home();
            println!("â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•");
            println!("ðŸš€ AI Code IDE - Operator X02 Started Successfully!");
            println!("â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•");
            println!("ðŸ“ Home folder: {}", home_path.display());
            println!("   ðŸ’¬ Conversations: {}", home_path.join("conversations").display());
            println!("   ðŸ“‚ Projects: {}", home_path.join("projects").display());
            println!("   ðŸ”Œ Plugins: {}", home_path.join("plugins").display());
            println!("   ðŸ’¾ Backups: {}", home_path.join("backups").display());
            println!("   âš™ï¸ Config: {}", home_path.join("config").display());
            println!("ðŸ”€ Git integration enabled");
            println!("ðŸš€ Git Virtual Scrolling enabled - handles 6000+ files!");
            println!("ðŸ“‹ Git Blame integration enabled");
            println!("ðŸ“œ Git History viewer enabled");
            println!("âš¡ Git Merge conflict resolution enabled");
            println!("ðŸ“¦ Git Stash manager enabled");
            println!("ðŸ—ï¸ Build System Integration enabled!");   
            println!("   - 40+ build systems supported");   
            println!("ðŸ¤– AI API backend enabled with Claude integration");
            println!("ðŸ“¸ Claude Vision API enabled for camera analysis");
            println!("ðŸ’¾ File creation and execution commands loaded");
            println!("ðŸ“„ Persistence commands for IDE state loaded");
            println!("ðŸ“‚ File Explorer integration enabled");
            println!("ðŸ“¥ Downloads folder quick access enabled");
            println!("ðŸ“ Path memory support enabled for dialogs");
            println!("ðŸ“‹ Clipboard support enabled");
            println!("ðŸ’» Terminal integration enabled");
            println!("ðŸ–¥ï¸ CMD and PowerShell support added!");
            println!("ðŸ”„ SVN integration enabled (TortoiseSVN compatible)");
            println!("ðŸ” AI File Explorer enabled - AI can search and read files");
            println!("â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•");
            println!("===============================================================");
            println!("Android Integration Enabled!");
            println!("   - ADB device management (USB + Wi-Fi)");
            println!("   - Logcat viewer with AI analysis");
            println!("   - Gradle build + install + run pipeline");
            println!("   - Android + Arduino IoT bridge");
            println!("ðŸ”Œ Arduino Integration Enabled!");
            println!("   - Arduino CLI support");
            println!("   - CH341/CH340/FTDI/CP210x driver detection");
            println!("   - ESP32/ESP8266/STM32 board support");
            println!("   - Serial Monitor with real-time output");
            println!("   - Core & Library management");
            println!("â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•");
            println!("ðŸ“Š Serial Port Commands Enabled!");
            println!("   - Real-time Serial Monitor");
            println!("   - Serial Plotter with live graphs");
            println!("   - Send/Receive data to Arduino");
            println!("â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•");
            println!("===============================================================");
            println!("[GPU] NVIDIA GPU Detection Enabled!");
            println!("   - nvidia-smi integration");
            println!("   - CUDA toolkit detection");
            println!("   - Jetson device identification");
            println!("   - GPU status bar widget");
            println!("===============================================================");
            println!("Surgical Edit Engine Enabled!");
            println!("   - 5 edit strategies: line, block, string, insert, remove");
            println!("   - Auto-backup and rollback support");
            println!("   - Duplicate detection and syntax verification");
            println!("   - AI-integrated editing pipeline");
            println!("âœ… All plugins registered successfully!");
            println!("ðŸ”§ All systems operational!");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ================================
// STRUCTS AND TYPES
// ================================

// Struct for command execution results
#[derive(Serialize, Deserialize)]
struct CommandResult {
    stdout: String,
    stderr: String,
    success: bool,
}

// Struct for Claude API request
#[derive(Deserialize)]
struct ClaudeRequest {
    api_key: String,
    model: String,
    message: String,
    max_tokens: u32,
    temperature: f64,
}

// Struct for Claude API response
#[derive(Serialize, Deserialize)]
struct ClaudeMessage {
    role: String,
    content: String,
}

#[derive(Serialize, Deserialize)]
struct ClaudeContent {
    #[serde(rename = "type")]
    content_type: String,
    text: String,
}

#[derive(Serialize, Deserialize)]
struct ClaudeResponse {
    content: Vec<ClaudeContent>,
    model: String,
    role: String,
    stop_reason: Option<String>,
}

// Generic AI API request struct
#[derive(Deserialize)]
struct GenericAiRequest {
    provider: String,
    api_key: String,
    base_url: String,
    model: String,
    message: String,
    max_tokens: u32,
    temperature: f64,
}

// ================================
// NEW: OPEN IN CMD COMMAND
// ================================

// Open CMD at specific path (for tab context menu)
#[tauri::command]
async fn open_cmd(path: String) -> Result<(), String> {
    println!("ðŸ’» Opening CMD at: {}", path);
    
    // Clean the path for Windows
    let clean_path = path.replace("/", "\\");
    
    // Check if path exists
    if !Path::new(&clean_path).exists() {
        // If file doesn't exist, try to get parent directory
        if let Some(parent) = Path::new(&clean_path).parent() {
            if parent.exists() {
                let parent_path = parent.to_string_lossy().to_string();
                println!("ðŸ“‚ File not found, opening parent directory: {}", parent_path);
                return open_cmd_at_directory(parent_path);
            }
        }
        return Err(format!("Path does not exist: {}", clean_path));
    }
    
    // Determine if it's a file or directory
    let target_dir = if Path::new(&clean_path).is_file() {
        // If it's a file, get the parent directory
        Path::new(&clean_path)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .ok_or_else(|| "Cannot determine parent directory".to_string())?
    } else {
        // If it's a directory, use it directly
        clean_path.clone()
    };
    
    open_cmd_at_directory(target_dir)
}

// Helper function to open CMD at a directory
fn open_cmd_at_directory(directory: String) -> Result<(), String> {
    println!("ðŸ“‚ Opening CMD in directory: {}", directory);
    
    #[cfg(target_os = "windows")]
    {
        // Method 1: Try using 'start' command with cmd
        let result = Command::new("cmd")
            .args(&["/c", "start", "cmd", "/K", "cd", "/d", &directory])
            .spawn();
        
        if result.is_ok() {
            println!("âœ… CMD opened successfully using start command");
            return Ok(());
        }
        
        // Method 2: Try direct CMD spawn
        let result = Command::new("cmd")
            .args(&["/K", "cd", "/d", &directory])
            .current_dir(&directory)
            .spawn();
        
        if result.is_ok() {
            println!("âœ… CMD opened successfully using direct spawn");
            return Ok(());
        }
        
        // Method 3: Use PowerShell to open CMD
        let ps_command = format!(
            r#"Start-Process cmd -ArgumentList '/K', 'cd /d "{}"' -WorkingDirectory '{}'"#,
            directory.replace("'", "''"),
            directory.replace("'", "''")
        );
        
        let result = Command::new("powershell")
            .args(&["-WindowStyle", "Hidden", "-Command", &ps_command])
            .spawn();
        
        if result.is_ok() {
            println!("âœ… CMD opened successfully using PowerShell");
            return Ok(());
        }
        
        return Err("Failed to open CMD using all available methods".to_string());
    }
    
    #[cfg(target_os = "macos")]
    {
        // On macOS, open Terminal instead
        Command::new("open")
            .args(&["-a", "Terminal", &directory])
            .spawn()
            .map_err(|e| format!("Failed to open Terminal: {}", e))?;
            
        println!("âœ… Terminal opened successfully (macOS)");
        Ok(())
    }
    
    #[cfg(target_os = "linux")]
    {
        // On Linux, try different terminal emulators
        let terminals = ["gnome-terminal", "konsole", "xfce4-terminal", "xterm", "terminator"];
        
        for terminal in &terminals {
            let result = Command::new(terminal)
                .arg("--working-directory")
                .arg(&directory)
                .spawn();
            
            if result.is_ok() {
                println!("âœ… Terminal {} opened successfully", terminal);
                return Ok(());
            }
        }
        
        Err("No supported terminal found on Linux".to_string())
    }
}
#[tauri::command]
async fn create_directory(path: String) -> Result<(), String> {
    println!("Creating directory: {}", path);
    std::fs::create_dir_all(&path)
        .map_err(|e| format!("Failed to create directory '{}': {}", path, e))
}
// Alternative command for PowerShell
#[tauri::command]
async fn open_powershell(path: String) -> Result<(), String> {
    println!("ðŸ’» Opening PowerShell at: {}", path);
    
    let clean_path = path.replace("/", "\\");
    
    let target_dir = if Path::new(&clean_path).is_file() {
        Path::new(&clean_path)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .ok_or_else(|| "Cannot determine parent directory".to_string())?
    } else {
        clean_path.clone()
    };
    
    #[cfg(target_os = "windows")]
    {
        // Try Windows Terminal with PowerShell first
        let wt_result = Command::new("wt")
            .args(&["-d", &target_dir, "powershell"])
            .spawn();
        
        if wt_result.is_ok() {
            println!("âœ… Windows Terminal with PowerShell opened");
            return Ok(());
        }
        
        // Fallback to direct PowerShell
        Command::new("powershell")
            .args(&["-NoExit", "-Command", &format!("cd '{}'", target_dir)])
            .current_dir(&target_dir)
            .spawn()
            .map_err(|e| format!("Failed to open PowerShell: {}", e))?;
            
        println!("âœ… PowerShell opened successfully");
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        return Err("PowerShell is only available on Windows".to_string());
    }
    
    Ok(())
}

// ================================
// FILE DIALOG COMMANDS WITH PATH MEMORY
// ================================

// ============================================================================
// âœ… FIXED: Open folder dialog - Uses COM-based dialog that shows properly
// ============================================================================
#[tauri::command]
fn open_folder_dialog_with_path(default_path: Option<String>) -> Result<Option<String>, String> {
    println!("ðŸ“‚ Opening folder dialog with default path: {:?}", default_path);
    
    // âœ… FIX: Use Shell.Application COM object which is more reliable
    // This creates a proper modal dialog that appears on top
    let ps_command = if let Some(path) = &default_path {
        let clean_path = path.replace("/", "\\").replace("'", "''");
        
        // Check if path exists
        if std::path::Path::new(&clean_path).exists() {
            format!(r#"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName Microsoft.VisualBasic

# Method 1: Try modern CommonOpenFileDialog (Windows Vista+)
try {{
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

[ComImport, Guid("DC1C5A9C-E88A-4dde-A5A1-60F82A20AEF7")]
internal class FileOpenDialogRCW {{ }}

[ComImport, Guid("42f85136-db7e-439c-85f1-e4075d135fc8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IFileOpenDialog {{
    [PreserveSig] int Show([In] IntPtr hwndOwner);
    void SetFileTypes();
    void SetFileTypeIndex();
    void GetFileTypeIndex();
    void Advise();
    void Unadvise();
    void SetOptions([In] uint fos);
    void GetOptions();
    void SetDefaultFolder();
    void SetFolder([In, MarshalAs(UnmanagedType.Interface)] IShellItem psi);
    void GetFolder();
    void GetCurrentSelection();
    void SetFileName();
    void GetFileName();
    void SetTitle([In, MarshalAs(UnmanagedType.LPWStr)] string pszTitle);
    void SetOkButtonLabel();
    void SetFileNameLabel();
    void GetResult([MarshalAs(UnmanagedType.Interface)] out IShellItem ppsi);
}}

[ComImport, Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IShellItem {{
    void BindToHandler();
    void GetParent();
    [PreserveSig] int GetDisplayName([In] uint sigdnName, out IntPtr ppszName);
}}

public class FolderPicker {{
    public static string Show(string title, string defaultPath) {{
        var dialog = new FileOpenDialogRCW() as IFileOpenDialog;
        dialog.SetOptions(0x20); // FOS_PICKFOLDERS
        dialog.SetTitle(title);
        
        if (dialog.Show(IntPtr.Zero) == 0) {{
            IShellItem item;
            dialog.GetResult(out item);
            IntPtr pszName;
            item.GetDisplayName(0x80058000, out pszName);
            string path = Marshal.PtrToStringUni(pszName);
            Marshal.FreeCoTaskMem(pszName);
            return path;
        }}
        return null;
    }}
}}
'@ -ErrorAction SilentlyContinue
    
    $result = [FolderPicker]::Show('Select Project Folder', '{}')
    if ($result) {{
        Write-Output $result
        exit
    }}
}} catch {{ }}

# Method 2: Fallback to FolderBrowserDialog with TopMost window
$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
$form.WindowState = 'Minimized'
$form.Show()
$form.Hide()

$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Select Project Folder'
$dialog.ShowNewFolderButton = $true
$dialog.SelectedPath = '{}'

$result = $dialog.ShowDialog($form)
$form.Close()
$form.Dispose()

if ($result -eq [System.Windows.Forms.DialogResult]::OK) {{
    Write-Output $dialog.SelectedPath
}}
"#, clean_path, clean_path)
        } else {
            // Default path doesn't exist, use simpler dialog
            r#"
Add-Type -AssemblyName System.Windows.Forms

# Create a hidden form to act as parent (forces dialog to top)
$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
$form.WindowState = 'Minimized'
$form.Show()
$form.Hide()

$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Select Project Folder'
$dialog.ShowNewFolderButton = $true
$dialog.RootFolder = [System.Environment+SpecialFolder]::MyComputer

$result = $dialog.ShowDialog($form)
$form.Close()
$form.Dispose()

if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $dialog.SelectedPath
}
"#.to_string()
        }
    } else {
        // No default path provided
        r#"
Add-Type -AssemblyName System.Windows.Forms

# Create a hidden form to act as parent (forces dialog to top)
$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
$form.WindowState = 'Minimized'
$form.Show()
$form.Hide()

$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Select Project Folder'
$dialog.ShowNewFolderButton = $true
$dialog.RootFolder = [System.Environment+SpecialFolder]::MyComputer

$result = $dialog.ShowDialog($form)
$form.Close()
$form.Dispose()

if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $dialog.SelectedPath
}
"#.to_string()
    };
    
    println!("ðŸ”„ Executing PowerShell dialog command...");
    
    // âœ… FIX: Don't use -WindowStyle Hidden for the main process
    // This ensures the dialog can properly capture focus
    let output = create_hidden_command("powershell")
        .args(&[
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command", &ps_command
        ])
        .output()
        .map_err(|e| {
            println!("âŒ Failed to execute PowerShell: {}", e);
            format!("Failed to execute dialog: {}", e)
        })?;
    
    // Log any errors
    if !output.stderr.is_empty() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        println!("âš ï¸ PowerShell stderr: {}", stderr);
    }
    
    let binding = String::from_utf8_lossy(&output.stdout);
    let path = binding.trim();
    
    println!("ðŸ“‚ Folder dialog result: '{}'", path);
    
    if path.is_empty() {
        println!("â„¹ï¸ User cancelled folder dialog or no path selected");
        Ok(None)
    } else {
        println!("âœ… Folder selected: {}", path);
        Ok(Some(path.to_string()))
    }
}

// ============================================================================
// âœ… FIXED: Open file dialog - Shows properly on top
// ============================================================================
#[tauri::command]
fn open_file_dialog_with_path(default_path: Option<String>) -> Result<Option<String>, String> {
    println!("ðŸ“„ Opening file dialog with default path: {:?}", default_path);
    
    let ps_command = if let Some(path) = default_path {
        let clean_path = path.replace("/", "\\");
        let initial_dir = if std::path::Path::new(&clean_path).is_dir() {
            clean_path.clone()
        } else {
            // If it's a file path, get the parent directory
            std::path::Path::new(&clean_path)
                .parent()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|| clean_path.clone())
        };
        
        if std::path::Path::new(&initial_dir).exists() {
            format!(r#"
Add-Type -AssemblyName System.Windows.Forms

# Create a hidden form to act as parent (forces dialog to top)
$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
$form.WindowState = 'Minimized'
$form.Show()
$form.Hide()

$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = 'Select File to Open'
$dialog.InitialDirectory = '{}'
$dialog.Filter = 'All Files (*.*)|*.*|Code Files (*.js;*.ts;*.py;*.rs;*.html;*.css)|*.js;*.ts;*.py;*.rs;*.html;*.css|Text Files (*.txt)|*.txt|JSON Files (*.json)|*.json'
$dialog.FilterIndex = 1
$dialog.Multiselect = $false

$result = $dialog.ShowDialog($form)
$form.Close()
$form.Dispose()

if ($result -eq [System.Windows.Forms.DialogResult]::OK) {{
    Write-Output $dialog.FileName
}}
"#, initial_dir.replace("'", "''"))
        } else {
            // Default path doesn't exist
            r#"
Add-Type -AssemblyName System.Windows.Forms

$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
$form.WindowState = 'Minimized'
$form.Show()
$form.Hide()

$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = 'Select File to Open'
$dialog.Filter = 'All Files (*.*)|*.*|Code Files (*.js;*.ts;*.py;*.rs;*.html;*.css)|*.js;*.ts;*.py;*.rs;*.html;*.css|Text Files (*.txt)|*.txt|JSON Files (*.json)|*.json'
$dialog.FilterIndex = 1
$dialog.Multiselect = $false

$result = $dialog.ShowDialog($form)
$form.Close()
$form.Dispose()

if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $dialog.FileName
}
"#.to_string()
        }
    } else {
        // No default path
        r#"
Add-Type -AssemblyName System.Windows.Forms

$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
$form.WindowState = 'Minimized'
$form.Show()
$form.Hide()

$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = 'Select File to Open'
$dialog.Filter = 'All Files (*.*)|*.*|Code Files (*.js;*.ts;*.py;*.rs;*.html;*.css)|*.js;*.ts;*.py;*.rs;*.html;*.css|Text Files (*.txt)|*.txt|JSON Files (*.json)|*.json'
$dialog.FilterIndex = 1
$dialog.Multiselect = $false

$result = $dialog.ShowDialog($form)
$form.Close()
$form.Dispose()

if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $dialog.FileName
}
"#.to_string()
    };
    
    println!("ðŸ”„ Executing file dialog command...");
    
    let output = create_hidden_command("powershell")
        .args(&[
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command", &ps_command
        ])
        .output()
        .map_err(|e| {
            println!("âŒ Failed to execute PowerShell: {}", e);
            format!("Failed to execute dialog: {}", e)
        })?;
    
    if !output.stderr.is_empty() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        println!("âš ï¸ PowerShell stderr: {}", stderr);
    }
    
    let binding = String::from_utf8_lossy(&output.stdout);
    let path = binding.trim();
    
    println!("ðŸ“„ File dialog result: '{}'", path);
    
    if path.is_empty() {
        Ok(None)
    } else {
        Ok(Some(path.to_string()))
    }
}

// ============================================================================
// âœ… FIXED: Save file dialog - Shows properly on top
// ============================================================================
#[tauri::command]
fn save_file_dialog_with_path(default_name: String, default_path: Option<String>) -> Result<Option<String>, String> {
    println!("ðŸ’¾ Opening save file dialog - name: {}, path: {:?}", default_name, default_path);
    
    let ps_command = if let Some(path) = default_path {
        let clean_path = path.replace("/", "\\");
        let initial_dir = if std::path::Path::new(&clean_path).is_dir() {
            clean_path.clone()
        } else {
            std::path::Path::new(&clean_path)
                .parent()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|| clean_path.clone())
        };
        
        if std::path::Path::new(&initial_dir).exists() {
            format!(r#"
Add-Type -AssemblyName System.Windows.Forms

$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
$form.WindowState = 'Minimized'
$form.Show()
$form.Hide()

$dialog = New-Object System.Windows.Forms.SaveFileDialog
$dialog.Title = 'Save File As'
$dialog.InitialDirectory = '{}'
$dialog.FileName = '{}'
$dialog.Filter = 'All Files (*.*)|*.*|Python Files (*.py)|*.py|JavaScript Files (*.js)|*.js|TypeScript Files (*.ts)|*.ts|Text Files (*.txt)|*.txt|HTML Files (*.html)|*.html|CSS Files (*.css)|*.css|JSON Files (*.json)|*.json'
$dialog.FilterIndex = 1
$dialog.AddExtension = $true

$result = $dialog.ShowDialog($form)
$form.Close()
$form.Dispose()

if ($result -eq [System.Windows.Forms.DialogResult]::OK) {{
    Write-Output $dialog.FileName
}}
"#, initial_dir.replace("'", "''"), default_name.replace("'", "''"))
        } else {
            // Path doesn't exist, use standard
            format!(r#"
Add-Type -AssemblyName System.Windows.Forms

$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
$form.WindowState = 'Minimized'
$form.Show()
$form.Hide()

$dialog = New-Object System.Windows.Forms.SaveFileDialog
$dialog.Title = 'Save File As'
$dialog.FileName = '{}'
$dialog.Filter = 'All Files (*.*)|*.*|Python Files (*.py)|*.py|JavaScript Files (*.js)|*.js|TypeScript Files (*.ts)|*.ts|Text Files (*.txt)|*.txt|HTML Files (*.html)|*.html|CSS Files (*.css)|*.css|JSON Files (*.json)|*.json'
$dialog.FilterIndex = 1
$dialog.AddExtension = $true

$result = $dialog.ShowDialog($form)
$form.Close()
$form.Dispose()

if ($result -eq [System.Windows.Forms.DialogResult]::OK) {{
    Write-Output $dialog.FileName
}}
"#, default_name.replace("'", "''"))
        }
    } else {
        format!(r#"
Add-Type -AssemblyName System.Windows.Forms

$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
$form.WindowState = 'Minimized'
$form.Show()
$form.Hide()

$dialog = New-Object System.Windows.Forms.SaveFileDialog
$dialog.Title = 'Save File As'
$dialog.FileName = '{}'
$dialog.Filter = 'All Files (*.*)|*.*|Python Files (*.py)|*.py|JavaScript Files (*.js)|*.js|TypeScript Files (*.ts)|*.ts|Text Files (*.txt)|*.txt|HTML Files (*.html)|*.html|CSS Files (*.css)|*.css|JSON Files (*.json)|*.json'
$dialog.FilterIndex = 1
$dialog.AddExtension = $true

$result = $dialog.ShowDialog($form)
$form.Close()
$form.Dispose()

if ($result -eq [System.Windows.Forms.DialogResult]::OK) {{
    Write-Output $dialog.FileName
}}
"#, default_name.replace("'", "''"))
    };
    
    let output = create_hidden_command("powershell")
        .args(&[
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command", &ps_command
        ])
        .output()
        .map_err(|e| format!("Failed to execute save dialog: {}", e))?;
    
    let binding = String::from_utf8_lossy(&output.stdout);
    let path = binding.trim();
    
    println!("ðŸ’¾ Save dialog result: '{}'", path);
    
    if path.is_empty() {
        Ok(None)
    } else {
        Ok(Some(path.to_string()))
    }
}

// ================================
// LEGACY DIALOG COMMANDS (for backwards compatibility)
// ================================

// Legacy open folder dialog (without path)
#[tauri::command]
fn open_folder_dialog() -> Result<Option<String>, String> {
    open_folder_dialog_with_path(None)
}

// Legacy open file dialog (without path)
#[tauri::command]
fn open_file_dialog() -> Result<Option<String>, String> {
    open_file_dialog_with_path(None)
}

// Legacy save file dialog
#[tauri::command]
fn save_file_dialog_legacy(default_name: Option<String>) -> Result<Option<String>, String> {
    let name = default_name.unwrap_or_else(|| "untitled.txt".to_string());
    save_file_dialog_with_path(name, None)
}

// ================================
// FILE EXPLORER COMMANDS
// ================================

// Open file or folder in system file explorer (reveal in explorer)
#[tauri::command]
async fn reveal_in_explorer(path: String) -> Result<(), String> {
    println!("ðŸ“‚ Revealing in system explorer: {}", path);
    
    // Clean the path for the current OS
    let clean_path = if cfg!(target_os = "windows") {
        path.replace("/", "\\")
    } else {
        path.replace("\\", "/")
    };
    
    #[cfg(target_os = "windows")]
    {
        // Check if path exists
        if !Path::new(&clean_path).exists() {
            return Err(format!("Path does not exist: {}", clean_path));
        }
        
        // Check if it's a directory or file
        if Path::new(&clean_path).is_dir() {
            // Open the folder directly
            println!("Opening folder: {}", clean_path);
            Command::new("explorer")
                .arg(&clean_path)
                .spawn()
                .map_err(|e| format!("Failed to open explorer: {}", e))?;
        } else {
            // If it's a file, open parent folder and select the file
            println!("Opening and selecting file: {}", clean_path);
            Command::new("explorer")
                .args(&["/select,", &clean_path])
                .spawn()
                .map_err(|e| format!("Failed to open explorer: {}", e))?;
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        if Path::new(&clean_path).is_dir() {
            Command::new("open")
                .arg(&clean_path)
                .spawn()
                .map_err(|e| format!("Failed to open Finder: {}", e))?;
        } else {
            // Reveal in Finder
            Command::new("open")
                .args(&["-R", &clean_path])
                .spawn()
                .map_err(|e| format!("Failed to reveal in Finder: {}", e))?;
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        // Try different file managers
        let file_managers = ["nautilus", "dolphin", "nemo", "thunar", "pcmanfm"];
        let mut opened = false;
        
        for fm in &file_managers {
            if let Ok(_) = create_hidden_command("which").arg(fm).output() {
                let result = if Path::new(&clean_path).is_dir() {
                    Command::new(fm).arg(&clean_path).spawn()
                } else {
                    // Try to select the file
                    Command::new(fm)
                        .args(&["--select", &clean_path])
                        .spawn()
                };
                
                if result.is_ok() {
                    opened = true;
                    break;
                }
            }
        }
        
        // Fallback to xdg-open
        if !opened {
            Command::new("xdg-open")
                .arg(&clean_path)
                .spawn()
                .map_err(|e| format!("Failed to open file manager: {}", e))?;
        }
    }
    
    println!("âœ… Successfully opened in system explorer");
    Ok(())
}

// Alias for compatibility
#[tauri::command]
async fn open_in_explorer(path: String) -> Result<(), String> {
    reveal_in_explorer(path).await
}

// ================================
// OPEN DOWNLOADS FOLDER COMMAND
// ================================
// Opens the system Downloads folder in the file explorer
#[tauri::command]
async fn open_downloads_folder() -> Result<(), String> {
    println!("ðŸ“‚ Opening Downloads folder...");
    
    // Get the downloads directory using the dirs crate
    let downloads_path = dirs::download_dir()
        .ok_or_else(|| "Could not determine Downloads directory".to_string())?;
    
    let downloads_str = downloads_path.to_string_lossy().to_string();
    println!("ðŸ“ Downloads path: {}", downloads_str);
    
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&downloads_str)
            .spawn()
            .map_err(|e| format!("Failed to open Downloads folder: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&downloads_str)
            .spawn()
            .map_err(|e| format!("Failed to open Downloads folder: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&downloads_str)
            .spawn()
            .map_err(|e| format!("Failed to open Downloads folder: {}", e))?;
    }
    
    println!("âœ… Successfully opened Downloads folder");
    Ok(())
}

// Open terminal at specific path (existing command, kept for compatibility)
#[tauri::command]
async fn open_terminal(path: String) -> Result<(), String> {
    println!("ðŸ’» Opening terminal at: {}", path);
    
    let clean_path = if cfg!(target_os = "windows") {
        path.replace("/", "\\")
    } else {
        path.replace("\\", "/")
    };
    
    #[cfg(target_os = "windows")]
    {
        // Try Windows Terminal first, then cmd
        let wt_result = Command::new("wt")
            .args(&["-d", &clean_path])
            .spawn();
        
        if wt_result.is_err() {
            // Fallback to cmd
            Command::new("cmd")
                .args(&["/c", "start", "cmd", "/k", "cd", "/d", &clean_path])
                .spawn()
                .map_err(|e| format!("Failed to open terminal: {}", e))?;
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args(&["-a", "Terminal", &clean_path])
            .spawn()
            .map_err(|e| format!("Failed to open Terminal: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        // Try different terminals
        let terminals = ["gnome-terminal", "konsole", "xfce4-terminal", "xterm"];
        let mut opened = false;
        
        for term in &terminals {
            if let Ok(_) = create_hidden_command("which").arg(term).output() {
                let result = Command::new(term)
                    .arg("--working-directory")
                    .arg(&clean_path)
                    .spawn();
                
                if result.is_ok() {
                    opened = true;
                    break;
                }
            }
        }
        
        if !opened {
            return Err("No supported terminal found".to_string());
        }
    }
    
    println!("âœ… Terminal opened successfully");
    Ok(())
}

// Write to clipboard
#[tauri::command]
async fn write_clipboard(text: String) -> Result<(), String> {
    println!("ðŸ“‹ Writing to clipboard: {} chars", text.len());
    
    #[cfg(target_os = "windows")]
    {
        let ps_command = format!(r#"
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.Clipboard]::SetText('{}')
        "#, text.replace("'", "''"));
        
        create_hidden_command("powershell")
            .args(&["-WindowStyle", "Hidden", "-Command", &ps_command])
            .output()
            .map_err(|e| format!("Failed to write to clipboard: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        use std::io::Write;
        let mut child = create_hidden_command("pbcopy")
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start pbcopy: {}", e))?;
        
        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(text.as_bytes())
                .map_err(|e| format!("Failed to write to clipboard: {}", e))?;
        }
        
        child.wait().map_err(|e| format!("Failed to wait for pbcopy: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        use std::io::Write;
        let mut child = create_hidden_command("xclip")
            .args(&["-selection", "clipboard"])
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start xclip: {}", e))?;
        
        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(text.as_bytes())
                .map_err(|e| format!("Failed to write to clipboard: {}", e))?;
        }
        
        child.wait().map_err(|e| format!("Failed to wait for xclip: {}", e))?;
    }
    
    println!("âœ… Clipboard updated successfully");
    Ok(())
}

// Get operating system type
#[tauri::command]
fn get_os() -> String {
    #[cfg(target_os = "windows")]
    return "windows".to_string();
    
    #[cfg(target_os = "macos")]
    return "macos".to_string();
    
    #[cfg(target_os = "linux")]
    return "linux".to_string();
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    return "unknown".to_string();
}

// Run system command with arguments
#[tauri::command]
async fn run_command(command: String, args: Vec<String>) -> Result<(), String> {
    println!("ðŸ”§ Running command: {} with args: {:?}", command, args);
    
    create_hidden_command(&command)
        .args(&args)
        .spawn()
        .map_err(|e| format!("Failed to run command '{}': {}", command, e))?;
    
    Ok(())
}

// ================================
// PERSISTENCE COMMANDS
// ================================

// Write state file for IDE persistence
#[tauri::command]
async fn write_state_file(filename: String, content: String) -> Result<(), String> {
    println!("ðŸ’¾ Writing state file: {} (content length: {})", filename, content.len());
    
    use std::env;
    
    // Get app data directory
    let app_data_dir = if cfg!(target_os = "windows") {
        env::var("APPDATA").unwrap_or_else(|_| {
            env::var("USERPROFILE")
                .map(|profile| format!("{}\\AppData\\Roaming", profile))
                .unwrap_or_else(|_| "C:\\Users\\Public".to_string())
        })
    } else {
        env::var("HOME")
            .map(|home| format!("{}/.config", home))
            .unwrap_or_else(|_| "/tmp".to_string())
    };
    
    // Create IDE state directory
    let state_dir = format!("{}/ai-code-ide", app_data_dir);
    
    fs::create_dir_all(&state_dir)
        .map_err(|e| format!("Failed to create state directory '{}': {}", state_dir, e))?;
    
    // Write state file
    let file_path = format!("{}/{}", state_dir, filename);
    
    fs::write(&file_path, content)
        .map_err(|e| format!("Failed to write state file '{}': {}", file_path, e))?;
    
    println!("âœ… State file written successfully: {}", file_path);
    Ok(())
}

// Read state file for IDE persistence
#[tauri::command]
async fn read_state_file(filename: String) -> Result<String, String> {
    println!("ðŸ“‚ Reading state file: {}", filename);
    
    use std::env;
    
    // Get app data directory
    let app_data_dir = if cfg!(target_os = "windows") {
        env::var("APPDATA").unwrap_or_else(|_| {
            env::var("USERPROFILE")
                .map(|profile| format!("{}\\AppData\\Roaming", profile))
                .unwrap_or_else(|_| "C:\\Users\\Public".to_string())
        })
    } else {
        env::var("HOME")
            .map(|home| format!("{}/.config", home))
            .unwrap_or_else(|_| "/tmp".to_string())
    };
    
    let file_path = format!("{}/ai-code-ide/{}", app_data_dir, filename);
    
    // Check if file exists
    if !Path::new(&file_path).exists() {
        return Err(format!("State file does not exist: {}", file_path));
    }
    
    // Read state file
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read state file '{}': {}", file_path, e))?;
    
    println!("âœ… State file read successfully: {} ({} bytes)", file_path, content.len());
    Ok(content)
}

// Delete state file for IDE persistence
#[tauri::command]
async fn delete_state_file(filename: String) -> Result<(), String> {
    println!("ðŸ—‘ï¸ Deleting state file: {}", filename);
    
    use std::env;
    
    let app_data_dir = if cfg!(target_os = "windows") {
        env::var("APPDATA").unwrap_or_else(|_| {
            env::var("USERPROFILE")
                .map(|profile| format!("{}\\AppData\\Roaming", profile))
                .unwrap_or_else(|_| "C:\\Users\\Public".to_string())
        })
    } else {
        env::var("HOME")
            .map(|home| format!("{}/.config", home))
            .unwrap_or_else(|_| "/tmp".to_string())
    };
    
    let file_path = format!("{}/ai-code-ide/{}", app_data_dir, filename);
    
    if Path::new(&file_path).exists() {
        fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete state file '{}': {}", file_path, e))?;
        
        println!("âœ… State file deleted successfully: {}", file_path);
    } else {
        println!("â„¹ï¸ State file does not exist, nothing to delete: {}", file_path);
    }
    
    Ok(())
}

// Get state directory info for debugging
#[tauri::command]
async fn get_state_directory_info() -> Result<serde_json::Value, String> {
    use std::env;
    
    let app_data_dir = if cfg!(target_os = "windows") {
        env::var("APPDATA").unwrap_or_else(|_| {
            env::var("USERPROFILE")
                .map(|profile| format!("{}\\AppData\\Roaming", profile))
                .unwrap_or_else(|_| "C:\\Users\\Public".to_string())
        })
    } else {
        env::var("HOME")
            .map(|home| format!("{}/.config", home))
            .unwrap_or_else(|_| "/tmp".to_string())
    };
    
    let state_dir = format!("{}/ai-code-ide", app_data_dir);
    let state_dir_exists = Path::new(&state_dir).exists();
    
    // List files in state directory if it exists
    let mut files = Vec::new();
    if state_dir_exists {
        if let Ok(entries) = fs::read_dir(&state_dir) {
            for entry in entries {
                if let Ok(entry) = entry {
                    let file_name = entry.file_name().to_string_lossy().to_string();
                    if let Ok(metadata) = entry.metadata() {
                        files.push(json!({
                            "name": file_name,
                            "size": metadata.len(),
                            "modified": metadata.modified()
                                .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs())
                                .unwrap_or(0)
                        }));
                    }
                }
            }
        }
    }
    
    Ok(json!({
        "app_data_dir": app_data_dir,
        "state_dir": state_dir,
        "state_dir_exists": state_dir_exists,
        "files": files
    }))
}

// ================================
// FILE CREATION AND EXECUTION COMMANDS
// ================================

// Save file dialog with proper path handling (legacy)
#[tauri::command]
async fn save_file_dialog(filename: String, content: String) -> Result<String, String> {
    println!("ðŸš€ Save file dialog - Filename: {}, Content length: {}", filename, content.len());
    
    let output = create_hidden_command("powershell")
        .args(&[
            "-WindowStyle", "Hidden",
            "-Command",
            &format!(r#"
            Add-Type -AssemblyName System.Windows.Forms
            $dialog = New-Object System.Windows.Forms.SaveFileDialog
            $dialog.Title = 'Save File As'
            $dialog.Filter = 'All Files (*.*)|*.*|Python Files (*.py)|*.py|JavaScript Files (*.js)|*.js|TypeScript Files (*.ts)|*.ts|Text Files (*.txt)|*.txt|HTML Files (*.html)|*.html|CSS Files (*.css)|*.css|JSON Files (*.json)|*.json'
            $dialog.FilterIndex = 1
            $dialog.FileName = '{}'
            $dialog.AddExtension = $true
            if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {{
                $path = $dialog.FileName
                [System.IO.File]::WriteAllText($path, @'
{}
'@)
                Write-Output $path
            }}
            "#, filename, content.replace("'", "''")) // Escape single quotes for PowerShell
        ])
        .output()
        .map_err(|e| format!("Failed to execute save dialog: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Save dialog failed: {}", stderr));
    }
    
    let binding = String::from_utf8_lossy(&output.stdout);
    let path = binding.trim();
    
    println!("âœ… File saved to: {}", path);
    
    if path.is_empty() {
        Err("User cancelled save dialog".to_string())
    } else {
        Ok(path.to_string())
    }
}

// Direct file execution with proper error handling
#[tauri::command]
async fn execute_file_direct(path: String, extension: String) -> Result<String, String> {
    println!("ðŸš€ Executing file: {} (extension: {})", path, extension);
    
    // Check if file exists first
    if !Path::new(&path).exists() {
        return Err(format!("âŒ File not found: {}", path));
    }
    
    // Get file size for verification
    let metadata = fs::metadata(&path).map_err(|e| format!("Failed to read file metadata: {}", e))?;
    println!("ðŸ“‹ File size: {} bytes", metadata.len());
    
    // Determine command based on file extension
    let (command, args) = match extension.as_str() {
        "py" => ("python", vec![path.clone()]),
        "js" => ("node", vec![path.clone()]),
        "ts" => ("ts-node", vec![path.clone()]),
        "java" => {
            // For Java, we need to compile first
            let class_name = Path::new(&path)
                .file_stem()
                .unwrap()
                .to_string_lossy()
                .to_string();
            ("java", vec![class_name])
        },
        "cpp" | "c" => {
            // For C/C++, compile and run
            let exe_path = path.replace(&format!(".{}", extension), ".exe");
            return compile_and_run_cpp(&path, &exe_path, &extension).await;
        },
        "cs" => ("dotnet", vec!["run".to_string()]),
        "go" => ("go", vec!["run".to_string(), path.clone()]),
        "rs" => ("cargo", vec!["run".to_string()]),
        _ => return Err(format!("âŒ Unsupported file extension: {}", extension))
    };
    
    println!("ðŸ“‹ Executing command: {} with args: {:?}", command, args);
    
    // Set working directory to file's directory
    let working_dir = Path::new(&path).parent().unwrap_or(Path::new("."));
    println!("ðŸ“‚ Working directory: {:?}", working_dir);
    
    // Execute command
    let mut cmd = create_hidden_command(command);
    cmd.current_dir(working_dir);
    
    // Add arguments
    for arg in args {
        cmd.arg(arg);
    }
    
    // Set environment variables for better compatibility
    cmd.env("PYTHONUNBUFFERED", "1"); // For Python output
    cmd.env("NODE_NO_WARNINGS", "1"); // Reduce Node.js warnings
    
    match cmd.output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            
            println!("ðŸ”¤ Command exit code: {:?}", output.status.code());
            println!("ðŸ”¤ Stdout length: {}", stdout.len());
            println!("ðŸ”¤ Stderr length: {}", stderr.len());
            
            if output.status.success() {
                let result = if stdout.trim().is_empty() && !stderr.trim().is_empty() {
                    // Some programs output to stderr even on success
                    format!("âœ… Execution completed:\n{}", stderr)
                } else {
                    format!("âœ… Execution completed:\n{}", stdout)
                };
                println!("âœ… Execution successful");
                Ok(result)
            } else {
                let error_msg = if !stderr.trim().is_empty() {
                    stderr.to_string()
                } else {
                    stdout.to_string()
                };
                println!("âŒ Execution failed: {}", error_msg);
                Err(format!("âŒ Execution failed:\n{}", error_msg))
            }
        }
        Err(e) => {
            eprintln!("âŒ Failed to execute command '{}': {}", command, e);
            Err(format!("âŒ Failed to execute command '{}': {}\nðŸ’¡ Make sure {} is installed and in your PATH", command, e, command))
        }
    }
}

// Helper function for C/C++ compilation and execution
async fn compile_and_run_cpp(source_path: &str, exe_path: &str, extension: &str) -> Result<String, String> {
    let compiler = if extension == "cpp" { "g++" } else { "gcc" };
    
    println!("ðŸ”¨ Compiling {} file: {}", extension.to_uppercase(), source_path);
    
    // Compile first
    let compile_result = create_hidden_command(compiler)
        .args(&["-o", exe_path, source_path])
        .output();
    
    match compile_result {
        Ok(output) => {
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("âŒ Compilation failed:\n{}", stderr));
            }
            println!("âœ… Compilation successful");
        }
        Err(e) => {
            return Err(format!("âŒ Failed to run compiler '{}': {}", compiler, e));
        }
    }
    
    // Run the compiled executable
    println!("ðŸš€ Running compiled executable: {}", exe_path);
    match create_hidden_command(exe_path).output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            
            // Clean up executable
            let _ = fs::remove_file(exe_path);
            
            if output.status.success() {
                Ok(format!("âœ… Compilation and execution successful:\n{}", stdout))
            } else {
                Err(format!("âŒ Execution failed:\n{}\n{}", stderr, stdout))
            }
        }
        Err(e) => {
            // Clean up executable even if execution failed
            let _ = fs::remove_file(exe_path);
            Err(format!("âŒ Failed to execute compiled program: {}", e))
        }
    }
}

// Delete file with proper path handling
#[tauri::command]
async fn delete_file(path: String) -> Result<String, String> {
    println!("ðŸ—‘ï¸ Deleting file: {}", path);
    
    if !Path::new(&path).exists() {
        return Ok(format!("File already deleted or does not exist: {}", path));
    }
    
    match fs::remove_file(&path) {
        Ok(_) => {
            println!("âœ… File deleted: {}", path);
            Ok(format!("File deleted: {}", path))
        }
        Err(e) => {
            eprintln!("âŒ Failed to delete file {}: {}", path, e);
            Err(format!("Failed to delete file: {}", e))
        }
    }
}

// ================================
// AI API COMMANDS
// ================================

// Tauri command for Claude API calls
#[tauri::command]
async fn call_claude_api(request: ClaudeRequest) -> Result<String, String> {
    println!("ðŸ¤– Calling Claude API via Tauri backend...");
    println!("Model: {}, Message length: {}", request.model, request.message.len());
    
    let client = reqwest::Client::new();
    
    // Prepare request body
    let mut request_body = HashMap::new();
    request_body.insert("model", serde_json::Value::String(request.model.clone()));
    request_body.insert("max_tokens", serde_json::Value::Number(serde_json::Number::from(request.max_tokens)));
    request_body.insert("temperature", serde_json::json!(request.temperature));
    
    // Create messages array
    let messages = vec![
        serde_json::json!({
            "role": "user",
            "content": request.message
        })
    ];
    request_body.insert("messages", serde_json::Value::Array(messages));
    
    println!("ðŸ“¤ Sending request to Claude API...");
    
    // Make the API call
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("Content-Type", "application/json")
        .header("x-api-key", &request.api_key)
        .header("anthropic-version", "2023-06-01")
        .header("anthropic-beta", "messages-2023-12-15")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| {
            println!("âŒ Network error: {}", e);
            format!("Network error: {}", e)
        })?;
    
    let status = response.status();
    println!("ðŸ“¥ Response status: {}", status);
    
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        println!("âŒ API Error: {} - {}", status, error_text);
        return Err(format!("Claude API Error: {} - {}", status, error_text));
    }
    
    // Parse response
    let response_text = response.text().await.map_err(|e| {
        println!("âŒ Failed to read response: {}", e);
        format!("Failed to read response: {}", e)
    })?;
    
    println!("ðŸ“„ Raw response length: {}", response_text.len());
    
    // Parse JSON
    let claude_response: ClaudeResponse = serde_json::from_str(&response_text)
        .map_err(|e| {
            println!("âŒ JSON parse error: {}", e);
            println!("Response text: {}", response_text);
            format!("Failed to parse response: {}", e)
        })?;
    
    // Extract text from response
    if let Some(content) = claude_response.content.first() {
        println!("âœ… Claude API call successful - Response length: {}", content.text.len());
        Ok(content.text.clone())
    } else {
        println!("âŒ No content in Claude response");
        Err("No content in Claude response".to_string())
    }
}

// ================================
// CLAUDE VISION API COMMAND
// For camera image analysis - bypasses CORS
// ================================

#[tauri::command]
async fn call_claude_vision_api(
    api_key: String,
    model: String,
    image_base64: String,
    media_type: String,
    prompt: String,
    max_tokens: u32,
) -> Result<String, String> {
    println!("ðŸ“¸ Calling Claude Vision API via Tauri backend...");
    println!("Model: {}, Image size: {} bytes, Prompt length: {}", 
             model, image_base64.len(), prompt.len());
    
    let client = reqwest::Client::new();
    
    // Build the request body with image content
    let request_body = serde_json::json!({
        "model": model,
        "max_tokens": max_tokens,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_base64
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ]
    });
    
    println!("ðŸ“¤ Sending vision request to Claude API...");
    
    // Make the API call
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("Content-Type", "application/json")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| {
            println!("âŒ Network error: {}", e);
            format!("Network error: {}", e)
        })?;
    
    let status = response.status();
    println!("ðŸ“¥ Vision response status: {}", status);
    
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        println!("âŒ Vision API Error: {} - {}", status, error_text);
        return Err(format!("Claude Vision API Error: {} - {}", status, error_text));
    }
    
    // Parse response
    let response_text = response.text().await.map_err(|e| {
        println!("âŒ Failed to read vision response: {}", e);
        format!("Failed to read response: {}", e)
    })?;
    
    println!("ðŸ“„ Vision response length: {}", response_text.len());
    
    // Parse JSON
    let claude_response: ClaudeResponse = serde_json::from_str(&response_text)
        .map_err(|e| {
            println!("âŒ JSON parse error: {}", e);
            format!("Failed to parse vision response: {}", e)
        })?;
    
    // Extract text from response
    if let Some(content) = claude_response.content.first() {
        println!("âœ… Claude Vision API call successful - Response length: {}", content.text.len());
        Ok(content.text.clone())
    } else {
        println!("âŒ No content in Claude vision response");
        Err("No content in Claude vision response".to_string())
    }
}

// Generic AI API command (for other providers via Tauri)
#[tauri::command]
async fn call_ai_api(request: GenericAiRequest) -> Result<String, String> {
    println!("Ã°Å¸Â¤â€“ Calling {} API via Tauri backend...", request.provider);
    
    // Resolve base_url when empty Ã¢â‚¬â€ inline autocomplete sends base_url: ''
    let resolved_base_url = if request.base_url.is_empty() || request.base_url == "PROXY" {
        match request.provider.as_str() {
            "groq" => "https://api.groq.com/openai/v1".to_string(),
            "openai" => "https://api.openai.com/v1".to_string(),
            "deepseek" => "https://api.deepseek.com/v1".to_string(),
            "ollama" => "http://localhost:11434/v1".to_string(),
            "gemini" => "https://generativelanguage.googleapis.com/v1beta/openai".to_string(),
            "operator_x02" | "operatorX02" => "https://api.operatorx02.com/v1".to_string(),
            _ => request.base_url.clone()
        }
    } else {
        request.base_url.clone()
    };
    
    println!("Ã°Å¸â€â€” Resolved base_url: {}", resolved_base_url);
    
    match request.provider.as_str() {
        "claude" => {
            let claude_request = ClaudeRequest {
                api_key: request.api_key,
                model: request.model,
                message: request.message,
                max_tokens: request.max_tokens,
                temperature: request.temperature,
            };
            call_claude_api(claude_request).await
        },
        "openai" | "deepseek" | "custom" | "operatorX02" | "operator_x02" | "groq" | "ollama" | "gemini" => {
            call_openai_compatible_api(
                request.api_key,
                resolved_base_url,
                request.model,
                request.message,
                request.max_tokens,
                request.temperature
            ).await
        },
        _ => Err(format!("Unsupported provider: {}", request.provider))
    }
}

// OpenAI-compatible API call
async fn call_openai_compatible_api(
    api_key: String,
    base_url: String,
    model: String,
    message: String,
    max_tokens: u32,
    temperature: f64
) -> Result<String, String> {
    println!("Ã°Å¸â€â€” Calling OpenAI-compatible API: {}", base_url);
    
    let client = reqwest::Client::new();
    
    let mut request_body = HashMap::new();
    request_body.insert("model", serde_json::Value::String(model));
    request_body.insert("max_tokens", serde_json::Value::Number(serde_json::Number::from(max_tokens)));
    request_body.insert("temperature", serde_json::json!(temperature));
    
    // Detect inline autocomplete requests by marker in prompt
    let is_inline_completion = message.contains("[INSTRUCTION OVERRIDE]") 
        || message.contains("<CURSOR>");
    
    let messages = if is_inline_completion {
        // Inline autocomplete: minimal system prompt for raw code output
        vec![
            serde_json::json!({
                "role": "system",
                "content": "Output only raw code. No markdown. No explanation."
            }),
            serde_json::json!({
                "role": "user",
                "content": message
            })
        ]
    } else {
        // Normal chat: standard system prompt
        vec![
            serde_json::json!({
                "role": "system",
                "content": "You are a helpful AI coding assistant. Provide clear, detailed responses about programming and software development."
            }),
            serde_json::json!({
                "role": "user",
                "content": message
            })
        ]
    };
    
    request_body.insert("messages", serde_json::Value::Array(messages));
    
    // For inline completions, add stop sequences to prevent over-generation
    if is_inline_completion {
        let stop = serde_json::json!(["\n\n\n", "\u{0060}\u{0060}\u{0060}", "<CURSOR>"]);
        request_body.insert("stop", stop);
    }
    
    let url = format!("{}/chat/completions", base_url);
    println!("Ã°Å¸â€œÂ¤ Sending request to: {} (inline: {})", url, is_inline_completion);
    
    // Shorter timeout for inline completions (5s vs 120s)
    let timeout_duration = if is_inline_completion {
        std::time::Duration::from_secs(5)
    } else {
        std::time::Duration::from_secs(120)
    };
    
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .timeout(timeout_duration)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                format!("Request timed out after {}s", timeout_duration.as_secs())
            } else {
                format!("Network error: {}", e)
            }
        })?;
    
    let status = response.status();
    println!("Ã°Å¸â€œÂ¥ Response status: {}", status);
    
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("API Error: {} - {}", status, error_text));
    }
    
    let response_json: serde_json::Value = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    // Extract content from OpenAI-compatible response
    if let Some(content) = response_json["choices"][0]["message"]["content"].as_str() {
        println!("Ã¢Å“â€¦ API call successful - Response length: {}", content.len());
        Ok(content.to_string())
    } else {
        println!("Ã¢ÂÅ’ Unexpected response format: {:?}", response_json);
        Err("No content in API response".to_string())
    }
}

// Test command to verify Tauri API functionality
#[tauri::command]
async fn test_tauri_api() -> Result<String, String> {
    println!("ðŸ§ª Testing Tauri API functionality...");
    Ok("Tauri API is working correctly!".to_string())
}

// ================================
// FILE SYSTEM COMMANDS
// ================================

// Custom command to execute shell commands
#[tauri::command]
async fn execute_command(
    command: String,
    working_dir: Option<String>,
    is_powershell: Option<bool>,
) -> Result<CommandResult, String> {
    println!("Executing command: {}", command);
    
    let is_windows = cfg!(target_os = "windows");
    let is_ps = is_powershell.unwrap_or(false);
    
    // Parse the command to extract executable and arguments
    let parts: Vec<String> = if command.contains('"') {
        // Handle quoted arguments properly
        let mut parts = Vec::new();
        let mut current = String::new();
        let mut in_quotes = false;
        
        for ch in command.chars() {
            match ch {
                '"' => in_quotes = !in_quotes,
                ' ' if !in_quotes => {
                    if !current.is_empty() {
                        parts.push(current.clone());
                        current.clear();
                    }
                }
                _ => current.push(ch),
            }
        }
        if !current.is_empty() {
            parts.push(current);
        }
        
        parts
    } else {
        command.split_whitespace().map(|s| s.to_string()).collect()
    };
    
    if parts.is_empty() {
        return Err("Empty command".to_string());
    }
    
    let mut cmd = if is_windows && !is_ps {
        // For Windows, run the command directly instead of through cmd /C
        let mut c = create_hidden_command(&parts[0]);
        if parts.len() > 1 {
            c.args(&parts[1..]);
        }
        c
    } else if is_ps {
        let mut c = create_hidden_command("powershell");
        c.arg("-Command");
        c.arg(&command);
        c
    } else {
        // For Unix systems
        let mut c = create_hidden_command("sh");
        c.arg("-c");
        c.arg(&command);
        c
    };
    
    // Set working directory to user's home or desktop for better file access
    let default_dir = if is_windows {
        std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\Users\\Public".to_string())
    } else {
        std::env::var("HOME").unwrap_or_else(|_| "/home".to_string())
    };
    
    if let Some(dir) = working_dir {
        let dir_path = std::path::Path::new(&dir);
        if dir_path.exists() && dir_path.is_dir() {
            println!("Set working directory to: {}", dir);
            cmd.current_dir(&dir);
        } else {
            println!("Invalid working directory, using default: {}", default_dir);
            cmd.current_dir(&default_dir);
        }
    } else {
        println!("Using default working directory: {}", default_dir);
        cmd.current_dir(&default_dir);
    }
    
    match cmd.output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let success = output.status.success();
            
            println!("Command output - Success: {}, Stdout length: {}, Stderr length: {}", 
                     success, stdout.len(), stderr.len());
            
            Ok(CommandResult {
                stdout,
                stderr,
                success,
            })
        }
        Err(e) => {
            let error_msg = format!("Failed to execute command: {}", e);
            println!("Command execution error: {}", error_msg);
            Err(error_msg)
        }
    }
}

// Custom command to write file
#[tauri::command]
async fn write_file(path: String, content: String) -> Result<(), String> {
    println!("Writing file: {} (content length: {})", path, content.len());
    
    // Ensure parent directory exists
    if let Some(parent) = std::path::Path::new(&path).parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directory: {}", e))?;
        }
    }
    
    fs::write(&path, content)
        .map_err(|e| format!("Failed to write file '{}': {}", path, e))
}

// Custom command to get system info
#[tauri::command]
async fn get_system_info() -> Result<serde_json::Value, String> {
    use std::env;
    
    let temp_dir = env::temp_dir().to_string_lossy().to_string();
    let current_dir = env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string());
    
    let home_dir = env::var("HOME")
        .or_else(|_| env::var("USERPROFILE"))
        .unwrap_or_else(|_| "unknown".to_string());
    
    let username = env::var("USER")
        .or_else(|_| env::var("USERNAME"))
        .unwrap_or_else(|_| "unknown".to_string());
    
    let hostname = env::var("HOSTNAME")
        .or_else(|_| env::var("COMPUTERNAME"))
        .unwrap_or_else(|_| "unknown".to_string());
    
    println!("System info - User: {}, Hostname: {}, Home: {}", username, hostname, home_dir);
    
    Ok(json!({
        "username": username,
        "hostname": hostname,
        "os_name": std::env::consts::OS,
        "os_version": "unknown",
        "home_dir": home_dir,
        "documents_dir": format!("{}/Documents", home_dir),
        "downloads_dir": format!("{}/Downloads", home_dir),
        "app_data_dir": format!("{}/AppData", home_dir),
        "temp_dir": temp_dir,
        "current_dir": current_dir,
        "arch": std::env::consts::ARCH,
        "family": std::env::consts::FAMILY
    }))
}


// ============================================================================
// âš¡ SMART: read_directory_recursive - Shows .git/.svn but doesn't recurse
// ============================================================================
#[tauri::command]
fn read_directory_recursive(path: String, max_depth: Option<i32>) -> Result<serde_json::Value, String> {
    println!("ðŸ“‚ Reading directory: {} (max depth: {:?})", path, max_depth);
    let start = std::time::Instant::now();
    
    // âš¡ OPTIMIZED: Default max_depth 3 instead of 10
    let max_depth = max_depth.unwrap_or(3);
    
    /// âš¡ Folders to COMPLETELY HIDE (never show, too heavy)
    fn should_skip_completely(name: &str) -> bool {
        matches!(name,
            "node_modules" | "bower_components" |
            "__pycache__" | ".pytest_cache" | "venv" | ".venv" | "env" | ".tox" | ".eggs" | ".mypy_cache" |
            "target" |
            "vendor" |
            "coverage" | ".cache" | ".parcel-cache" | ".turbo" |
            ".gradle" | ".maven" |
            "Pods" | ".dart_tool" | ".pub-cache"
        )
    }
    
    /// âš¡ Folders to SHOW but NOT recurse into (visible but no children loaded)
    /// These are important for developers to see but contain too many internal files
    fn should_show_but_not_recurse(name: &str) -> bool {
        matches!(name,
            ".git" | ".svn" | ".hg" |
            "dist" | "build" | "out" | ".next" | ".nuxt" | ".output" |
            ".idea" |
            "bin" | "obj"
        )
    }
    
    fn should_skip_file(name: &str) -> bool {
        name == ".DS_Store" || name == "Thumbs.db" || name == "desktop.ini"
    }
    
    fn read_dir_recursive(dir_path: &str, current_depth: i32, max_depth: i32) -> Result<serde_json::Value, String> {
        if current_depth >= max_depth {
            return Ok(json!({
                "name": std::path::Path::new(dir_path).file_name().unwrap_or_default().to_string_lossy(),
                "path": dir_path,
                "is_directory": true,
                "children": []
            }));
        }
        
        let entries = fs::read_dir(dir_path)
            .map_err(|e| format!("Failed to read directory '{}': {}", dir_path, e))?;
        
        let mut children = Vec::new();
        let mut skipped_count = 0;
        let mut no_recurse_count = 0;
        
        for entry in entries {
            if let Ok(entry) = entry {
                let entry_path = entry.path();
                let is_dir = entry_path.is_dir();
                let name = entry_path.file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                
                // Skip system files
                if should_skip_file(&name) {
                    continue;
                }
                
                // âš¡ COMPLETELY SKIP heavy folders - don't even show them!
                if is_dir && should_skip_completely(&name) {
                    skipped_count += 1;
                    continue;  // Don't add to children at all!
                }
                
                let mut file_info = json!({
                    "name": name.clone(),
                    "path": entry_path.to_string_lossy().to_string(),
                    "is_directory": is_dir
                });
                
                if is_dir {
                    // âš¡ SMART: Show .git/.svn but DON'T recurse into them
                    if should_show_but_not_recurse(&name) {
                        no_recurse_count += 1;
                        // Add folder with empty children (visible but not expanded)
                        file_info["children"] = json!([]);
                        file_info["no_recurse"] = json!(true); // Flag for frontend
                    } else {
                        // Normal folder - recurse into it
                        if let Ok(subdir_info) = read_dir_recursive(
                            &entry_path.to_string_lossy(), 
                            current_depth + 1, 
                            max_depth
                        ) {
                            if let Some(subdir_children) = subdir_info.get("children") {
                                file_info["children"] = subdir_children.clone();
                            }
                        }
                    }
                } else {
                    if let Ok(metadata) = entry.metadata() {
                        file_info["size"] = json!(metadata.len());
                    }
                }
                
                children.push(file_info);
            }
        }
        
        // Log summary
        if skipped_count > 0 || no_recurse_count > 0 {
            println!("ðŸ“ {} - skipped {} heavy folders, {} shown but not expanded", 
                     dir_path, skipped_count, no_recurse_count);
        }
        
        children.sort_by(|a, b| {
            let a_is_dir = a["is_directory"].as_bool().unwrap_or(false);
            let b_is_dir = b["is_directory"].as_bool().unwrap_or(false);
            
            match (a_is_dir, b_is_dir) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => {
                    let a_name = a["name"].as_str().unwrap_or("").to_lowercase();
                    let b_name = b["name"].as_str().unwrap_or("").to_lowercase();
                    a_name.cmp(&b_name)
                }
            }
        });
        
        Ok(json!({
            "name": std::path::Path::new(dir_path).file_name().unwrap_or_default().to_string_lossy(),
            "path": dir_path,
            "is_directory": true,
            "children": children
        }))
    }
    
    let result = read_dir_recursive(&path, 0, max_depth);
    
    let elapsed = start.elapsed();
    println!("âš¡ Directory read completed in {:?}", elapsed);
    
    result
}

// Custom command to read file content
#[tauri::command]
fn read_file_content(path: String) -> Result<String, String> {
    println!("Reading file: {}", path);
    
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file '{}': {}", path, e))
}

// Custom command to write file content
#[tauri::command]
fn write_file_content(path: String, content: String) -> Result<(), String> {
    println!("Writing file content: {}", path);
    
    // Ensure parent directory exists
    if let Some(parent) = std::path::Path::new(&path).parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directory: {}", e))?;
        }
    }
    
    fs::write(&path, content)
        .map_err(|e| format!("Failed to write file '{}': {}", path, e))
}

// âš¡ OPTIMIZED: Read simple directory listing - skips heavy folders but shows .git
#[tauri::command]
fn read_directory_simple(path: String) -> Result<Vec<String>, String> {
    println!("ðŸ“‚ Reading directory (simple): {}", path);
    
    let entries = fs::read_dir(&path)
        .map_err(|e| format!("Failed to read directory '{}': {}", path, e))?;
    
    let mut files = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
            let file_name = entry.file_name().to_string_lossy().to_string();
            
            // âš¡ Skip ONLY heavy folders, NOT .git/.svn
            if matches!(file_name.as_str(),
                "node_modules" | "__pycache__" | "venv" | ".venv" | "vendor" |
                "coverage" | ".cache" | ".parcel-cache" | ".turbo"
            ) {
                continue;
            }
            
            files.push(file_name);
        }
    }
    
    Ok(files)
}

// âš¡ OPTIMIZED: Read detailed directory contents - shows .git but skips heavy folders
#[tauri::command]
fn read_directory_detailed(path: String) -> Result<Vec<serde_json::Value>, String> {
    println!("ðŸ“‚ Reading directory (detailed): {}", path);
    
    // âš¡ Skip ONLY truly heavy folders, NOT .git/.svn
    fn should_skip(name: &str, is_dir: bool) -> bool {
        if is_dir {
            matches!(name,
                "node_modules" | "bower_components" |
                "__pycache__" | "venv" | ".venv" | "vendor" |
                "coverage" | ".cache" | ".gradle" | "Pods"
            )
        } else {
            name == ".DS_Store" || name == "Thumbs.db" || name == "desktop.ini"
        }
    }
    
    let entries = fs::read_dir(&path)
        .map_err(|e| format!("Failed to read directory '{}': {}", path, e))?;
    
    let mut files = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
            let entry_path = entry.path();
            let is_dir = entry_path.is_dir();
            let name = entry_path.file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            
            // âš¡ Skip heavy folders and system files
            if should_skip(&name, is_dir) {
                continue;
            }
            
            let mut file_info = json!({
                "name": name,
                "path": entry_path.to_string_lossy().to_string(),
                "is_directory": is_dir
            });
            
            // Add file size if it's a file
            if !is_dir {
                if let Ok(metadata) = entry.metadata() {
                    file_info["size"] = json!(metadata.len());
                }
            }
            
            files.push(file_info);
        }
    }
    
    // Sort: directories first, then files alphabetically
    files.sort_by(|a, b| {
        let a_is_dir = a["is_directory"].as_bool().unwrap_or(false);
        let b_is_dir = b["is_directory"].as_bool().unwrap_or(false);
        
        match (a_is_dir, b_is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a["name"].as_str().unwrap_or("").cmp(b["name"].as_str().unwrap_or(""))
        }
    });
    
    println!("âš¡ Found {} items (after filtering)", files.len());
    Ok(files)
}

// Custom command to read directory contents (legacy naming)
#[tauri::command]
fn read_directory_contents(path: String) -> Result<Vec<serde_json::Value>, String> {
    read_directory_detailed(path)
}

// Custom command to check if file exists
#[tauri::command]
fn file_exists(path: String) -> Result<bool, String> {
    Ok(std::path::Path::new(&path).exists())
}

// Custom command to check if path exists
#[tauri::command]
fn path_exists(path: String) -> Result<bool, String> {
    Ok(std::path::Path::new(&path).exists())
}

// Custom command to get file metadata
#[tauri::command]
fn get_file_metadata(path: String) -> Result<serde_json::Value, String> {
    let metadata = fs::metadata(&path)
        .map_err(|e| format!("Failed to get metadata for '{}': {}", path, e))?;
    
    Ok(json!({
        "isFile": metadata.is_file(),
        "isDirectory": metadata.is_dir(),
        "size": metadata.len(),
        "modified": metadata.modified()
            .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs())
            .unwrap_or(0)
    }))
}


// Custom command to delete file or directory
#[tauri::command]
fn delete_path(path: String) -> Result<(), String> {
    println!("Deleting path: {}", path);
    
    let path_obj = std::path::Path::new(&path);
    
    if path_obj.is_dir() {
        fs::remove_dir_all(&path)
            .map_err(|e| format!("Failed to delete directory '{}': {}", path, e))
    } else {
        fs::remove_file(&path)
            .map_err(|e| format!("Failed to delete file '{}': {}", path, e))
    }
}

// Custom command to rename/move file or directory
#[tauri::command]
fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    println!("Renaming: {} -> {}", old_path, new_path);
    
    let old_path_obj = std::path::Path::new(&old_path);
    
    if !old_path_obj.exists() {
        return Err(format!("Source path '{}' does not exist", old_path));
    }
    
    // Ensure parent directory of new path exists
    if let Some(parent) = std::path::Path::new(&new_path).parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directory: {}", e))?;
        }
    }
    
    fs::rename(&old_path, &new_path)
        .map_err(|e| format!("Failed to rename '{}' to '{}': {}", old_path, new_path, e))
}

// Custom command to create file
#[tauri::command]
fn create_file(path: String, content: String) -> Result<(), String> {
    println!("Creating file: {}", path);
    
    // Ensure parent directory exists
    if let Some(parent) = std::path::Path::new(&path).parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directory: {}", e))?;
        }
    }
    
    fs::write(&path, content)
        .map_err(|e| format!("Failed to create file '{}': {}", path, e))
}

// Custom command to check if path is directory
#[tauri::command]
fn is_directory(path: String) -> Result<bool, String> {
    Ok(std::path::Path::new(&path).is_dir())
}

// Show message dialog
#[tauri::command]
async fn show_message_dialog(title: String, message: String, kind: String) -> Result<(), String> {
    println!("Showing message dialog: {} - {}", title, message);
    
    #[cfg(target_os = "windows")]
    {
        let icon = match kind.as_str() {
            "error" => "16",    // Stop/Error icon
            "warning" => "48",  // Exclamation/Warning icon
            _ => "64"          // Information icon
        };
        
        let ps_command = format!(r#"
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.MessageBox]::Show('{}', '{}', [System.Windows.Forms.MessageBoxButtons]::OK, {})
        "#, message.replace("'", "''"), title.replace("'", "''"), icon);
        
        create_hidden_command("powershell")
            .args(&["-WindowStyle", "Hidden", "-Command", &ps_command])
            .output()
            .map_err(|e| format!("Failed to show dialog: {}", e))?;
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        // For non-Windows, just print to console for now
        println!("[{}] {}: {}", kind.to_uppercase(), title, message);
    }
    
    Ok(())
}

// ================================
// UTILITY COMMANDS
// ================================

// Custom command to get app info
#[tauri::command]
fn get_app_info() -> Result<serde_json::Value, String> {
    Ok(json!({
        "name": "AI Code IDE",
        "version": "0.1.0",
        "tauri_version": "2.x",
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "ai_backend": "enabled",
        "file_execution": "enabled",
        "persistence": "enabled",
        "folder_explorer": "enabled",
        "path_memory": "enabled",
        "clipboard": "enabled",
        "cmd_support": "enabled"  // NEW: Indicate CMD support is available
    }))
}

// Helper command to check Python installation
#[tauri::command]
async fn check_python() -> Result<serde_json::Value, String> {
    let python_check = create_hidden_command("python")
        .args(["--version"])
        .output();
    
    let python3_check = create_hidden_command("python3")
        .args(["--version"])
        .output();
    
    let mut result = json!({
        "python": false,
        "python3": false,
        "versions": {}
    });
    
    if let Ok(output) = python_check {
        if output.status.success() {
            let version = String::from_utf8_lossy(&output.stdout);
            result["python"] = json!(true);
            result["versions"]["python"] = json!(version.trim());
        }
    }
    
    if let Ok(output) = python3_check {
        if output.status.success() {
            let version = String::from_utf8_lossy(&output.stdout);
            result["python3"] = json!(true);
            result["versions"]["python3"] = json!(version.trim());
        }
    }
    
    Ok(result)
}

// Helper command to check Node.js installation
#[tauri::command]
async fn check_node() -> Result<serde_json::Value, String> {
    let node_check = create_hidden_command("node")
        .args(["--version"])
        .output();
    
    let npm_check = create_hidden_command("npm")
        .args(["--version"])
        .output();
    
    let mut result = json!({
        "node": false,
        "npm": false,
        "versions": {}
    });
    
    if let Ok(output) = node_check {
        if output.status.success() {
            let version = String::from_utf8_lossy(&output.stdout);
            result["node"] = json!(true);
            result["versions"]["node"] = json!(version.trim());
        }
    }
    
    if let Ok(output) = npm_check {
        if output.status.success() {
            let version = String::from_utf8_lossy(&output.stdout);
            result["npm"] = json!(true);
            result["versions"]["npm"] = json!(version.trim());
        }
    }
    
    Ok(result)
}

// Command to get environment variables
#[tauri::command]
fn get_env_var(key: String) -> Result<Option<String>, String> {
    Ok(std::env::var(&key).ok())
}

// Command to get all environment variables (filtered for security)
#[tauri::command]
fn get_safe_env_vars() -> Result<serde_json::Value, String> {
    let safe_vars = [
        "PATH", "HOME", "USERPROFILE", "USERNAME", "USER", 
        "TEMP", "TMP", "OS", "PROCESSOR_ARCHITECTURE",
        "PROGRAMFILES", "APPDATA", "LOCALAPPDATA"
    ];
    
    let mut env_vars = json!({});
    
    for var in &safe_vars {
        if let Ok(value) = std::env::var(var) {
            env_vars[*var] = json!(value);
        }
    }
    
    Ok(env_vars)
}

// Close the application
#[tauri::command]
async fn close_app(window: tauri::Window) -> Result<(), String> {
    println!("Closing application...");
    window.close().map_err(|e| format!("Failed to close window: {}", e))?;
    Ok(())
}

// ================================
// MAIN APPLICATION ENTRY POINT
// ================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
// ================================
// PROJECT CREATION COMMANDS
// ================================

#[tauri::command]
async fn execute_project_script(
    script_path: String,
    project_name: String,
    project_path: String,
    template: String
) -> Result<String, String> {
    println!("â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•");
    println!("ðŸš€ Executing Project Creation Script");
    println!("â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•");
    println!("Script: {}", script_path);
    println!("Project: {}", project_name);
    println!("Path: {}", project_path);
    println!("Template: {}", template);
    println!("â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•");
    
    // Execute batch script with cmd.exe
    let output = create_hidden_command("cmd")
        .args(&["/c", &script_path, &project_name, &project_path])
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Failed to execute script: {}", e))?;
    
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        println!("âœ… Script executed successfully");
        println!("Output:\n{}", stdout);
        Ok(stdout.to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        println!("âŒ Script failed");
        println!("Error:\n{}", stderr);
        Err(format!("Script failed: {}", stderr))
    }
}

#[tauri::command]
async fn open_folder(path: String) -> Result<(), String> {
    println!("ðŸ“‚ Opening folder: {}", path);
    
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open explorer: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open finder: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file manager: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
async fn get_resource_path(app: tauri::AppHandle, resource: String) -> Result<String, String> {
    let resource_path = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?
        .join(&resource);
    
    resource_path
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Invalid path".to_string())
}

// ============================================================================
// ðŸ” AI FILE EXPLORER COMMANDS
// Allows AI to search and read project files
// ============================================================================

/// File search result structure
#[derive(Serialize, Clone)]
struct AiFileSearchResult {
    path: String,
    name: String,
    #[serde(rename = "type")]
    file_type: String,
    extension: Option<String>,
    size: Option<u64>,
}

/// Search files by name pattern
#[tauri::command]
async fn ai_search_files(path: String, query: String, max_results: usize) -> Result<Vec<AiFileSearchResult>, String> {
    use std::fs;
    
    let query_lower = query.to_lowercase();
    let mut results = Vec::new();
    
    fn search_recursive(dir: &Path, query: &str, results: &mut Vec<AiFileSearchResult>, max_results: usize, depth: usize) {
        if depth > 10 || results.len() >= max_results {
            return;
        }
        
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                let name = entry.file_name().to_string_lossy().to_string();
                
                // Skip hidden files and common large directories
                if name.starts_with('.') || name == "node_modules" || name == "target" || name == "dist" || name == ".git" {
                    continue;
                }
                
                let is_dir = path.is_dir();
                
                // Check if name matches query
                if name.to_lowercase().contains(query) {
                    let extension = if !is_dir {
                        path.extension().map(|e| e.to_string_lossy().to_string())
                    } else {
                        None
                    };
                    
                    let size = if !is_dir {
                        fs::metadata(&path).ok().map(|m| m.len())
                    } else {
                        None
                    };
                    
                    results.push(AiFileSearchResult {
                        path: path.to_string_lossy().to_string(),
                        name,
                        file_type: if is_dir { "folder".to_string() } else { "file".to_string() },
                        extension,
                        size,
                    });
                    
                    if results.len() >= max_results {
                        return;
                    }
                }
                
                // Recurse into directories
                if is_dir {
                    search_recursive(&path, query, results, max_results, depth + 1);
                }
            }
        }
    }
    
    let base_path = Path::new(&path);
    search_recursive(base_path, &query_lower, &mut results, max_results, 0);
    
    Ok(results)
}

/// Search file contents (grep-like)
#[tauri::command]
async fn ai_search_file_contents(path: String, query: String, max_results: usize) -> Result<Vec<AiFileSearchResult>, String> {
    use std::io::{BufRead, BufReader};
    
    let query_lower = query.to_lowercase();
    let mut results = Vec::new();
    
    let searchable_extensions = vec![
        "ts", "tsx", "js", "jsx", "py", "rs", "go", "java", "c", "cpp", "h",
        "cs", "rb", "php", "swift", "kt", "scala", "html", "css", "scss",
        "json", "yaml", "yml", "xml", "md", "txt", "sql", "sh", "vue", "svelte"
    ];
    
    fn search_contents_recursive(
        dir: &Path, 
        query: &str, 
        results: &mut Vec<AiFileSearchResult>, 
        max_results: usize,
        searchable_extensions: &[&str],
        depth: usize
    ) {
        if depth > 10 || results.len() >= max_results {
            return;
        }
        
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                let name = entry.file_name().to_string_lossy().to_string();
                
                // Skip hidden files and common large directories
                if name.starts_with('.') || name == "node_modules" || name == "target" || name == "dist" {
                    continue;
                }
                
                if path.is_dir() {
                    search_contents_recursive(&path, query, results, max_results, searchable_extensions, depth + 1);
                } else if path.is_file() {
                    // Check extension
                    let extension = path.extension()
                        .map(|e| e.to_string_lossy().to_lowercase())
                        .unwrap_or_default();
                    
                    if !searchable_extensions.contains(&extension.as_str()) {
                        continue;
                    }
                    
                    // Search file contents
                    if let Ok(file) = std::fs::File::open(&path) {
                        let reader = BufReader::new(file);
                        let mut found = false;
                        
                        for line in reader.lines().take(1000) {
                            if let Ok(line_content) = line {
                                if line_content.to_lowercase().contains(query) {
                                    found = true;
                                    break;
                                }
                            }
                        }
                        
                        if found {
                            let size = std::fs::metadata(&path).ok().map(|m| m.len());
                            
                            results.push(AiFileSearchResult {
                                path: path.to_string_lossy().to_string(),
                                name,
                                file_type: "file".to_string(),
                                extension: Some(extension),
                                size,
                            });
                            
                            if results.len() >= max_results {
                                return;
                            }
                        }
                    }
                }
            }
        }
    }
    
    let base_path = Path::new(&path);
    search_contents_recursive(base_path, &query_lower, &mut results, max_results, &searchable_extensions, 0);
    
    Ok(results)
}

/// List directory recursively
#[tauri::command]
async fn ai_list_directory_recursive(path: String, max_depth: usize) -> Result<Vec<AiFileSearchResult>, String> {
    use std::fs;
    
    let mut results = Vec::new();
    
    fn list_recursive(dir: &Path, results: &mut Vec<AiFileSearchResult>, max_depth: usize, current_depth: usize) {
        if current_depth > max_depth {
            return;
        }
        
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                let name = entry.file_name().to_string_lossy().to_string();
                
                // Skip hidden files and common large directories
                if name.starts_with('.') || name == "node_modules" || name == "target" {
                    continue;
                }
                
                let is_dir = path.is_dir();
                let extension = if !is_dir {
                    path.extension().map(|e| e.to_string_lossy().to_string())
                } else {
                    None
                };
                
                let size = if !is_dir {
                    fs::metadata(&path).ok().map(|m| m.len())
                } else {
                    None
                };
                
                results.push(AiFileSearchResult {
                    path: path.to_string_lossy().to_string(),
                    name,
                    file_type: if is_dir { "folder".to_string() } else { "file".to_string() },
                    extension,
                    size,
                });
                
                if is_dir {
                    list_recursive(&path, results, max_depth, current_depth + 1);
                }
            }
        }
    }
    
    let base_path = Path::new(&path);
    list_recursive(base_path, &mut results, max_depth, 0);
    
    Ok(results)
}

/// Generate file tree as text
#[tauri::command]
async fn ai_generate_tree_text(path: String, max_depth: usize) -> Result<String, String> {
    use std::fs;
    
    let mut tree = String::new();
    let root_name = Path::new(&path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.clone());
    
    tree.push_str(&format!("{}/\n", root_name));
    
    fn generate_tree_recursive(
        dir: &Path,
        tree: &mut String,
        prefix: &str,
        max_depth: usize,
        current_depth: usize,
    ) {
        if current_depth >= max_depth {
            return;
        }
        
        let entries: Vec<_> = match fs::read_dir(dir) {
            Ok(entries) => entries
                .filter_map(|e| e.ok())
                .filter(|e| {
                    let name = e.file_name().to_string_lossy().to_string();
                    !name.starts_with('.') && name != "node_modules" && name != "target"
                })
                .collect(),
            Err(_) => return,
        };
        
        let len = entries.len();
        
        for (i, entry) in entries.iter().enumerate() {
            let is_last = i == len - 1;
            let name = entry.file_name().to_string_lossy().to_string();
            let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
            
            let connector = if is_last { "â””â”€â”€ " } else { "â”œâ”€â”€ " };
            let child_prefix = if is_last { "    " } else { "â”‚   " };
            
            if is_dir {
                tree.push_str(&format!("{}{}{}/\n", prefix, connector, name));
                generate_tree_recursive(
                    &entry.path(),
                    tree,
                    &format!("{}{}", prefix, child_prefix),
                    max_depth,
                    current_depth + 1,
                );
            } else {
                tree.push_str(&format!("{}{}{}\n", prefix, connector, name));
            }
        }
    }
    
    let base_path = Path::new(&path);
    generate_tree_recursive(base_path, &mut tree, "", max_depth, 0);
    
    Ok(tree)
}


// ================================
// ?? BATCH FILE CREATION (Fast project scaffolding)
// ================================

#[derive(Deserialize)]
struct BatchFileEntry {
    path: String,
    content: String,
}

#[tauri::command]
async fn create_files_batch(base_dir: String, files: Vec<BatchFileEntry>) -> Result<Vec<String>, String> {
    let base = Path::new(&base_dir);
    
    // Create base directory if it doesn't exist
    if !base.exists() {
        fs::create_dir_all(&base).map_err(|e| format!("Failed to create base dir: {}", e))?;
    }
    
    let mut created: Vec<String> = Vec::new();
    
    for entry in &files {
        let file_path = base.join(&entry.path);
        
        // Create parent directories if needed
        if let Some(parent) = file_path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create dir {}: {}", parent.display(), e))?;
            }
        }
        
        // Write file content
        fs::write(&file_path, &entry.content)
            .map_err(|e| format!("Failed to write {}: {}", file_path.display(), e))?;
        
        created.push(entry.path.clone());
    }
    
    Ok(created)
}

fn main() {
    run();
}