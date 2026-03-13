// src/ide/nvidia/jetsonAIContext.ts
// ═══════════════════════════════════════════════════════════════
// 🟢 JETSON AI CONTEXT — Phase 1: Jetson Aware
// ═══════════════════════════════════════════════════════════════
// Adds Jetson/CUDA/TensorRT knowledge to the AI assistant via
// trigger patterns and system prompts for the Boundless Memory
// and Calibration Matrix systems.
// RAM Impact: ~10-20KB (string arrays in memory)

// ════════════════════════════════════════════
// TRIGGER PATTERNS — Detect Jetson/CUDA context
// ════════════════════════════════════════════

export const JETSON_TRIGGER_PATTERNS: string[] = [
  // NVIDIA / CUDA keywords
  'cuda', 'nvidia', 'gpu', 'gpu memory', 'vram',
  'kernel launch', '__global__', '__device__', '__shared__',
  'threadIdx', 'blockIdx', 'blockDim', 'gridDim',
  'cudaMalloc', 'cudaMemcpy', 'cudaFree', 'cudaDeviceSynchronize',
  'nvcc', 'cuda toolkit', 'compute capability', 'sm_87', 'sm_72',
  'warp', 'warp divergence', 'coalesced', 'shared memory', 'bank conflict',
  'occupancy', 'registers per thread', 'cuda streams', 'cuda events',
  'unified memory', 'managed memory', 'pinned memory', 'page-locked',
  
  // Jetson-specific
  'jetson', 'orin', 'orin nano', 'agx orin', 'xavier',
  'jetpack', 'jetson jetpack', 'l4t', 'linux for tegra',
  'tegrastats', 'nvpmodel', 'jetson_clocks', 'jetson power',
  'jetson camera', 'csi camera', 'nvarguscamerasrc',
  'jetson gpio', 'jetson nano', 'jetson orin nano 8gb',
  'jetson deployment', 'edge ai', 'edge inference',
  'deepstream', 'jetson deepstream', 'gstreamer nvidia',
  '40 tops', '275 tops', 'jetson thor',
  
  // TensorRT
  'tensorrt', 'trt', 'trtexec',
  'onnx to tensorrt', 'model optimization', 'fp16 inference', 'int8 quantization',
  'tensorrt engine', '.engine file', 'tensorrt builder',
  'nvinfer', 'IBuilder', 'ICudaEngine', 'IExecutionContext',
  'calibration table', 'dynamic batch', 'tensorrt plugin',
  
  // cuDNN / CUDA libraries
  'cudnn', 'cublas', 'cusparse', 'cufft', 'curand', 'nccl',
  'cuda-gdb', 'nsight', 'nvprof', 'nsight systems', 'nsight compute',
  
  // PyTorch on Jetson
  'torch.cuda', 'torch cuda', 'pytorch jetson', 'torch2trt',
  'torch.jit', 'torchscript',
  
  // Robotics / Vision (common Jetson use cases)
  'ros2 jetson', 'isaac ros', 'nvidia isaac',
  'yolov8 jetson', 'object detection jetson', 'pose estimation jetson',
  'jetson inference', 'jetson-inference', 'jetson-utils',
  'stereo camera', 'depth estimation', 'lidar jetson',
  
  // Cross-compilation
  'cross compile', 'aarch64', 'arm64 build',
  'cmake cuda', 'cmake jetson',
];

// ════════════════════════════════════════════
// SYSTEM PROMPTS — AI context injection
// ════════════════════════════════════════════

export const JETSON_SYSTEM_PROMPTS = {
  /** General CUDA development context */
  cuda_general: `You are helping with NVIDIA CUDA development. Key guidelines:
- Always include error checking with cudaGetLastError/cudaGetErrorString
- Recommend appropriate SM architecture: sm_87 (Orin), sm_72 (Xavier), sm_86 (RTX 30xx), sm_89 (RTX 40xx)
- Suggest shared memory optimizations for memory-bound kernels
- Warn about warp divergence in conditional code
- Use cuda events for timing, not CPU timers
- Recommend cudaMallocManaged for simplified memory management in prototypes
- For production: explicit cudaMemcpy with pinned host memory for best throughput`,

  /** Jetson-specific development context */
  jetson_dev: `You are helping with NVIDIA Jetson development. Critical Jetson considerations:
- Jetson uses SHARED memory (CPU and GPU share the same RAM)
  - Orin Nano: 8GB shared → budget ~4GB for GPU, ~3GB for system, ~1GB for IDE/apps
  - AGX Orin: 32/64GB shared → more headroom but still shared
- Power modes matter: nvpmodel -m 0 (MAXN) vs -m 2 (low power)
- Use jetson_clocks to lock at max frequency for benchmarking
- tegrastats for real-time monitoring: memory, CPU, GPU, power
- JetPack 6.x = Ubuntu 22.04 + L4T + CUDA + TensorRT + cuDNN
- CSI cameras need GStreamer pipelines (nvarguscamerasrc)
- USB cameras work with standard V4L2/OpenCV
- For PyTorch: use NVIDIA's pre-built wheels, not pip default
- TensorRT FP16 is the sweet spot for Jetson (2x speed, minimal accuracy loss)
- INT8 gives another 2x but requires calibration dataset
- DLA (Deep Learning Accelerator) available on Orin for extra parallel inference`,

  /** TensorRT optimization context */
  tensorrt: `You are helping with NVIDIA TensorRT optimization. Best practices:
- Always start with FP16 — it's nearly free on Jetson/modern GPUs
- INT8 requires representative calibration data (100-500 images typical)
- Use trtexec for quick benchmarking: trtexec --onnx=model.onnx --fp16 --workspace=1024
- Dynamic batching: set min/opt/max profiles for flexible batch sizes
- Engine files are GPU-specific — rebuild when moving between devices
- For Jetson: workspace of 1GB is usually sufficient for most models
- Common ONNX → TensorRT issues: unsupported ops, dynamic shapes, opset version
- Use ONNX simplifier (onnxsim) before TensorRT conversion
- Monitor with: nvidia-smi dmon (desktop) or tegrastats (Jetson)`,

  /** Safety-critical / embedded context */
  safety_critical: `This appears to be safety-critical embedded development. Extra considerations:
- MISRA C/C++ compliance for safety-critical code paths
- Separate GPU inference from safety-critical control loops
- Implement watchdog timers for GPU kernel timeouts
- Use deterministic execution (disable CUDA auto-tuning in production)
- Log and monitor GPU errors — they can indicate hardware issues
- Validate all sensor inputs before feeding to AI models
- Implement graceful degradation if GPU becomes unavailable
- Consider NVIDIA's safety certifications for Jetson in automotive/medical`,
};

