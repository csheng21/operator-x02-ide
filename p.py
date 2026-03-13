import shutil
f = r"src\jetson\jetsonDemoTab.ts"
c = open(f, encoding='utf-8').read()
if 'not connected' in c:
    print("already patched"); exit()
old = "qb('jt-mon-go')?.addEventListener('click', async () => {\n    try { await invoke('jetson_start_monitoring', { intervalMs: 1000 }); startPoll();\n      const b = q('jt-mon-badge'); if (b) { b.textContent = '\\u25CF STREAMING'; b.style.background = OK+'20'; b.style.color = OK; }\n      const s = qb('jt-mon-go'), e = qb('jt-mon-stop');\n      if (s) { s.disabled = true; s.style.opacity = '0.5'; } if (e) { e.disabled = false; e.style.opacity = '1'; }\n    } catch(e) { console.error('[Jetson]', e); }\n  });"
new = "qb('jt-mon-go')?.addEventListener('click', () => {\n    if (!conn) {\n      const b = q('jt-mon-badge');\n      if (b) { b.textContent = 'NOT CONNECTED'; b.style.background = ER+'20'; b.style.color = ER; }\n      console.warn('[Jetson] Start clicked but not connected'); return;\n    }\n    invoke('jetson_start_monitoring', { intervalMs: 1000 }).catch((e) => console.warn('[Jetson]', e));\n    startPoll();\n    const b = q('jt-mon-badge'); if (b) { b.textContent = '\\u25CF STREAMING'; b.style.background = OK+'20'; b.style.color = OK; }\n    const s = qb('jt-mon-go'), e = qb('jt-mon-stop');\n    if (s) { s.disabled = true; s.style.opacity = '0.5'; } if (e) { e.disabled = false; e.style.opacity = '1'; }\n  });"
if old in c:
    shutil.copy(f, f+'.bak')
    open(f,'w',encoding='utf-8').write(c.replace(old,new))
    print("PATCH OK")
else:
    print("NOT FOUND")
