import re, shutil, sys
f = r"src\jetson\jetsonDemoTab.ts"
content = open(f, encoding='utf-8').read()
if 'not connected' in content:
    print("already patched"); sys.exit(0)
pattern = r"qb\('jt-mon-go'\)\?\.addEventListener\('click', async \(\) => \{.*?catch\(e\) \{ console\.error\('\[Jetson\]', e\); \}\s*\}\);"
repl = ("qb('jt-mon-go')?.addEventListener('click', () => {\n"
"    if (!conn) {\n"
"      const b = q('jt-mon-badge');\n"
"      if (b) { b.textContent = 'NOT CONNECTED'; b.style.background = ER+'20'; b.style.color = ER; }\n"
"      console.warn('[Jetson] Start clicked but not connected'); return;\n"
"    }\n"
"    invoke('jetson_start_monitoring', { intervalMs: 1000 }).catch((e) => console.warn('[Jetson]', e));\n"
"    startPoll();\n"
"    const b = q('jt-mon-badge'); if (b) { b.textContent = '\u25cf STREAMING'; b.style.background = OK+'20'; b.style.color = OK; }\n"
"    const s = qb('jt-mon-go'), e = qb('jt-mon-stop');\n"
"    if (s) { s.disabled = True; s.style.opacity = '0.5'; } if (e) { e.disabled = False; e.style.opacity = '1'; }\n"
"  });")
new, n = re.subn(pattern, lambda m: repl, content, flags=re.DOTALL)
if n:
    shutil.copy(f, f+'.bak')
    open(f,'w',encoding='utf-8').write(new)
    print("PATCH OK")
else:
    print("FAILED"); print(repr(content[content.find('jt-mon-go'):content.find('jt-mon-go')+300]))
