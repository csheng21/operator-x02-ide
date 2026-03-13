import os, sys, re

main_path = None
for root, dirs, files in os.walk('src'):
    for f in files:
        if f == 'main.ts':
            p = os.path.join(root, f)
            if main_path is None or os.path.getsize(p) > os.path.getsize(main_path):
                main_path = p
print(f"main.ts: {main_path}  size={os.path.getsize(main_path)}")

content = open(main_path, encoding='utf-8').read()

if 'showNvidiaSampleModal' in content:
    print("Already patched."); sys.exit(0)

# STEP 1: clean old nvidia items
for act in ['nvidia-hello','nvidia-tensorrt','nvidia-multi-gpu','nvidia-object-detect',
            'nvidia-img-proc','nvidia-pose','nvidia-particles','nvidia-jetson-cam']:
    content = re.sub(r'\s*<div[^>]+data-action=\"'+act+'\".*?</div>\s*', '', content, flags=re.DOTALL)
content = re.sub(r'\s*<div[^>]*>NVIDIA ?SAMPLES</div>\s*', '', content)
print("STEP 1 OK: cleaned old items")

# STEP 2: insert single NVIDIA item after manage
OLD_MANAGE = '        <div class="plugin-menu-item" data-action="manage" style="padding: 8px 16px; cursor: pointer; color: #ccc; font-size: 13px;">'
NVIDIA_ITEM = (
    '        <div class="plugin-menu-item" data-action="manage" style="padding: 8px 16px; cursor: pointer; color: #ccc; font-size: 13px;">\n'
    '        </div>\n'
    '        <div style="border-top:1px solid #333;margin:4px 8px;"></div>\n'
    '        <div class="plugin-menu-item" data-action="nvidia-samples" style="padding:8px 16px;cursor:pointer;color:#76b900;font-size:13px;">\n'
    '          &#9889; New NVIDIA Sample Project'
)
assert OLD_MANAGE in content, "ANCHOR: manage item NOT FOUND"
content = content.replace(OLD_MANAGE, NVIDIA_ITEM, 1)
print("STEP 2 OK: NVIDIA menu item inserted")

# STEP 3: handler
content = re.sub(r"else if \(action === 'nvidia-[a-z-]+'\)[^;]+;[\s]*", '', content)
OLD_H = "          if (action === 'new-game') createGameProject();"
NEW_H = "          if (action === 'new-game') createGameProject();\n          else if (action === 'nvidia-samples') showNvidiaSampleModal();"
if OLD_H in content:
    content = content.replace(OLD_H, NEW_H, 1)
    print("STEP 3 OK: handler wired")
else:
    content = re.sub(
        r"(if \(action === 'new-game'\) createGameProject\(\);)",
        r"\1\n          else if (action === 'nvidia-samples') showNvidiaSampleModal();",
        content, count=1)
    print("STEP 3 OK (fallback)")

open(main_path, 'w', encoding='utf-8').write(content)

# STEP 4: append functions
fn_block = open('nvidia_samples_fn.ts', encoding='utf-8').read()
content2 = open(main_path, encoding='utf-8').read()
content2 = re.sub(r'\n// =+\n// NVIDIA SAMPLE PROJECT.*', '', content2, flags=re.DOTALL)
content2 = content2.rstrip() + '\n\n' + fn_block
open(main_path, 'w', encoding='utf-8').write(content2)
print("STEP 4 OK: functions appended")

v = open(main_path, encoding='utf-8').read()
for label, key in [
    ('nvidia-samples item', 'data-action="nvidia-samples"'),
    ('handler', "action === 'nvidia-samples'"),
    ('showNvidiaSampleModal', 'function showNvidiaSampleModal'),
    ('createNvidiaSample', 'async function createNvidiaSample'),
    ('nv-grid', 'nv-grid'),
]:
    print(f"  {'OK' if key in v else 'MISSING'}: {label}")
print("Done! Run: npm run tauri dev")
