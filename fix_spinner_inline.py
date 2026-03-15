import re, sys

f = r"src\ide\aiAssistant\typingIndicator.ts"
with open(f, encoding='utf-8') as fh:
    c = fh.read()

c = re.sub(r'<div class="x02-spinner"></div>', '<div id="x02si"></div>', c)
c = re.sub(r'<div class="x02-spin-el"></div>', '<div id="x02si"></div>', c)
c = re.sub(r'<div id="x02-spin-el-inst"></div>', '<div id="x02si"></div>', c)

old = "chatContainer.appendChild(typingElement);"
new = (
    "const _sp = typingElement.querySelector('#x02si');\n"
    "  if (_sp) { (_sp as HTMLElement).style.cssText = "
    "'width:13px;height:13px;border-radius:50%;"
    "border:1.5px solid rgba(15,110,86,0.25);"
    "border-top:1.5px solid #1d9e75;"
    "flex-shrink:0;position:relative;z-index:1;"
    "animation:x02-s 0.75s linear infinite'; }\n"
    "  chatContainer.appendChild(typingElement);"
)

if old in c:
    c = c.replace(old, new, 1)
    print("Patched appendChild")
else:
    print("WARNING: appendChild not found, occurrences of chatContainer:", c.count("chatContainer"))

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(c)
print(f"Saved: {len(c.encode())} bytes")
