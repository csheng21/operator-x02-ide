import shutil
f=r"src/jetson/jetsonDemoTab.ts"
c=open(f,encoding="utf-8").read()
old="qb('jt-mon-go')?.addEventListener('click', () => {\n    // Fire-and-forget: jetson_start_monitoring spawns tegrastats in Rust background\n    // Awaiting it freezes the IDE — never await this call\n    invoke('jetson_start_monitoring', { intervalMs: 1000 }).catch(e => console.warn('[Jetson] start_monitoring:', e));\n    startPoll();"
new="qb('jt-mon-go')?.addEventListener('click', () => {\n    if (!conn) { const b=q('jt-mon-badge'); if(b){b.textContent='NOT CONNECTED';b.style.color='#f85149';} console.warn('[Jetson] not connected'); return; }\n    invoke('jetson_start_monitoring', { intervalMs: 1000 }).catch(e => console.warn('[Jetson] start_monitoring:', e));\n    startPoll();"
if old in c:
    shutil.copy(f,f+".bak")
    open(f,"w",encoding="utf-8").write(c.replace(old,new))
    print("PATCH OK")
else:
    print("NOT FOUND: "+repr(c[c.find("start_monitoring")-60:c.find("start_monitoring")+60]))
