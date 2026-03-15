// src-tauri/src/nvidia_commands.rs
// ═══════════════════════════════════════════════════════════════
// 🟢 NVIDIA GPU DETECTION MODULE — Phase 1: Jetson Aware
// ═══════════════════════════════════════════════════════════════
// Detects NVIDIA GPUs via nvidia-smi, parses output, and provides
// GPU info to the frontend status bar. ~1-2MB RAM briefly on call.

use serde::{Deserialize, Serialize};
use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

// ================================
// GPU INFO STRUCTS
// ================================

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NvidiaGpuInfo {
    pub available: bool,
    pub gpu_name: String,
    pub driver_version: String,
    pub cuda_version: String,
    pub memory_used_mb: u64,
    pub memory_total_mb: u64,
    pub memory_free_mb: u64,
    pub gpu_utilization: u32,
    pub memory_utilization: u32,
    pub temperature: u32,
    pub power_draw_w: f64,
    pub power_limit_w: f64,
    pub is_jetson: bool,
    pub jetson_model: String,
}

impl Default for NvidiaGpuInfo {
    fn default() -> Self {
        Self {
            available: false,
            gpu_name: String::new(),
            driver_version: String::new(),
            cuda_version: String::new(),
            memory_used_mb: 0,
            memory_total_mb: 0,
            memory_free_mb: 0,
            gpu_utilization: 0,
            memory_utilization: 0,
            temperature: 0,
            power_draw_w: 0.0,
            power_limit_w: 0.0,
            is_jetson: false,
            jetson_model: String::new(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NvidiaCudaInfo {
    pub cuda_available: bool,
    pub nvcc_version: String,
    pub toolkit_path: String,
}

// ================================
// HELPER: Create hidden command
// ================================

fn create_gpu_command(program: &str) -> Command {
    let mut cmd = Command::new(program);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

// ================================
// TAURI COMMANDS
// ================================

/// Check if nvidia-smi is available and return basic GPU info
#[tauri::command]
pub fn nvidia_check_gpu() -> Result<NvidiaGpuInfo, String> {
    println!("🟢 [NVIDIA] Checking for NVIDIA GPU...");
    
    let output = create_gpu_command("nvidia-smi")
        .args(&[
            "--query-gpu=name,driver_version,memory.used,memory.total,memory.free,utilization.gpu,utilization.memory,temperature.gpu,power.draw,power.limit",
            "--format=csv,noheader,nounits"
        ])
        .output();
    
    match output {
        Ok(result) => {
            if result.status.success() {
                let stdout = String::from_utf8_lossy(&result.stdout).to_string();
                let line = stdout.trim();
                
                if line.is_empty() {
                    println!("⚠️ [NVIDIA] nvidia-smi returned empty output");
                    return Ok(NvidiaGpuInfo::default());
                }
                
                // Parse CSV: name, driver_version, mem_used, mem_total, mem_free, gpu_util, mem_util, temp, power_draw, power_limit
                let parts: Vec<&str> = line.split(',').map(|s| s.trim()).collect();
                
                if parts.len() >= 10 {
                    let gpu_name = parts[0].to_string();
                    let is_jetson = gpu_name.to_lowercase().contains("orin")
                        || gpu_name.to_lowercase().contains("xavier")
                        || gpu_name.to_lowercase().contains("nano")
                        || gpu_name.to_lowercase().contains("tegra")
                        || gpu_name.to_lowercase().contains("jetson");
                    
                    let jetson_model = if is_jetson {
                        detect_jetson_model(&gpu_name)
                    } else {
                        String::new()
                    };
                    
                    // Get CUDA version from nvidia-smi header
                    let cuda_version = get_cuda_version_from_smi();
                    
                    let info = NvidiaGpuInfo {
                        available: true,
                        gpu_name: gpu_name.clone(),
                        driver_version: parts[1].to_string(),
                        cuda_version,
                        memory_used_mb: parts[2].parse().unwrap_or(0),
                        memory_total_mb: parts[3].parse().unwrap_or(0),
                        memory_free_mb: parts[4].parse().unwrap_or(0),
                        gpu_utilization: parts[5].parse().unwrap_or(0),
                        memory_utilization: parts[6].parse().unwrap_or(0),
                        temperature: parts[7].parse().unwrap_or(0),
                        power_draw_w: parts[8].parse().unwrap_or(0.0),
                        power_limit_w: parts[9].parse().unwrap_or(0.0),
                        is_jetson,
                        jetson_model,
                    };
                    
                    println!("✅ [NVIDIA] GPU detected: {} ({}MB / {}MB)", 
                        info.gpu_name, info.memory_used_mb, info.memory_total_mb);
                    
                    if info.is_jetson {
                        println!("🤖 [NVIDIA] Jetson device detected: {}", info.jetson_model);
                    }
                    
                    Ok(info)
                } else {
                    println!("⚠️ [NVIDIA] Unexpected csv format: {}", line);
                    Ok(NvidiaGpuInfo { available: true, gpu_name: line.to_string(), ..Default::default() })
                }
            } else {
                println!("ℹ️ [NVIDIA] nvidia-smi not available (no NVIDIA GPU or driver not installed)");
                Ok(NvidiaGpuInfo::default())
            }
        }
        Err(_) => {
            println!("ℹ️ [NVIDIA] nvidia-smi command not found");
            Ok(NvidiaGpuInfo::default())
        }
    }
}

/// Quick poll — lighter than full check, just GPU util + memory + temp
#[tauri::command]
pub fn nvidia_quick_poll() -> Result<NvidiaGpuInfo, String> {
    let output = create_gpu_command("nvidia-smi")
        .args(&[
            "--query-gpu=name,memory.used,memory.total,utilization.gpu,temperature.gpu",
            "--format=csv,noheader,nounits"
        ])
        .output();
    
    match output {
        Ok(result) if result.status.success() => {
            let stdout = String::from_utf8_lossy(&result.stdout).to_string();
            let parts: Vec<&str> = stdout.trim().split(',').map(|s| s.trim()).collect();
            
            if parts.len() >= 5 {
                Ok(NvidiaGpuInfo {
                    available: true,
                    gpu_name: parts[0].to_string(),
                    memory_used_mb: parts[1].parse().unwrap_or(0),
                    memory_total_mb: parts[2].parse().unwrap_or(0),
                    gpu_utilization: parts[3].parse().unwrap_or(0),
                    temperature: parts[4].parse().unwrap_or(0),
                    ..Default::default()
                })
            } else {
                Ok(NvidiaGpuInfo::default())
            }
        }
        _ => Ok(NvidiaGpuInfo::default())
    }
}

/// Check if CUDA toolkit (nvcc) is installed
#[tauri::command]
pub fn nvidia_check_cuda() -> Result<NvidiaCudaInfo, String> {
    println!("🟢 [NVIDIA] Checking for CUDA toolkit...");
    
    let output = create_gpu_command("nvcc")
        .args(&["--version"])
        .output();
    
    match output {
        Ok(result) if result.status.success() => {
            let stdout = String::from_utf8_lossy(&result.stdout).to_string();
            
            // Parse: "Cuda compilation tools, release 12.x, V12.x.xxx"
            let version = stdout
                .lines()
                .find(|l| l.contains("release"))
                .map(|l| {
                    l.split("release ")
                        .nth(1)
                        .unwrap_or("")
                        .split(',')
                        .next()
                        .unwrap_or("")
                        .trim()
                        .to_string()
                })
                .unwrap_or_default();
            
            // Try to find toolkit path
            let toolkit_path = std::env::var("CUDA_PATH")
                .or_else(|_| std::env::var("CUDA_HOME"))
                .unwrap_or_else(|_| {
                    if cfg!(target_os = "windows") {
                        "C:\\Program Files\\NVIDIA GPU Computing Toolkit\\CUDA".to_string()
                    } else {
                        "/usr/local/cuda".to_string()
                    }
                });
            
            println!("✅ [NVIDIA] CUDA toolkit found: v{}", version);
            
            Ok(NvidiaCudaInfo {
                cuda_available: true,
                nvcc_version: version,
                toolkit_path,
            })
        }
        _ => {
            println!("ℹ️ [NVIDIA] CUDA toolkit (nvcc) not found");
            Ok(NvidiaCudaInfo {
                cuda_available: false,
                nvcc_version: String::new(),
                toolkit_path: String::new(),
            })
        }
    }
}

/// Get NVIDIA GPU process list (what's using the GPU)
#[tauri::command]
pub fn nvidia_get_processes() -> Result<String, String> {
    let output = create_gpu_command("nvidia-smi")
        .args(&["--query-compute-apps=pid,name,used_gpu_memory", "--format=csv,noheader,nounits"])
        .output();
    
    match output {
        Ok(result) if result.status.success() => {
            Ok(String::from_utf8_lossy(&result.stdout).trim().to_string())
        }
        _ => Ok(String::new())
    }
}

// ================================
// INTERNAL HELPERS
// ================================

fn get_cuda_version_from_smi() -> String {
    let output = create_gpu_command("nvidia-smi")
        .output();
    
    match output {
        Ok(result) if result.status.success() => {
            let stdout = String::from_utf8_lossy(&result.stdout).to_string();
            // Look for "CUDA Version: 12.x"
            stdout
                .lines()
                .find(|l| l.contains("CUDA Version"))
                .map(|l| {
                    l.split("CUDA Version:")
                        .nth(1)
                        .unwrap_or("")
                        .trim()
                        .split_whitespace()
                        .next()
                        .unwrap_or("")
                        .to_string()
                })
                .unwrap_or_default()
        }
        _ => String::new()
    }
}

fn detect_jetson_model(gpu_name: &str) -> String {
    let name_lower = gpu_name.to_lowercase();
    
    if name_lower.contains("orin nano") {
        "Jetson Orin Nano".to_string()
    } else if name_lower.contains("orin nx") {
        "Jetson Orin NX".to_string()
    } else if name_lower.contains("agx orin") {
        "Jetson AGX Orin".to_string()
    } else if name_lower.contains("xavier nx") {
        "Jetson Xavier NX".to_string()
    } else if name_lower.contains("agx xavier") {
        "Jetson AGX Xavier".to_string()
    } else if name_lower.contains("nano") {
        "Jetson Nano".to_string()
    } else if name_lower.contains("tx2") {
        "Jetson TX2".to_string()
    } else if name_lower.contains("thor") {
        "Jetson Thor".to_string()
    } else {
        format!("Jetson ({})", gpu_name)
    }
}
