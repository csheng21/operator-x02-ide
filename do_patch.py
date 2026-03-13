import os, sys

# ── locate main.ts ──────────────────────────────────────────────────────────
main_path = None
for root, dirs, files in os.walk('src'):
    for f in files:
        if f == 'main.ts':
            p = os.path.join(root, f)
            if main_path is None or os.path.getsize(p) > os.path.getsize(main_path):
                main_path = p
print(f"main.ts: {main_path}  size={os.path.getsize(main_path)}")

content = open(main_path, encoding='utf-8').read()

if 'nvidia-hello' in content:
    print("Already patched."); sys.exit(0)

# ── PATCH 1: insert NVIDIA menu items after the manage <div> block ──────────
# Exact text from L1615
OLD_MENU = '        <div class="plugin-menu-item" data-action="manage" style="padding: 8px 16px; cursor: pointer; color: #ccc; font-size: 13px;">'

NEW_MENU = OLD_MENU + '''
        </div>
        <div style="border-top:1px solid #333;margin:4px 8px;"></div>
        <div style="padding:4px 16px;font-size:10px;color:#76b900;letter-spacing:1px;">NVIDIA SAMPLES</div>
        <div class="plugin-menu-item" data-action="nvidia-hello"         style="padding:6px 16px;cursor:pointer;color:#76b900;font-size:13px;">&#9889; CUDA Hello World</div>
        <div class="plugin-menu-item" data-action="nvidia-tensorrt"      style="padding:6px 16px;cursor:pointer;color:#76b900;font-size:13px;">&#129504; TensorRT Inference</div>
        <div class="plugin-menu-item" data-action="nvidia-multi-gpu"     style="padding:6px 16px;cursor:pointer;color:#76b900;font-size:13px;">&#128306; Multi-GPU Pipeline</div>
        <div class="plugin-menu-item" data-action="nvidia-object-detect" style="padding:6px 16px;cursor:pointer;color:#76b900;font-size:13px;">&#127922; Object Detection (YOLOv8)</div>
        <div class="plugin-menu-item" data-action="nvidia-img-proc"      style="padding:6px 16px;cursor:pointer;color:#76b900;font-size:13px;">&#128444; CUDA Image Processing</div>
        <div class="plugin-menu-item" data-action="nvidia-pose"          style="padding:6px 16px;cursor:pointer;color:#76b900;font-size:13px;">&#129464; Pose Estimation</div>
        <div class="plugin-menu-item" data-action="nvidia-particles"     style="padding:6px 16px;cursor:pointer;color:#76b900;font-size:13px;">&#10024; Particle Simulation</div>
        <div class="plugin-menu-item" data-action="nvidia-jetson-cam"    style="padding:6px 16px;cursor:pointer;color:#76b900;font-size:13px;">&#128247; Jetson Camera Pipeline'''

assert OLD_MENU in content, "PATCH1 ANCHOR NOT FOUND"
content = content.replace(OLD_MENU, NEW_MENU, 1)
print("PATCH 1 OK: menu items inserted")

# ── PATCH 2: add action handlers ────────────────────────────────────────────
OLD_H = "          if (action === 'new-game') createGameProject();"
NEW_H = """          if (action === 'new-game') createGameProject();
          else if (action === 'nvidia-hello')         createNvidiaSample('hello');
          else if (action === 'nvidia-tensorrt')      createNvidiaSample('tensorrt');
          else if (action === 'nvidia-multi-gpu')     createNvidiaSample('multi-gpu');
          else if (action === 'nvidia-object-detect') createNvidiaSample('object-detect');
          else if (action === 'nvidia-img-proc')      createNvidiaSample('img-proc');
          else if (action === 'nvidia-pose')          createNvidiaSample('pose');
          else if (action === 'nvidia-particles')     createNvidiaSample('particles');
          else if (action === 'nvidia-jetson-cam')    createNvidiaSample('jetson-cam');"""

assert OLD_H in content, "PATCH2 ANCHOR NOT FOUND"
content = content.replace(OLD_H, NEW_H, 1)
print("PATCH 2 OK: handlers added")

# ── PATCH 3: append createNvidiaSample function ──────────────────────────────
fn_block = open('nvidia_samples_fn.ts', encoding='utf-8').read()
content = content.rstrip() + '\n\n' + fn_block

open(main_path, 'w', encoding='utf-8').write(content)
print("PATCH 3 OK: function appended")
print("Saved:", main_path)

# verify
v = open(main_path, encoding='utf-8').read()
checks = ['nvidia-hello','nvidia-object-detect','nvidia-particles','nvidia-jetson-cam','createNvidiaSample']
for k in checks:
    ok = k in v
    print(f"  {k}: {'OK' if ok else 'MISSING'}")
