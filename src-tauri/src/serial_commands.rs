// src-tauri/src/serial_commands.rs
// Serial Port Commands for Arduino Serial Monitor & Plotter
// Real-time serial communication with Arduino boards

use std::io::{BufRead, BufReader, Write};
use std::time::Duration;

// ============================================================================
// TYPES
// ============================================================================

#[derive(serde::Serialize, Clone, Debug)]
pub struct PortInfo {
    pub port: String,
    pub description: String,
    pub port_type: String,
    pub vid: Option<u16>,
    pub pid: Option<u16>,
}

#[derive(serde::Serialize, Debug)]
pub struct SerialData {
    pub values: Vec<f64>,
    pub raw: String,
    pub timestamp: u64,
}

// ============================================================================
// LIST AVAILABLE SERIAL PORTS
// ============================================================================

#[tauri::command]
pub fn list_serial_ports() -> Result<Vec<PortInfo>, String> {
    match serialport::available_ports() {
        Ok(ports) => {
            let infos: Vec<PortInfo> = ports.iter().map(|p| {
                let (desc, ptype, vid, pid) = match &p.port_type {
                    serialport::SerialPortType::UsbPort(usb) => (
                        format!("{} ({})", 
                            usb.product.as_deref().unwrap_or("USB Serial Device"),
                            usb.manufacturer.as_deref().unwrap_or("Unknown")
                        ),
                        "USB".to_string(),
                        Some(usb.vid),
                        Some(usb.pid),
                    ),
                    serialport::SerialPortType::BluetoothPort => (
                        "Bluetooth Serial".to_string(), 
                        "Bluetooth".to_string(),
                        None, None,
                    ),
                    serialport::SerialPortType::PciPort => (
                        "PCI Serial".to_string(), 
                        "PCI".to_string(),
                        None, None,
                    ),
                    serialport::SerialPortType::Unknown => (
                        "Serial Port".to_string(), 
                        "Serial".to_string(),
                        None, None,
                    ),
                };
                PortInfo { 
                    port: p.port_name.clone(), 
                    description: desc, 
                    port_type: ptype,
                    vid,
                    pid,
                }
            }).collect();
            
            println!("[Serial] Found {} ports", infos.len());
            Ok(infos)
        }
        Err(e) => {
            println!("[Serial] Error listing ports: {}", e);
            Err(format!("Failed to list ports: {}", e))
        }
    }
}

// ============================================================================
// READ VALUES FROM SERIAL (For Serial Plotter)
// ============================================================================

#[tauri::command]
pub fn serial_read_values(port: String, baud_rate: u32) -> Result<Vec<SerialData>, String> {
    let serial = serialport::new(&port, baud_rate)
        .timeout(Duration::from_millis(150))
        .open()
        .map_err(|e| format!("Cannot open {}: {}", port, e))?;
    
    let mut reader = BufReader::new(serial);
    let mut results: Vec<SerialData> = Vec::new();
    
    // Read up to 50 lines
    for _ in 0..50 {
        let mut line = String::new();
        match reader.read_line(&mut line) {
            Ok(0) => break, // EOF
            Ok(_) => {
                let raw = line.trim().to_string();
                if !raw.is_empty() {
                    // Parse numbers from line
                    // Supports: "123", "1,2,3", "1 2 3", "val:123"
                    let values: Vec<f64> = raw
                        .split(|c: char| c == ',' || c.is_whitespace() || c == '\t')
                        .filter_map(|s| {
                            let trimmed = s.trim();
                            // Handle "label:value" format
                            let num_str = if trimmed.contains(':') {
                                trimmed.split(':').last().unwrap_or(trimmed)
                            } else {
                                trimmed
                            };
                            num_str.parse().ok()
                        })
                        .collect();
                    
                    if !values.is_empty() {
                        results.push(SerialData {
                            values,
                            raw,
                            timestamp: std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap()
                                .as_millis() as u64,
                        });
                    }
                }
            }
            Err(_) => break, // Timeout or error
        }
    }
    
    Ok(results)
}

// ============================================================================
// READ LINES FROM SERIAL (For Serial Monitor)
// ============================================================================

#[tauri::command]
pub fn serial_read_lines(port: String, baud_rate: u32) -> Result<Vec<String>, String> {
    let serial = serialport::new(&port, baud_rate)
        .timeout(Duration::from_millis(150))
        .open()
        .map_err(|e| format!("Cannot open {}: {}", port, e))?;
    
    let mut reader = BufReader::new(serial);
    let mut lines: Vec<String> = Vec::new();
    
    // Read up to 50 lines
    for _ in 0..50 {
        let mut line = String::new();
        match reader.read_line(&mut line) {
            Ok(0) => break,
            Ok(_) => {
                let trimmed = line.trim().to_string();
                if !trimmed.is_empty() {
                    lines.push(trimmed);
                }
            }
            Err(_) => break,
        }
    }
    
    Ok(lines)
}

// ============================================================================
// WRITE TO SERIAL PORT
// ============================================================================

#[tauri::command]
pub fn serial_write(port: String, baud_rate: u32, data: String) -> Result<usize, String> {
    let mut serial = serialport::new(&port, baud_rate)
        .timeout(Duration::from_millis(1000))
        .open()
        .map_err(|e| format!("Cannot open {}: {}", port, e))?;
    
    let bytes_written = serial.write(data.as_bytes())
        .map_err(|e| format!("Write error: {}", e))?;
    
    println!("[Serial] Wrote {} bytes to {}", bytes_written, port);
    Ok(bytes_written)
}

// ============================================================================
// CHECK IF PORT EXISTS
// ============================================================================

#[tauri::command]
pub fn serial_port_exists(port: String) -> bool {
    match serialport::available_ports() {
        Ok(ports) => ports.iter().any(|p| p.port_name == port),
        Err(_) => false,
    }
}

// ============================================================================
// GET PORT INFO
// ============================================================================

#[tauri::command]
pub fn serial_port_info(port: String) -> Result<PortInfo, String> {
    match serialport::available_ports() {
        Ok(ports) => {
            for p in ports {
                if p.port_name == port {
                    let (desc, ptype, vid, pid) = match &p.port_type {
                        serialport::SerialPortType::UsbPort(usb) => (
                            format!("{} ({})", 
                                usb.product.as_deref().unwrap_or("USB Serial"),
                                usb.manufacturer.as_deref().unwrap_or("Unknown")
                            ),
                            "USB".to_string(),
                            Some(usb.vid),
                            Some(usb.pid),
                        ),
                        _ => (
                            "Serial Port".to_string(), 
                            "Serial".to_string(),
                            None, None,
                        ),
                    };
                    
                    return Ok(PortInfo {
                        port: p.port_name,
                        description: desc,
                        port_type: ptype,
                        vid,
                        pid,
                    });
                }
            }
            Err(format!("Port {} not found", port))
        }
        Err(e) => Err(format!("Failed to get port info: {}", e)),
    }
}

// ============================================================================
// GET COMMON BAUD RATES
// ============================================================================

#[tauri::command]
pub fn serial_get_baud_rates() -> Vec<u32> {
    vec![
        300, 1200, 2400, 4800, 9600, 14400, 19200, 28800,
        38400, 57600, 76800, 115200, 230400, 250000, 500000,
        1000000, 2000000
    ]
}
