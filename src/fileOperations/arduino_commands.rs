// src-tauri/src/arduino_commands.rs
// Arduino Integration Module for Operator X02 Code IDE
// Supports: Arduino CLI, Serial Port Detection, CH341 Driver Detection, ESP32/ESP8266

use std::collections::HashMap;
use std::io::Write;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle, Emitter};

// ================================
// STRUCTS AND TYPES
// ================================

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ArduinoBoard {
    pub port: String,
    pub fqbn: String,           // Fully Qualified Board Name (e.g., "arduino:avr:uno")
    pub board_name: String,
    pub core: String,
    pub protocol: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SerialPortInfo {
    pub port_name: String,
    pub port_type: String,
    pub vid: u16,
    pub pid: u16,
    pub manufacturer: String,
    pub product: String,
    pub serial_number: String,
    pub is_arduino_compatible: bool,
    pub chip_type: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ArduinoCore {
    pub id: String,
    pub installed: String,
    pub latest: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ArduinoLibrary {
    pub name: String,
    pub version: String,
    pub installed: bool,
    pub author: String,
    pub sentence: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CompileResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub binary_path: Option<String>,
    pub binary_size: Option<u64>,
    pub memory_usage: Option<MemoryUsage>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MemoryUsage {
    pub flash_used: u64,
    pub flash_total: u64,
    pub flash_percent: f32,
    pub ram_used: u64,
    pub ram_total: u64,
    pub ram_percent: f32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ArduinoResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BoardListJson {
    pub detected_ports: Vec<DetectedPort>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DetectedPort {
    pub port: PortInfo,
    pub matching_boards: Vec<MatchingBoard>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PortInfo {
    pub address: String,
    pub protocol: String,
    pub protocol_label: String,
    pub properties: Option<PortProperties>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PortProperties {
    pub pid: Option<String>,
    pub vid: Option<String>,
    #[serde(rename = "serialNumber")]
    pub serial_number: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MatchingBoard {
    pub name: String,
    pub fqbn: String,
}

// Serial Monitor State
lazy_static::lazy_static! {
    static ref SERIAL_MONITORS: Arc<Mutex<HashMap<String, SerialMonitorHandle>>> = 
        Arc::new(Mutex::new(HashMap::new()));
}

struct SerialMonitorHandle {
    running: Arc<Mutex<bool>>,
    thread_handle: Option<thread::JoinHandle<()>>,
}

// ================================
// ARDUINO CLI DETECTION
// ================================

/// Check if Arduino CLI is installed and return version info
#[command]
pub async fn arduino_check_cli() -> Result<ArduinoResult, String> {
    execute_arduino_command("arduino-cli version", None).await
}

/// Get Arduino CLI configuration
#[command]
pub async fn arduino_get_config() -> Result<ArduinoResult, String> {
    execute_arduino_command("arduino-cli config dump --format json", None).await
}

/// Initialize Arduino CLI configuration
#[command]
pub async fn arduino_init_config() -> Result<ArduinoResult, String> {
    execute_arduino_command("arduino-cli config init --overwrite", None).await
}

// ================================
// BOARD DETECTION
// ================================

/// List all connected Arduino boards with auto-detection
#[command]
pub async fn arduino_list_boards() -> Result<Vec<ArduinoBoard>, String> {
    let result = execute_arduino_command("arduino-cli board list --format json", None).await?;
    
    if !result.success {
        return Err(format!("Failed to list boards: {}", result.stderr));
    }
    
    // Parse JSON output
    let board_list: BoardListJson = serde_json::from_str(&result.stdout)
        .map_err(|e| format!("Failed to parse board list: {}", e))?;
    
    let mut boards: Vec<ArduinoBoard> = Vec::new();
    
    for detected in board_list.detected_ports {
        if detected.matching_boards.is_empty() {
            // Unknown board - still add it with port info
            boards.push(ArduinoBoard {
                port: detected.port.address.clone(),
                fqbn: String::new(),
                board_name: "Unknown Board".to_string(),
                core: String::new(),
                protocol: detected.port.protocol.clone(),
            });
        } else {
            for board in detected.matching_boards {
                boards.push(ArduinoBoard {
                    port: detected.port.address.clone(),
                    fqbn: board.fqbn.clone(),
                    board_name: board.name.clone(),
                    core: board.fqbn.split(':').take(2).collect::<Vec<_>>().join(":"),
                    protocol: detected.port.protocol.clone(),
                });
            }
        }
    }
    
    Ok(boards)
}

/// List all available serial ports (including non-Arduino devices)
#[command]
pub fn arduino_list_serial_ports() -> Result<Vec<SerialPortInfo>, String> {
    let ports = serialport::available_ports()
        .map_err(|e| format!("Failed to list serial ports: {}", e))?;
    
    let port_infos: Vec<SerialPortInfo> = ports
        .into_iter()
        .map(|p| {
            let (port_type, vid, pid, manufacturer, product, serial_number, is_arduino, chip_type) = 
                match &p.port_type {
                    serialport::SerialPortType::UsbPort(usb) => {
                        let chip = detect_chip_type(usb.vid, usb.pid);
                        let is_arduino_compatible = is_arduino_chip(usb.vid);
                        
                        (
                            format!("USB VID:{:04X} PID:{:04X}", usb.vid, usb.pid),
                            usb.vid,
                            usb.pid,
                            usb.manufacturer.clone().unwrap_or_default(),
                            usb.product.clone().unwrap_or_default(),
                            usb.serial_number.clone().unwrap_or_default(),
                            is_arduino_compatible,
                            chip,
                        )
                    }
                    serialport::SerialPortType::PciPort => {
                        ("PCI".to_string(), 0, 0, String::new(), String::new(), String::new(), false, "PCI".to_string())
                    }
                    serialport::SerialPortType::BluetoothPort => {
                        ("Bluetooth".to_string(), 0, 0, String::new(), String::new(), String::new(), false, "Bluetooth".to_string())
                    }
                    serialport::SerialPortType::Unknown => {
                        ("Unknown".to_string(), 0, 0, String::new(), String::new(), String::new(), false, "Unknown".to_string())
                    }
                };
            
            SerialPortInfo {
                port_name: p.port_name,
                port_type,
                vid,
                pid,
                manufacturer,
                product,
                serial_number,
                is_arduino_compatible: is_arduino,
                chip_type,
            }
        })
        .collect();
    
    Ok(port_infos)
}

/// Detect chip type from VID/PID
fn detect_chip_type(vid: u16, pid: u16) -> String {
    match (vid, pid) {
        // CH340/CH341 (Most common cheap Arduino clones)
        (0x1A86, 0x7523) => "CH340".to_string(),
        (0x1A86, 0x5523) => "CH341".to_string(),
        (0x1A86, 0x7522) => "CH340K".to_string(),
        (0x1A86, _) => "CH340/CH341 Family".to_string(),
        
        // Arduino Official
        (0x2341, 0x0043) => "Arduino Uno (ATmega16U2)".to_string(),
        (0x2341, 0x0001) => "Arduino Uno".to_string(),
        (0x2341, 0x0010) => "Arduino Mega 2560".to_string(),
        (0x2341, 0x003D) => "Arduino Due".to_string(),
        (0x2341, 0x8036) => "Arduino Leonardo".to_string(),
        (0x2341, 0x8037) => "Arduino Micro".to_string(),
        (0x2341, 0x804D) => "Arduino Zero".to_string(),
        (0x2341, _) => "Arduino Official".to_string(),
        
        // Arduino.cc
        (0x2A03, _) => "Arduino.cc".to_string(),
        
        // FTDI
        (0x0403, 0x6001) => "FTDI FT232R".to_string(),
        (0x0403, 0x6010) => "FTDI FT2232".to_string(),
        (0x0403, 0x6011) => "FTDI FT4232".to_string(),
        (0x0403, 0x6014) => "FTDI FT232H".to_string(),
        (0x0403, _) => "FTDI".to_string(),
        
        // Silicon Labs CP210x
        (0x10C4, 0xEA60) => "CP2102".to_string(),
        (0x10C4, 0xEA70) => "CP2105".to_string(),
        (0x10C4, 0xEA71) => "CP2108".to_string(),
        (0x10C4, 0xEA80) => "CP2110".to_string(),
        (0x10C4, _) => "CP210x".to_string(),
        
        // Prolific
        (0x067B, 0x2303) => "Prolific PL2303".to_string(),
        (0x067B, _) => "Prolific".to_string(),
        
        // ESP32 (Espressif)
        (0x303A, _) => "Espressif ESP32".to_string(),
        
        // STM32
        (0x0483, 0x5740) => "STM32 Virtual COM Port".to_string(),
        (0x0483, _) => "STMicroelectronics".to_string(),
        
        // Teensy
        (0x16C0, 0x0483) => "Teensy".to_string(),
        (0x16C0, _) => "PJRC Teensy".to_string(),
        
        // Adafruit
        (0x239A, _) => "Adafruit".to_string(),
        
        // SparkFun
        (0x1B4F, _) => "SparkFun".to_string(),
        
        _ => "Unknown".to_string(),
    }
}

/// Check if the chip is Arduino-compatible (by VID only)
fn is_arduino_chip(vid: u16) -> bool {
    matches!(vid, 
        0x1A86 |  // CH340/CH341
        0x2341 |  // Arduino
        0x2A03 |  // Arduino.cc
        0x0403 |  // FTDI
        0x10C4 |  // CP210x
        0x067B |  // Prolific
        0x303A |  // ESP32
        0x0483 |  // STM32
        0x16C0 |  // Teensy
        0x239A |  // Adafruit
        0x1B4F    // SparkFun
    )
}

/// Check if CH341 driver is installed (Windows specific)
#[command]
pub fn arduino_check_ch341_driver() -> Result<bool, String> {
    let ports = serialport::available_ports()
        .map_err(|e| format!("Failed to list ports: {}", e))?;
    
    // Look for CH340/CH341 devices
    let ch341_found = ports.iter().any(|p| {
        if let serialport::SerialPortType::UsbPort(usb) = &p.port_type {
            usb.vid == 0x1A86  // CH340/CH341 vendor ID
        } else {
            false
        }
    });
    
    Ok(ch341_found)
}

// ================================
// COMPILATION
// ================================

/// Compile an Arduino sketch
#[command]
pub async fn arduino_compile(
    sketch_path: String,
    fqbn: String,
    output_dir: Option<String>,
    verbose: Option<bool>,
    build_properties: Option<Vec<String>>,
) -> Result<CompileResult, String> {
    let sketch_dir = std::path::Path::new(&sketch_path);
    if !sketch_dir.exists() {
        return Err(format!("Sketch not found: {}", sketch_path));
    }
    
    let mut cmd = format!(
        "arduino-cli compile --fqbn \"{}\" \"{}\"",
        fqbn, sketch_path
    );
    
    if let Some(out_dir) = output_dir {
        cmd.push_str(&format!(" --output-dir \"{}\"", out_dir));
    }
    
    if verbose.unwrap_or(false) {
        cmd.push_str(" --verbose");
    }
    
    // Add build properties if provided
    if let Some(props) = build_properties {
        for prop in props {
            cmd.push_str(&format!(" --build-property \"{}\"", prop));
        }
    }
    
    let result = execute_arduino_command(&cmd, None).await?;
    
    // Parse memory usage from output
    let memory_usage = parse_memory_usage(&result.stdout);
    
    Ok(CompileResult {
        success: result.success,
        stdout: result.stdout,
        stderr: result.stderr,
        exit_code: result.exit_code,
        binary_path: None, // Could be parsed from output
        binary_size: None,
        memory_usage,
    })
}

/// Compile with preprocessor only (for syntax checking)
#[command]
pub async fn arduino_preprocess(
    sketch_path: String,
    fqbn: String,
) -> Result<ArduinoResult, String> {
    let cmd = format!(
        "arduino-cli compile --fqbn \"{}\" \"{}\" --preprocess",
        fqbn, sketch_path
    );
    execute_arduino_command(&cmd, None).await
}

/// Parse memory usage from compile output
fn parse_memory_usage(output: &str) -> Option<MemoryUsage> {
    // Arduino CLI outputs memory usage like:
    // "Sketch uses 3622 bytes (11%) of program storage space. Maximum is 32256 bytes."
    // "Global variables use 188 bytes (9%) of dynamic memory, leaving 1860 bytes for local variables."
    
    let mut flash_used = 0u64;
    let mut flash_total = 0u64;
    let mut ram_used = 0u64;
    let mut ram_total = 0u64;
    
    for line in output.lines() {
        if line.contains("program storage space") {
            // Parse flash usage
            let parts: Vec<&str> = line.split_whitespace().collect();
            for (i, part) in parts.iter().enumerate() {
                if *part == "uses" && i + 1 < parts.len() {
                    flash_used = parts[i + 1].parse().unwrap_or(0);
                }
                if *part == "is" && i + 1 < parts.len() {
                    flash_total = parts[i + 1].parse().unwrap_or(0);
                }
            }
        }
        if line.contains("dynamic memory") {
            // Parse RAM usage
            let parts: Vec<&str> = line.split_whitespace().collect();
            for (i, part) in parts.iter().enumerate() {
                if *part == "use" && i + 1 < parts.len() {
                    ram_used = parts[i + 1].parse().unwrap_or(0);
                }
                if *part == "leaving" && i + 1 < parts.len() {
                    let free: u64 = parts[i + 1].parse().unwrap_or(0);
                    ram_total = ram_used + free;
                }
            }
        }
    }
    
    if flash_total > 0 || ram_total > 0 {
        Some(MemoryUsage {
            flash_used,
            flash_total,
            flash_percent: if flash_total > 0 { (flash_used as f32 / flash_total as f32) * 100.0 } else { 0.0 },
            ram_used,
            ram_total,
            ram_percent: if ram_total > 0 { (ram_used as f32 / ram_total as f32) * 100.0 } else { 0.0 },
        })
    } else {
        None
    }
}

// ================================
// UPLOAD
// ================================

/// Upload sketch to Arduino board
#[command]
pub async fn arduino_upload(
    sketch_path: String,
    port: String,
    fqbn: String,
    verbose: Option<bool>,
    verify: Option<bool>,
) -> Result<ArduinoResult, String> {
    let mut cmd = format!(
        "arduino-cli upload -p \"{}\" --fqbn \"{}\" \"{}\"",
        port, fqbn, sketch_path
    );
    
    if verbose.unwrap_or(false) {
        cmd.push_str(" --verbose");
    }
    
    if verify.unwrap_or(false) {
        cmd.push_str(" --verify");
    }
    
    execute_arduino_command(&cmd, None).await
}

/// Compile and upload in one step
#[command]
pub async fn arduino_compile_and_upload(
    sketch_path: String,
    port: String,
    fqbn: String,
    verbose: Option<bool>,
) -> Result<CompileResult, String> {
    let mut cmd = format!(
        "arduino-cli compile --upload -p \"{}\" --fqbn \"{}\" \"{}\"",
        port, fqbn, sketch_path
    );
    
    if verbose.unwrap_or(false) {
        cmd.push_str(" --verbose");
    }
    
    let result = execute_arduino_command(&cmd, None).await?;
    let memory_usage = parse_memory_usage(&result.stdout);
    
    Ok(CompileResult {
        success: result.success,
        stdout: result.stdout,
        stderr: result.stderr,
        exit_code: result.exit_code,
        binary_path: None,
        binary_size: None,
        memory_usage,
    })
}

// ================================
// CORE MANAGEMENT
// ================================

/// Install an Arduino core (board support package)
#[command]
pub async fn arduino_install_core(core: String) -> Result<ArduinoResult, String> {
    let cmd = format!("arduino-cli core install \"{}\"", core);
    execute_arduino_command(&cmd, None).await
}

/// Uninstall an Arduino core
#[command]
pub async fn arduino_uninstall_core(core: String) -> Result<ArduinoResult, String> {
    let cmd = format!("arduino-cli core uninstall \"{}\"", core);
    execute_arduino_command(&cmd, None).await
}

/// List installed cores
#[command]
pub async fn arduino_list_cores() -> Result<Vec<ArduinoCore>, String> {
    let result = execute_arduino_command("arduino-cli core list --format json", None).await?;
    
    if !result.success {
        return Err(format!("Failed to list cores: {}", result.stderr));
    }
    
    let cores: Vec<ArduinoCore> = serde_json::from_str(&result.stdout)
        .unwrap_or_else(|_| Vec::new());
    
    Ok(cores)
}

/// Search for available cores
#[command]
pub async fn arduino_search_cores(query: String) -> Result<ArduinoResult, String> {
    let cmd = format!("arduino-cli core search \"{}\"", query);
    execute_arduino_command(&cmd, None).await
}

/// Update core index
#[command]
pub async fn arduino_update_core_index() -> Result<ArduinoResult, String> {
    execute_arduino_command("arduino-cli core update-index", None).await
}

// ================================
// LIBRARY MANAGEMENT
// ================================

/// Install an Arduino library
#[command]
pub async fn arduino_install_library(library: String) -> Result<ArduinoResult, String> {
    let cmd = format!("arduino-cli lib install \"{}\"", library);
    execute_arduino_command(&cmd, None).await
}

/// Install library from zip file
#[command]
pub async fn arduino_install_library_zip(zip_path: String) -> Result<ArduinoResult, String> {
    let cmd = format!("arduino-cli lib install --zip-path \"{}\"", zip_path);
    execute_arduino_command(&cmd, None).await
}

/// Install library from git URL
#[command]
pub async fn arduino_install_library_git(git_url: String) -> Result<ArduinoResult, String> {
    let cmd = format!("arduino-cli lib install --git-url \"{}\"", git_url);
    execute_arduino_command(&cmd, None).await
}

/// Uninstall an Arduino library
#[command]
pub async fn arduino_uninstall_library(library: String) -> Result<ArduinoResult, String> {
    let cmd = format!("arduino-cli lib uninstall \"{}\"", library);
    execute_arduino_command(&cmd, None).await
}

/// List installed libraries
#[command]
pub async fn arduino_list_libraries() -> Result<ArduinoResult, String> {
    execute_arduino_command("arduino-cli lib list", None).await
}

/// Search for libraries
#[command]
pub async fn arduino_search_libraries(query: String) -> Result<ArduinoResult, String> {
    let cmd = format!("arduino-cli lib search \"{}\"", query);
    execute_arduino_command(&cmd, None).await
}

/// Update library index
#[command]
pub async fn arduino_update_library_index() -> Result<ArduinoResult, String> {
    execute_arduino_command("arduino-cli lib update-index", None).await
}

/// Upgrade all installed libraries
#[command]
pub async fn arduino_upgrade_libraries() -> Result<ArduinoResult, String> {
    execute_arduino_command("arduino-cli lib upgrade", None).await
}

// ================================
// BOARD MANAGER URLs
// ================================

/// Add a board manager URL (for ESP32, ESP8266, etc.)
#[command]
pub async fn arduino_add_board_url(url: String) -> Result<ArduinoResult, String> {
    let cmd = format!(
        "arduino-cli config add board_manager.additional_urls \"{}\"",
        url
    );
    execute_arduino_command(&cmd, None).await
}

/// Remove a board manager URL
#[command]
pub async fn arduino_remove_board_url(url: String) -> Result<ArduinoResult, String> {
    let cmd = format!(
        "arduino-cli config remove board_manager.additional_urls \"{}\"",
        url
    );
    execute_arduino_command(&cmd, None).await
}

/// List configured board manager URLs
#[command]
pub async fn arduino_list_board_urls() -> Result<ArduinoResult, String> {
    execute_arduino_command("arduino-cli config dump --format json", None).await
}

// ================================
// SERIAL MONITOR
// ================================

/// Open serial monitor connection
#[command]
pub async fn arduino_serial_monitor_start(
    app_handle: AppHandle,
    port: String,
    baud_rate: u32,
) -> Result<(), String> {
    // Check if monitor exists and stop it first (without holding the lock across await)
    let needs_stop = {
        let monitors = SERIAL_MONITORS.lock().map_err(|e| e.to_string())?;
        monitors.contains_key(&port)
    };
    
    if needs_stop {
        // Stop existing monitor - this is sync now, no await needed
        stop_serial_monitor_sync(&port)?;
    }
    
    // Now create new monitor
    let running = Arc::new(Mutex::new(true));
    let running_clone = running.clone();
    let port_clone = port.clone();
    let app_handle_clone = app_handle.clone();
    
    let thread_handle = thread::spawn(move || {
        match serialport::new(&port_clone, baud_rate)
            .timeout(Duration::from_millis(100))
            .open()
        {
            Ok(mut serial_port) => {
                let mut buffer = [0u8; 1024];
                
                // Emit connected event
                let _ = app_handle_clone.emit("arduino-serial-connected", &port_clone);
                
                while *running_clone.lock().unwrap() {
                    match serial_port.read(&mut buffer) {
                        Ok(bytes_read) if bytes_read > 0 => {
                            let data = String::from_utf8_lossy(&buffer[..bytes_read]).to_string();
                            // Emit data to frontend
                            let _ = app_handle_clone.emit("arduino-serial-data", serde_json::json!({
                                "port": &port_clone,
                                "data": data
                            }));
                        }
                        Ok(_) => {}
                        Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => {
                            // Timeout is normal, continue
                        }
                        Err(e) => {
                            let _ = app_handle_clone.emit("arduino-serial-error", serde_json::json!({
                                "port": &port_clone,
                                "error": e.to_string()
                            }));
                            break;
                        }
                    }
                    thread::sleep(Duration::from_millis(10));
                }
                
                // Emit disconnected event
                let _ = app_handle_clone.emit("arduino-serial-disconnected", &port_clone);
            }
            Err(e) => {
                let _ = app_handle_clone.emit("arduino-serial-error", serde_json::json!({
                    "port": &port_clone,
                    "error": e.to_string()
                }));
            }
        }
    });
    
    // Insert into monitors map
    let mut monitors = SERIAL_MONITORS.lock().map_err(|e| e.to_string())?;
    monitors.insert(port, SerialMonitorHandle {
        running,
        thread_handle: Some(thread_handle),
    });
    
    Ok(())
}

/// Synchronous helper to stop serial monitor (doesn't use await)
fn stop_serial_monitor_sync(port: &str) -> Result<(), String> {
    let mut monitors = SERIAL_MONITORS.lock().map_err(|e| e.to_string())?;
    
    if let Some(mut handle) = monitors.remove(port) {
        // Signal thread to stop
        if let Ok(mut running) = handle.running.lock() {
            *running = false;
        }
        
        // Wait for thread to finish
        if let Some(thread_handle) = handle.thread_handle.take() {
            let _ = thread_handle.join();
        }
    }
    
    Ok(())
}

/// Stop serial monitor connection
#[command]
pub async fn arduino_serial_monitor_stop(port: String) -> Result<(), String> {
    stop_serial_monitor_sync(&port)
}

/// Send data through serial monitor
#[command]
pub async fn arduino_serial_monitor_send(
    port: String,
    data: String,
    add_newline: Option<bool>,
) -> Result<(), String> {
    let mut serial_port = serialport::new(&port, 9600)
        .timeout(Duration::from_millis(1000))
        .open()
        .map_err(|e| format!("Failed to open port: {}", e))?;
    
    let mut send_data = data;
    if add_newline.unwrap_or(true) {
        send_data.push('\n');
    }
    
    serial_port
        .write_all(send_data.as_bytes())
        .map_err(|e| format!("Failed to write: {}", e))?;
    
    Ok(())
}

/// Set serial port DTR (Data Terminal Ready) - useful for reset
#[command]
pub fn arduino_serial_set_dtr(port: String, value: bool) -> Result<(), String> {
    // ✅ FIX: Added `mut` here - write_data_terminal_ready requires mutable reference
    let mut serial_port = serialport::new(&port, 9600)
        .open()
        .map_err(|e| format!("Failed to open port: {}", e))?;
    
    serial_port
        .write_data_terminal_ready(value)
        .map_err(|e| format!("Failed to set DTR: {}", e))?;
    
    Ok(())
}

/// Reset Arduino board by toggling DTR
#[command]
pub fn arduino_reset_board(port: String) -> Result<(), String> {
    let mut serial_port = serialport::new(&port, 9600)
        .open()
        .map_err(|e| format!("Failed to open port: {}", e))?;
    
    // Toggle DTR to reset
    serial_port.write_data_terminal_ready(false).ok();
    thread::sleep(Duration::from_millis(100));
    serial_port.write_data_terminal_ready(true).ok();
    
    Ok(())
}

// ================================
// SKETCH MANAGEMENT
// ================================

/// Create a new Arduino sketch
#[command]
pub async fn arduino_new_sketch(
    sketch_name: String,
    destination_dir: String,
) -> Result<ArduinoResult, String> {
    let cmd = format!(
        "arduino-cli sketch new \"{}\"",
        format!("{}/{}", destination_dir, sketch_name)
    );
    execute_arduino_command(&cmd, None).await
}

/// Get sketch information (libraries used, etc.)
#[command]
pub async fn arduino_sketch_info(
    sketch_path: String,
    fqbn: String,
) -> Result<ArduinoResult, String> {
    let cmd = format!(
        "arduino-cli compile --fqbn \"{}\" \"{}\" --show-properties",
        fqbn, sketch_path
    );
    execute_arduino_command(&cmd, None).await
}

// ================================
// UPDATE EVERYTHING
// ================================

/// Update all indexes (cores and libraries)
#[command]
pub async fn arduino_update_all_indexes() -> Result<ArduinoResult, String> {
    let core_result = execute_arduino_command("arduino-cli core update-index", None).await?;
    let lib_result = execute_arduino_command("arduino-cli lib update-index", None).await?;
    
    Ok(ArduinoResult {
        success: core_result.success && lib_result.success,
        stdout: format!("{}\n\n{}", core_result.stdout, lib_result.stdout),
        stderr: format!("{}\n{}", core_result.stderr, lib_result.stderr),
        exit_code: if core_result.success && lib_result.success { 0 } else { 1 },
    })
}

/// Upgrade Arduino CLI itself (if installed via package manager)
#[command]
pub async fn arduino_upgrade_cli() -> Result<ArduinoResult, String> {
    execute_arduino_command("arduino-cli upgrade", None).await
}

// ================================
// COMMON BOARD URLS HELPER
// ================================

/// Get predefined board URLs for popular platforms
#[command]
pub fn arduino_get_common_board_urls() -> HashMap<String, String> {
    let mut urls = HashMap::new();
    
    urls.insert(
        "esp32".to_string(),
        "https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json".to_string()
    );
    
    urls.insert(
        "esp8266".to_string(),
        "http://arduino.esp8266.com/stable/package_esp8266com_index.json".to_string()
    );
    
    urls.insert(
        "stm32".to_string(),
        "https://github.com/stm32duino/BoardManagerFiles/raw/main/package_stmicroelectronics_index.json".to_string()
    );
    
    urls.insert(
        "attiny".to_string(),
        "http://drazzy.com/package_drazzy.com_index.json".to_string()
    );
    
    urls.insert(
        "rp2040".to_string(),
        "https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json".to_string()
    );
    
    urls.insert(
        "megaavr".to_string(),
        "https://mcudude.github.io/MegaCoreX/package_MCUdude_MegaCoreX_index.json".to_string()
    );
    
    urls.insert(
        "teensy".to_string(),
        "https://www.pjrc.com/teensy/package_teensy_index.json".to_string()
    );
    
    urls
}

// ================================
// HELPER FUNCTION
// ================================

/// Execute an Arduino CLI command
async fn execute_arduino_command(
    command: &str,
    working_dir: Option<String>,
) -> Result<ArduinoResult, String> {
    let work_dir = working_dir.unwrap_or_else(|| ".".to_string());
    
    #[cfg(target_os = "windows")]
    let output = Command::new("cmd")
        .args(["/C", command])
        .current_dir(&work_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output();
    
    #[cfg(not(target_os = "windows"))]
    let output = Command::new("sh")
        .args(["-c", command])
        .current_dir(&work_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output();
    
    match output {
        Ok(output) => Ok(ArduinoResult {
            success: output.status.success(),
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            exit_code: output.status.code().unwrap_or(-1),
        }),
        Err(e) => Err(format!("Failed to execute arduino-cli: {}", e)),
    }
}

// ================================
// BOOTLOADER COMMANDS
// ================================

/// Burn bootloader to a board (requires programmer)
#[command]
pub async fn arduino_burn_bootloader(
    port: String,
    fqbn: String,
    programmer: String,
) -> Result<ArduinoResult, String> {
    let cmd = format!(
        "arduino-cli burn-bootloader -p \"{}\" --fqbn \"{}\" --programmer \"{}\"",
        port, fqbn, programmer
    );
    execute_arduino_command(&cmd, None).await
}

/// List available programmers for a board
#[command]
pub async fn arduino_list_programmers(fqbn: String) -> Result<ArduinoResult, String> {
    let cmd = format!("arduino-cli board details --fqbn \"{}\"", fqbn);
    execute_arduino_command(&cmd, None).await
}

// ================================
// DEBUG COMMANDS
// ================================

/// Check for debug support
#[command]
pub async fn arduino_debug_check(
    sketch_path: String,
    fqbn: String,
    port: String,
) -> Result<ArduinoResult, String> {
    let cmd = format!(
        "arduino-cli debug --fqbn \"{}\" -p \"{}\" \"{}\" --info",
        fqbn, port, sketch_path
    );
    execute_arduino_command(&cmd, None).await
}