// ════════════════════════════════════════════
// CONTEXT DETECTION — Analyze user message
// ════════════════════════════════════════════

export interface JetsonContext {
  isJetsonRelated: boolean;
  isCudaRelated: boolean;
  isTensorRTRelated: boolean;
  isSafetyCritical: boolean;
  matchedPatterns: string[];
  recommendedPrompt: string;
}

/**
 * Analyze a user message for Jetson/CUDA context
 * Used by the AI assistant to inject appropriate system prompts
 */
export function detectJetsonContext(message: string): JetsonContext {
  const msgLower = message.toLowerCase();
  const matched: string[] = [];
  
  for (const pattern of JETSON_TRIGGER_PATTERNS) {
    if (msgLower.includes(pattern.toLowerCase())) {
      matched.push(pattern);
    }
  }
  
  const isJetson = matched.some(p => 
    ['jetson', 'orin', 'xavier', 'jetpack', 'tegrastats', 'nvpmodel', 'l4t', 'deepstream']
    .includes(p)
  );
  
  const isCuda = matched.some(p => 
    ['cuda', '__global__', '__device__', 'cudaMalloc', 'nvcc', 'kernel launch', 'threadIdx']
    .includes(p)
  );
  
  const isTensorRT = matched.some(p => 
    ['tensorrt', 'trt', 'trtexec', 'nvinfer', 'IBuilder', 'ICudaEngine']
    .includes(p)
  );
  
  const isSafety = msgLower.includes('safety') || msgLower.includes('misra') || 
                   msgLower.includes('medical') || msgLower.includes('automotive') ||
                   msgLower.includes('safety-critical');
  
  // Build combined prompt
  let prompt = '';
  if (isJetson) prompt += JETSON_SYSTEM_PROMPTS.jetson_dev + '\n\n';
  else if (isCuda) prompt += JETSON_SYSTEM_PROMPTS.cuda_general + '\n\n';
  if (isTensorRT) prompt += JETSON_SYSTEM_PROMPTS.tensorrt + '\n\n';
  if (isSafety) prompt += JETSON_SYSTEM_PROMPTS.safety_critical + '\n\n';
  
  // Fallback: if we matched patterns but no specific category
  if (matched.length > 0 && !prompt) {
    prompt = JETSON_SYSTEM_PROMPTS.cuda_general;
  }
  
  return {
    isJetsonRelated: isJetson,
    isCudaRelated: isCuda,
    isTensorRTRelated: isTensorRT,
    isSafetyCritical: isSafety,
    matchedPatterns: matched,
    recommendedPrompt: prompt.trim(),
  };
}

/**
 * Get a brief context string for the AI calibration matrix
 */
export function getJetsonContextTag(message: string): string {
  const ctx = detectJetsonContext(message);
  if (!ctx.matchedPatterns.length) return '';
  
  const tags: string[] = [];
  if (ctx.isJetsonRelated) tags.push('JETSON');
  if (ctx.isCudaRelated) tags.push('CUDA');
  if (ctx.isTensorRTRelated) tags.push('TENSORRT');
  if (ctx.isSafetyCritical) tags.push('SAFETY');
  
  return tags.length > 0 ? `[${tags.join('+')}]` : '[GPU]';
}

// Expose to window for Boundless Memory integration
(window as any).detectJetsonContext = detectJetsonContext;
(window as any).getJetsonContextTag = getJetsonContextTag;
(window as any).JETSON_TRIGGER_PATTERNS = JETSON_TRIGGER_PATTERNS;

console.log(`🟢 [JETSON] AI context loaded: ${JETSON_TRIGGER_PATTERNS.length} trigger patterns`);
