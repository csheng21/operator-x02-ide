// nvidia/nvidiaSampleModal.ts
// NVIDIA Sample Project Modal + createNvidiaSample
// Extracted from main.ts

// ============================================================================
// NVIDIA SAMPLE PROJECT MODAL + createNvidiaSample (with AI panel card)
// ============================================================================
export function showNvidiaSampleModal(): void {
  const existing = document.getElementById('nvidia-sample-modal');
  if (existing) existing.remove();

  const SAMPLES = [
    { id:'hello',         icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#76b900" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`, title:'CUDA Hello World',       sub:'Vector add kernel',        color:'#76b900' },
    { id:'tensorrt',      icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#76b900" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>`, title:'TensorRT Inference',     sub:'ONNX to TRT engine',       color:'#76b900' },
    { id:'multi-gpu',     icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#76b900" stroke-width="2"><rect x="2" y="6" width="8" height="12" rx="1"/><rect x="14" y="6" width="8" height="12" rx="1"/><path d="M10 12h4"/></svg>`, title:'Multi-GPU Pipeline',     sub:'Peer-access kernels',      color:'#76b900' },
    { id:'object-detect', icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" stroke-width="2"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="8" y="8" width="8" height="8" rx="1"/></svg>`, title:'Object Detection',       sub:'YOLOv8 + TensorRT',        color:'#4fc3f7' },
    { id:'img-proc',      icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`, title:'Image Processing',       sub:'Blur, Sobel, Histogram',   color:'#4fc3f7' },
    { id:'pose',          icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" stroke-width="2"><circle cx="12" cy="4" r="2"/><path d="M12 6v6l-3 4M12 12l3 4M9 10h6"/></svg>`, title:'Pose Estimation',         sub:'MediaPipe GPU',            color:'#4fc3f7' },
    { id:'particles',     icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffb74d" stroke-width="2"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/><circle cx="12" cy="12" r="2"/></svg>`, title:'Particle Simulation',    sub:'N-body gravity on GPU',    color:'#ffb74d' },
    { id:'jetson-cam',    icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffb74d" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`, title:'Jetson Camera Pipeline',  sub:'GStreamer + AI overlay',   color:'#ffb74d' },
  ];

  let selectedId = '';

  const overlay = document.createElement('div');
  overlay.id = 'nvidia-sample-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:99999;display:flex;align-items:center;justify-content:center;animation:fadeIn .15s ease;';

  overlay.innerHTML = `
    <style>
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
      #nv-modal-box{background:#1e1e1e;border-radius:12px;padding:28px 32px 24px;width:520px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.7);animation:slideUp .2s ease;border:1px solid #333;}
      #nv-modal-box::-webkit-scrollbar{width:4px}
      #nv-modal-box::-webkit-scrollbar-thumb{background:#444;border-radius:2px}
      .nv-header{text-align:center;margin-bottom:20px}
      .nv-logo{margin-bottom:8px;display:flex;align-items:center;justify-content:center;}
      .nv-title{font-size:20px;font-weight:700;color:#fff;margin:0 0 4px}
      .nv-subtitle{font-size:12px;color:#888;margin:0}
      .nv-field{margin-bottom:16px}
      .nv-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
      .nv-input{width:100%;background:#2d2d2d;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px;padding:8px 12px;box-sizing:border-box;outline:none;transition:border-color .2s;}
      .nv-input:focus{border-color:#76b900}
      .nv-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;}
      .nv-card{background:#2a2a2a;border:2px solid #383838;border-radius:8px;padding:14px 12px;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;align-items:center;text-align:center;}
      .nv-card:hover{background:#2f2f2f;border-color:#555;transform:translateY(-1px)}
      .nv-card.selected{border-color:#76b900;background:#1a2600}
      .nv-card-icon{display:flex;align-items:center;justify-content:center;margin-bottom:6px;}
      .nv-card-title{font-size:13px;font-weight:600;color:#fff;margin-bottom:2px}
      .nv-card-sub{font-size:10px;color:#888}
      .nv-btn{width:100%;padding:12px;border-radius:8px;border:none;cursor:pointer;font-size:14px;font-weight:600;letter-spacing:.3px;transition:all .15s;}
      .nv-btn-create{background:#76b900;color:#000;}
      .nv-btn-create:hover{background:#8fd400}
      .nv-btn-create:disabled{background:#3a3a3a;color:#666;cursor:not-allowed}
      .nv-close{position:absolute;top:16px;right:20px;background:none;border:none;color:#888;font-size:20px;cursor:pointer;line-height:1;}
      .nv-close:hover{color:#fff}
    </style>
    <div id="nv-modal-box" style="position:relative">
      <button class="nv-close" id="nv-close-btn">&times;</button>
      <div class="nv-header">
        <div class="nv-logo"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#76b900" stroke-width="1.5"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 6V4M16 6V4M8 18v2M16 18v2M3 10h18M3 14h18"/><circle cx="8" cy="12" r="1" fill="#76b900"/><circle cx="12" cy="12" r="1" fill="#76b900"/><circle cx="16" cy="12" r="1" fill="#76b900"/></svg></div>
        <div class="nv-title">New NVIDIA Sample Project</div>
        <div class="nv-subtitle">CUDA &bull; TensorRT &bull; Jetson</div>
      </div>
      <div class="nv-field">
        <div class="nv-label">Project Name</div>
        <input class="nv-input" id="nv-proj-name" type="text" placeholder="my-cuda-project" />
      </div>
      <div class="nv-label" style="margin-bottom:10px">Sample Type</div>
      <div class="nv-grid" id="nv-grid"></div>
      <button class="nv-btn nv-btn-create" id="nv-create-btn" disabled>&#9889; Create NVIDIA Project</button>
    </div>
  `;

  document.body.appendChild(overlay);

  const defaultNames: Record<string,string> = {
    'hello':'cuda-hello-world','tensorrt':'tensorrt-inference','multi-gpu':'multi-gpu-pipeline',
    'object-detect':'yolov8-detection','img-proc':'cuda-image-processing','pose':'pose-estimation',
    'particles':'cuda-particles','jetson-cam':'jetson-camera-pipeline',
  };

  const grid = document.getElementById('nv-grid')!;
  SAMPLES.forEach(s => {
    const card = document.createElement('div');
    card.className = 'nv-card';
    card.dataset.id = s.id;
    card.innerHTML = `<div class="nv-card-icon">${s.icon}</div><div class="nv-card-title">${s.title}</div><div class="nv-card-sub">${s.sub}</div>`;
    card.onclick = () => {
      document.querySelectorAll('.nv-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedId = s.id;
      const nameInput = document.getElementById('nv-proj-name') as HTMLInputElement;
      if (!nameInput.value || nameInput.value === nameInput.dataset.auto) {
        nameInput.value = defaultNames[s.id] || s.id;
        nameInput.dataset.auto = nameInput.value;
      }
      (document.getElementById('nv-create-btn') as HTMLButtonElement).disabled = false;
    };
    grid.appendChild(card);
  });

  document.getElementById('nv-close-btn')!.onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  document.getElementById('nv-create-btn')!.onclick = async () => {
    if (!selectedId) return;
    const nameInput = document.getElementById('nv-proj-name') as HTMLInputElement;
    const projName = (nameInput.value.trim() || selectedId).replace(/\s+/g,'-');
    overlay.remove();
    await createNvidiaSample(selectedId as any, projName);
  };
}

export async function createNvidiaSample(
  type: 'hello'|'tensorrt'|'multi-gpu'|'object-detect'|'img-proc'|'pose'|'particles'|'jetson-cam',
  projectName?: string
): Promise<void> {

  // FIX: always resolve to ~/OperatorX02/projects/, never nest inside open project
  let basePath: string = "";
  try {
    const { invoke: _inv } = await import("@tauri-apps/api/core");
    basePath = await _inv<string>("get_projects_path");
  } catch {
    // Fallback: go ONE level UP from currently open project folder
    const cur: string =
      (window as any).currentProjectPath ||
      (window as any).currentFolderPath  ||
      localStorage.getItem("ide_last_project_path") || "";
    if (cur) {
      const parts = cur.replace(/\\/g, "/").split("/").filter(Boolean);
      parts.pop();
      basePath = parts.join("/");
      basePath = basePath.replace(/^([A-Za-z])(?=\/)/, "$1:");
    }
  }

  if (!basePath) {
    alert("Cannot resolve a projects folder.\nPlease open any folder first.");
    return;
  }

  const defaultNames: Record<string,string> = {
    'hello':'cuda-hello-world','tensorrt':'tensorrt-inference','multi-gpu':'multi-gpu-pipeline',
    'object-detect':'yolov8-detection','img-proc':'cuda-image-processing','pose':'pose-estimation',
    'particles':'cuda-particles','jetson-cam':'jetson-camera-pipeline',
  };
  const name = projectName || defaultNames[type];
  const projectPath = basePath.replace(/\\/g, "/") + "/" + name;

  const samples: Record<string, Record<string,string>> = {
    'hello': {
      'README.md': '# CUDA Hello World\nVector addition kernel on GPU.\n\n## Build\n```bash\nnvcc src/hello.cu -o hello && ./hello\n```\n',
      'src/hello.cu': '#include <stdio.h>\n#include <cuda_runtime.h>\n__global__ void vecAdd(float* a,float* b,float* c,int n){\n    int i=blockIdx.x*blockDim.x+threadIdx.x;\n    if(i<n) c[i]=a[i]+b[i];\n}\nint main(){\n    const int N=1024;\n    float *ha=new float[N],*hb=new float[N],*hc=new float[N];\n    for(int i=0;i<N;i++){ha[i]=i;hb[i]=i*2.0f;}\n    float *da,*db,*dc;\n    cudaMalloc(&da,N*4);cudaMalloc(&db,N*4);cudaMalloc(&dc,N*4);\n    cudaMemcpy(da,ha,N*4,cudaMemcpyHostToDevice);\n    cudaMemcpy(db,hb,N*4,cudaMemcpyHostToDevice);\n    vecAdd<<<(N+255)/256,256>>>(da,db,dc,N);\n    cudaMemcpy(hc,dc,N*4,cudaMemcpyDeviceToHost);\n    printf("c[0]=%.0f c[1023]=%.0f\\n",hc[0],hc[1023]);\n    printf("CUDA Hello World OK!\\n");\n    return 0;\n}',
      'CMakeLists.txt': 'cmake_minimum_required(VERSION 3.18)\nproject(HelloCUDA CUDA)\nadd_executable(hello src/hello.cu)',
      '.gitignore': 'hello\n*.o\nbuild/',
    },
    'tensorrt': {
      'README.md': '# TensorRT Inference\nONNX to TensorRT engine on NVIDIA GPU.\n\n## Run\n```bash\npip install -r requirements.txt\npython src/infer.py\n```\n',
      'src/infer.py': '#!/usr/bin/env python3\nimport numpy as np, time\ntry:\n    import tensorrt as trt, pycuda.driver as cuda, pycuda.autoinit\n    TRT=True\nexcept ImportError:\n    TRT=False; print("[MOCK] TensorRT not found")\n\ndef run():\n    t0=time.time()\n    if not TRT:\n        result=np.random.rand(1000).astype(np.float32)\n        top5=np.argsort(result)[-5:][::-1]\n        print(f"[MOCK] Top-5: {top5}  ({(time.time()-t0)*1000:.1f}ms)")\n    else:\n        print("TRT ready. Load engine and run inference.")\n\nif __name__=="__main__": run()\n',
      'requirements.txt': 'tensorrt>=8.0\npycuda\nnumpy\nonnx\nonnxruntime-gpu\n',
      '.gitignore': '*.trt\n*.engine\n__pycache__/',
    },
    'multi-gpu': {
      'README.md': '# Multi-GPU Pipeline\nCUDA peer-access data-parallel kernels.\n\n## Build\n```bash\nnvcc src/pipeline.cu -o pipeline && ./pipeline\n```\n',
      'src/pipeline.cu': '#include <stdio.h>\n#include <cuda_runtime.h>\n__global__ void processChunk(float* d,int n,int g){\n    int i=blockIdx.x*blockDim.x+threadIdx.x;\n    if(i<n) d[i]=d[i]*2.0f+g;\n}\nint main(){\n    int devs=0; cudaGetDeviceCount(&devs);\n    printf("Devices: %d\\n",devs);\n    const int N=4096; int chunk=N/((devs>0)?devs:1);\n    float **dd=new float*[devs]; float *hd=new float[N];\n    for(int i=0;i<N;i++) hd[i]=(float)i;\n    for(int g=0;g<devs;g++){cudaSetDevice(g);cudaMalloc(&dd[g],chunk*4);cudaMemcpy(dd[g],hd+g*chunk,chunk*4,cudaMemcpyHostToDevice);processChunk<<<(chunk+255)/256,256>>>(dd[g],chunk,g);}\n    for(int g=0;g<devs;g++){cudaSetDevice(g);cudaDeviceSynchronize();cudaMemcpy(hd+g*chunk,dd[g],chunk*4,cudaMemcpyDeviceToHost);printf("GPU%d [0]=%.1f\\n",g,hd[g*chunk]);cudaFree(dd[g]);}\n    printf("Multi-GPU done!\\n"); return 0;\n}',
      '.gitignore': 'pipeline\n*.o\nbuild/',
    },
    'object-detect': {
      'README.md': '# Object Detection - YOLOv8\nReal-time GPU object detection.\n\n## Run\n```bash\npip install -r requirements.txt\npython src/detect.py --source webcam\n```\n',
      'src/detect.py': '#!/usr/bin/env python3\nimport argparse, time, cv2, numpy as np\ntry:\n    from ultralytics import YOLO\n    MODEL=YOLO("yolov8n.pt"); HAS_YOLO=True\nexcept ImportError:\n    HAS_YOLO=False\n\nCLASSES=["person","bicycle","car","cat","dog"]\n\ndef detect(source,conf=0.5):\n    cap=cv2.VideoCapture(0 if source=="webcam" else source)\n    while cap.isOpened():\n        ret,frame=cap.read()\n        if not ret: break\n        t0=time.time()\n        if HAS_YOLO:\n            r=MODEL(frame,conf=conf,verbose=False); frame=r[0].plot()\n        fps=1/(time.time()-t0+1e-9)\n        cv2.putText(frame,f"FPS:{fps:.1f}",(10,30),cv2.FONT_HERSHEY_SIMPLEX,1,(0,255,0),2)\n        cv2.imshow("YOLOv8",frame)\n        if cv2.waitKey(1)&0xFF==ord("q"): break\n    cap.release(); cv2.destroyAllWindows()\n\nif __name__=="__main__":\n    ap=argparse.ArgumentParser()\n    ap.add_argument("--source",default="webcam")\n    ap.add_argument("--conf",type=float,default=0.5)\n    detect(ap.parse_args().source,ap.parse_args().conf)\n',
      'requirements.txt': 'ultralytics>=8.0\nopencv-python\nnumpy\n',
      'data/.gitkeep': '',
      '.gitignore': '*.pt\n*.engine\n__pycache__/',
    },
    'img-proc': {
      'README.md': '# CUDA Image Processing\nGaussian blur + Sobel edges on GPU.\n\n## Build\n```bash\nnvcc src/filters.cu -o filters && ./filters\n```\n',
      'src/filters.cu': '#include <stdio.h>\n#include <cuda_runtime.h>\n#include <math.h>\n__global__ void gaussianBlur(const unsigned char* in,unsigned char* out,int w,int h,int ch){\n    int x=blockIdx.x*blockDim.x+threadIdx.x,y=blockIdx.y*blockDim.y+threadIdx.y;\n    if(x>=w||y>=h) return;\n    const float k[5][5]={{1,4,7,4,1},{4,16,26,16,4},{7,26,41,26,7},{4,16,26,16,4},{1,4,7,4,1}};\n    for(int c=0;c<ch;c++){float s=0;for(int ky=-2;ky<=2;ky++) for(int kx=-2;kx<=2;kx++){int nx=min(max(x+kx,0),w-1),ny=min(max(y+ky,0),h-1);s+=k[ky+2][kx+2]*in[(ny*w+nx)*ch+c];}out[(y*w+x)*ch+c]=(unsigned char)(s/273.0f);}\n}\n__global__ void sobelEdge(const unsigned char* g,unsigned char* e,int w,int h){\n    int x=blockIdx.x*blockDim.x+threadIdx.x,y=blockIdx.y*blockDim.y+threadIdx.y;\n    if(x<1||y<1||x>=w-1||y>=h-1) return;\n    int Gx=-g[(y-1)*w+x-1]+g[(y-1)*w+x+1]-2*g[y*w+x-1]+2*g[y*w+x+1]-g[(y+1)*w+x-1]+g[(y+1)*w+x+1];\n    int Gy=-g[(y-1)*w+x-1]-2*g[(y-1)*w+x]-g[(y-1)*w+x+1]+g[(y+1)*w+x-1]+2*g[(y+1)*w+x]+g[(y+1)*w+x+1];\n    e[y*w+x]=(unsigned char)min((int)sqrtf(Gx*Gx+Gy*Gy),255);\n}\nint main(){\n    int W=640,H=480,C=3,N=W*H;\n    unsigned char *hi=new unsigned char[N*C],*ho=new unsigned char[N*C],*hg=new unsigned char[N],*he=new unsigned char[N];\n    for(int i=0;i<N;i++){hi[i*C]=i%255;hi[i*C+1]=(i/W)%255;hi[i*C+2]=128;hg[i]=hi[i*C]/3+hi[i*C+1]/3+64;}\n    unsigned char *di,*dob,*dg,*de;\n    cudaMalloc(&di,N*C);cudaMalloc(&dob,N*C);cudaMalloc(&dg,N);cudaMalloc(&de,N);\n    cudaMemcpy(di,hi,N*C,cudaMemcpyHostToDevice);cudaMemcpy(dg,hg,N,cudaMemcpyHostToDevice);\n    dim3 bl(16,16),gr((W+15)/16,(H+15)/16);\n    gaussianBlur<<<gr,bl>>>(di,dob,W,H,C);sobelEdge<<<gr,bl>>>(dg,de,W,H);\n    cudaDeviceSynchronize();\n    cudaMemcpy(ho,dob,N*C,cudaMemcpyDeviceToHost);cudaMemcpy(he,de,N,cudaMemcpyDeviceToHost);\n    printf("Blur[0]=%d,%d,%d  Edge[320]=%d\\n",ho[0],ho[1],ho[2],he[320]);\n    printf("CUDA Image Processing OK!\\n"); return 0;\n}',
      '.gitignore': 'filters\n*.o\nbuild/',
    },
    'pose': {
      'README.md': '# Pose Estimation\nGPU real-time human pose via MediaPipe.\n\n## Run\n```bash\npip install -r requirements.txt\npython src/pose.py --source webcam\n```\n',
      'src/pose.py': '#!/usr/bin/env python3\nimport argparse, cv2, time\ntry:\n    import mediapipe as mp\n    mp_pose=mp.solutions.pose; mp_draw=mp.solutions.drawing_utils\n    POSE=mp_pose.Pose(min_detection_confidence=0.5,min_tracking_confidence=0.5); HAS_MP=True\nexcept ImportError:\n    HAS_MP=False\n\ndef run(source):\n    cap=cv2.VideoCapture(0 if source=="webcam" else source)\n    while cap.isOpened():\n        ret,frame=cap.read()\n        if not ret: break\n        t0=time.time()\n        if HAS_MP:\n            rgb=cv2.cvtColor(frame,cv2.COLOR_BGR2RGB); rgb.flags.writeable=False\n            res=POSE.process(rgb); rgb.flags.writeable=True\n            frame=cv2.cvtColor(rgb,cv2.COLOR_RGB2BGR)\n            if res.pose_landmarks: mp_draw.draw_landmarks(frame,res.pose_landmarks,mp_pose.POSE_CONNECTIONS)\n        fps=1/(time.time()-t0+1e-9)\n        cv2.putText(frame,f"FPS:{fps:.1f}",(10,30),cv2.FONT_HERSHEY_SIMPLEX,1,(0,255,0),2)\n        cv2.imshow("Pose",frame)\n        if cv2.waitKey(5)&0xFF==ord("q"): break\n    cap.release(); cv2.destroyAllWindows()\n\nif __name__=="__main__":\n    ap=argparse.ArgumentParser(); ap.add_argument("--source",default="webcam")\n    run(ap.parse_args().source)\n',
      'requirements.txt': 'mediapipe\nopencv-python\nnumpy\n',
    },
    'particles': {
      'README.md': '# CUDA Particle Simulation\nN-body gravity on GPU.\n\n## Build\n```bash\nnvcc -O3 src/particles.cu -o particles\n./particles --n 8192 --steps 500\n```\n',
      'src/particles.cu': '#include <stdio.h>\n#include <stdlib.h>\n#include <cuda_runtime.h>\nstruct P{float x,y,z,vx,vy,vz,m;};\n__global__ void integrate(P* p,int n,float dt,float soft){\n    int i=blockIdx.x*blockDim.x+threadIdx.x; if(i>=n) return;\n    float ax=0,ay=0,az=0;\n    for(int j=0;j<n;j++){if(i==j)continue;float dx=p[j].x-p[i].x,dy=p[j].y-p[i].y,dz=p[j].z-p[i].z;float inv=rsqrtf(dx*dx+dy*dy+dz*dz+soft*soft);float f=p[j].m*inv*inv*inv;ax+=dx*f;ay+=dy*f;az+=dz*f;}\n    p[i].vx+=ax*dt;p[i].vy+=ay*dt;p[i].vz+=az*dt;\n    p[i].x+=p[i].vx*dt;p[i].y+=p[i].vy*dt;p[i].z+=p[i].vz*dt;\n}\nint main(int argc,char** argv){\n    int N=4096,STEPS=100;\n    for(int i=1;i<argc;i++){if(!strcmp(argv[i],"--n")&&i+1<argc)N=atoi(argv[++i]);if(!strcmp(argv[i],"--steps")&&i+1<argc)STEPS=atoi(argv[++i]);}\n    printf("Particles:%d Steps:%d\\n",N,STEPS);\n    P* h=(P*)malloc(N*sizeof(P));\n    for(int i=0;i<N;i++) h[i]={(float)(rand()%1000-500),(float)(rand()%1000-500),(float)(rand()%1000-500),0,0,0,1.0f};\n    P* d; cudaMalloc(&d,N*sizeof(P)); cudaMemcpy(d,h,N*sizeof(P),cudaMemcpyHostToDevice);\n    cudaEvent_t s,e; cudaEventCreate(&s);cudaEventCreate(&e);cudaEventRecord(s);\n    for(int i=0;i<STEPS;i++) integrate<<<(N+255)/256,256>>>(d,N,0.01f,10.0f);\n    cudaDeviceSynchronize();cudaEventRecord(e);cudaEventSynchronize(e);\n    float ms=0; cudaEventElapsedTime(&ms,s,e);\n    printf("Done %.1fms (%.2fms/step) %.2fGFLOP/s\\n",ms,ms/STEPS,(double)N*N*20*STEPS/(ms*1e6));\n    cudaFree(d); free(h); return 0;\n}',
      '.gitignore': 'particles\n*.o\nbuild/',
    },
    'jetson-cam': {
      'README.md': '# Jetson Camera Pipeline\nGStreamer CSI/USB camera with AI overlay on Jetson.\n\n## Run\n```bash\npip install -r requirements.txt\npython src/jetson_camera.py --source usb\nbash scripts/deploy.sh 192.168.43.109\n```\n',
      'src/jetson_camera.py': '#!/usr/bin/env python3\nimport argparse, cv2, time\n\ndef csi_pipeline(w=1280,h=720,fps=30):\n    return (f"nvarguscamerasrc ! video/x-raw(memory:NVMM),width={w},height={h},format=NV12,framerate={fps}/1 ! nvvidconv ! video/x-raw,format=BGRx ! videoconvert ! appsink")\n\ndef usb_pipeline(dev=0,w=1280,h=720,fps=30):\n    return (f"v4l2src device=/dev/video{dev} ! video/x-raw,width={w},height={h},framerate={fps}/1 ! videoconvert ! video/x-raw,format=BGR ! appsink")\n\ndef run(source):\n    if source=="csi":   cap=cv2.VideoCapture(csi_pipeline(),cv2.CAP_GSTREAMER)\n    elif source=="usb": cap=cv2.VideoCapture(usb_pipeline(), cv2.CAP_GSTREAMER)\n    if source not in ("csi","usb") or not cap.isOpened():\n        print("[FALLBACK] Direct open"); cap=cv2.VideoCapture(0)\n    fc=0; t0=time.time(); fps_d=0.0\n    while cap.isOpened():\n        ret,frame=cap.read()\n        if not ret: time.sleep(0.05); continue\n        fc+=1\n        el=time.time()-t0\n        if el>0.5: fps_d=fc/el; fc=0; t0=time.time()\n        cv2.putText(frame,f"Jetson | FPS:{fps_d:.1f}",(10,30),cv2.FONT_HERSHEY_SIMPLEX,0.8,(0,255,0),2)\n        cv2.imshow("Jetson Camera",frame)\n        k=cv2.waitKey(1)&0xFF\n        if k==ord("q"): break\n        if k==ord("s"): fn=f"capture_{int(time.time())}.jpg"; cv2.imwrite(fn,frame); print(f"Saved {fn}")\n    cap.release(); cv2.destroyAllWindows()\n\nif __name__=="__main__":\n    ap=argparse.ArgumentParser(); ap.add_argument("--source",default="usb",choices=["csi","usb"])\n    run(ap.parse_args().source)\n',
      'scripts/deploy.sh': '#!/bin/bash\nIP="${1:-192.168.43.109}"; USER="${2:-orin_nano}"; DIR="/home/${USER}/jetson-cam"\nssh "${USER}@${IP}" "mkdir -p ${DIR}"\nscp -r src/ requirements.txt "${USER}@${IP}:${DIR}/"\necho "Done! ssh ${USER}@${IP} -- cd ${DIR} && python3 src/jetson_camera.py"\n',
      'requirements.txt': 'opencv-python\nnumpy\n',
      '.gitignore': 'capture_*.jpg\n__pycache__/',
    },
  };

  // Per-sample card metadata (icon SVG + subtitle + tips) for AI panel card
  const cardMeta: Record<string,{icon:string,sub:string,tips:string[]}> = {
    'hello':         { icon:`<svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='#76b900' stroke-width='2'><polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2'/></svg>`, sub:'CUDA C++ &bull; GPU Kernel', tips:['"Add shared memory"','"Benchmark with nvprof"','"Scale to 1M elements"'] },
    'tensorrt':      { icon:`<svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='#76b900' stroke-width='2'><circle cx='12' cy='12' r='10'/><path d='M8 12h8M12 8v8'/></svg>`, sub:'Python &bull; ONNX + TensorRT', tips:['"Export YOLOv8 to engine"','"Use FP16 precision"','"Add batch inference"'] },
    'multi-gpu':     { icon:`<svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='#76b900' stroke-width='2'><rect x='2' y='6' width='8' height='12' rx='1'/><rect x='14' y='6' width='8' height='12' rx='1'/><path d='M10 12h4'/></svg>`, sub:'CUDA C++ &bull; Multi-GPU', tips:['"Add NCCL collective ops"','"Profile with Nsight"','"Tune block size"'] },
    'object-detect': { icon:`<svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='#4fc3f7' stroke-width='2'><path d='M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2'/><rect x='8' y='8' width='8' height='8' rx='1'/></svg>`, sub:'Python &bull; YOLOv8 + TRT', tips:['"Run: --source webcam"','"Export to TRT for 3x speed"','"Filter: --classes 0 2"'] },
    'img-proc':      { icon:`<svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='#4fc3f7' stroke-width='2'><rect x='3' y='3' width='18' height='18' rx='2'/><circle cx='8.5' cy='8.5' r='1.5'/><path d='M21 15l-5-5L5 21'/></svg>`, sub:'CUDA C++ &bull; GPU Filters', tips:['"Add histogram equalization"','"Benchmark vs CPU"','"Process video stream"'] },
    'pose':          { icon:`<svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='#4fc3f7' stroke-width='2'><circle cx='12' cy='4' r='2'/><path d='M12 6v6l-3 4M12 12l3 4M9 10h6'/></svg>`, sub:'Python &bull; MediaPipe GPU', tips:['"Track multiple people"','"Add gesture recognition"','"Log keypoints to CSV"'] },
    'particles':     { icon:`<svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='#ffb74d' stroke-width='2'><circle cx='5' cy='12' r='1.5'/><circle cx='12' cy='5' r='1.5'/><circle cx='19' cy='12' r='1.5'/><circle cx='12' cy='19' r='1.5'/><circle cx='12' cy='12' r='2'/></svg>`, sub:'CUDA C++ &bull; N-body Physics', tips:['"Scale: --n 100000"','"Profile GFLOP/s"','"Add 3D visualization"'] },
    'jetson-cam':    { icon:`<svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='#ffb74d' stroke-width='2'><path d='M23 7l-7 5 7 5V7z'/><rect x='1' y='5' width='15' height='14' rx='2'/></svg>`, sub:'Python &bull; GStreamer + Jetson', tips:['"Use CSI: --source csi"','"Deploy: bash scripts/deploy.sh <IP>"','"Add TRT in process_frame()"'] },
  };

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const files = samples[type];
    if (!files) { alert('Unknown sample: ' + type); return; }

    await invoke('create_directory', { path: projectPath }).catch(() => {});
    for (const [rel, content] of Object.entries(files)) {
      const parts = rel.split('/');
      if (parts.length > 1) {
        await invoke('create_directory', { path: projectPath+'/'+parts.slice(0,-1).join('/') }).catch(()=>{});
      }
      await invoke('write_file', { path: projectPath+'/'+rel, content: content as string });
    }

    // Open project
    document.dispatchEvent(new CustomEvent('project-opened', { detail: { path: projectPath } }));

    // FIX: force file tree to render after project-opened (menuSystem validation sometimes rejects event)
    setTimeout(() => {
      if ((window as any).refreshFileTree) {
        (window as any).refreshFileTree();
      } else {
        const refreshBtn = document.querySelector(
          '.refresh-button, [title="Refresh"], [data-action="refresh"], #refresh-file-tree'
        ) as HTMLElement | null;
        if (refreshBtn) refreshBtn.click();
      }
      // Also fire the file-tree-refresh event as a fallback
      document.dispatchEvent(new CustomEvent('file-tree-refresh', { detail: { path: projectPath } }));
      document.dispatchEvent(new CustomEvent('refresh-file-tree', { detail: { path: projectPath } }));
    }, 500);

    // Show Android-game-style card in AI panel
    const addMsg = (window as any).addMessageToChat;
    if (addMsg) {
      const meta = cardMeta[type] || { icon:'', sub:'NVIDIA CUDA', tips:['"See README.md"'] };
      const tipsHtml = meta.tips.join(', ');
      const nvCard =
        '<div style="background:linear-gradient(135deg,#0d1a00,#122200);border:1px solid #76b900;border-radius:10px;padding:14px;margin:4px 0;max-width:520px;">'
        + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">'
        + meta.icon
        + '<div>'
        + '<div style="font-size:14px;font-weight:700;color:#e0e0e0;">' + name + ' Created!</div>'
        + '<div style="font-size:11px;color:#76b900;">' + meta.sub + '</div>'
        + '</div></div>'
        + '<div style="font-size:11px;color:#aaa;line-height:1.8;">'
        + '&#128194; <strong>' + name + '/</strong> &#8212; Ready to build<br>'
        + '&#128218; See <strong>README.md</strong> for build &amp; run steps<br>'
        + '&#128172; Tell me what to change: ' + tipsHtml
        + '</div></div>';
      addMsg('system', nvCard);
    }

    const notify = (window as any).showNotification;
    if (notify) notify('NVIDIA sample created: ' + name, 'success');
    else console.log('[NVIDIA] Created:', projectPath);

  } catch (err) {
    console.error('[NVIDIA]', err);
    alert('Error creating project: ' + err);
  }
}

