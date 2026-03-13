import re, os

main_path = None
for root, dirs, files in os.walk('src'):
    for f in files:
        if f == 'main.ts':
            p = os.path.join(root, f)
            if main_path is None or os.path.getsize(p) > os.path.getsize(main_path):
                main_path = p

print(f"main.ts: {main_path}  size={os.path.getsize(main_path)}")

content = open(main_path, encoding='utf-8').read()
fn_block = open('nvidia_samples_fn.ts', encoding='utf-8').read()

# Remove any previously appended NVIDIA block
content = re.sub(r'\n\n// =+\n// NVIDIA SAMPLE PROJECT MODAL.*', '', content, flags=re.DOTALL)
content = re.sub(r'\n\nasync function createNvidiaSample\b.*', '', content, flags=re.DOTALL)
content = re.sub(r'\n\nfunction showNvidiaSampleModal\b.*', '', content, flags=re.DOTALL)

content = content.rstrip() + '\n\n' + fn_block
open(main_path, 'w', encoding='utf-8').write(content)

v = open(main_path, encoding='utf-8').read()
checks = [
    ('showNvidiaSampleModal fn',  'function showNvidiaSampleModal'),
    ('createNvidiaSample fn',     'async function createNvidiaSample'),
    ('AI card injection',         "addMsg('system'"),
    ('nvidia-samples handler',    "action === 'nvidia-samples'"),
    ('SVG icons',                 'viewBox'),
    ('cardMeta',                  'cardMeta'),
]
print("\nVERIFY:")
all_ok = True
for label, key in checks:
    ok = key in v
    print(f"  {'OK' if ok else 'MISSING'}: {label}")
    if not ok: all_ok = False
print("\n" + ("All good! Run: npm run tauri dev" if all_ok else "Some checks failed."))
