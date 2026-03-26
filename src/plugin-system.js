/**
 * ============================================================================
 * Operator X02 - Plugin System Bootstrap
 * plugin-system.js (compiled, self-contained, no imports needed)
 *
 * HOW TO INSTALL - add ONE line to index.html <head>:
 *   <script src="./src/plugin-system.js"></script>
 *
 * That's it. No other changes needed anywhere.
 *
 * What it does automatically:
 *   [OK] Auto-loads all plugins from ~/OperatorX02/plugins/ on startup
 *   [OK] Patches "Load Plugin from File..." menu item
 *   [OK] Patches "Manage Plugins" menu item
 *   [OK] Shows toast notifications on load success/fail
 *   [OK] Supports drag & drop .x02plugin onto the window
 *   [OK] Exposes window.X02Plugins API for other scripts
 * ============================================================================
 */
(function () {
  'use strict';

  // -- Wait for Tauri to be ready before doing anything ----------------------
  function waitForTauri(cb, attempts = 0) {
    const tauri = window.__TAURI__?.core || window.__TAURI__;
    if (tauri && tauri.invoke) {
      cb(tauri.invoke.bind(tauri));
    } else if (attempts < 40) {
      setTimeout(() => waitForTauri(cb, attempts + 1), 250);
    } else {
      console.warn('[X02 Plugins] Tauri not available after 10s - aborting');
    }
  }

  // -- Detect menu items by scanning text content ----------------------------~~~
  // Works regardless of what id/class your menu items have



  // -- Menu item click handler + hide "Load Plugin from File..." ---------------
  function patchMenuItems(invoke) {
    if (!document.getElementById('x02-hide-style')) {
      var s = document.createElement('style');
      s.id = 'x02-hide-style';
      s.textContent = '[data-x02-hide]{display:none!important}';
      (document.head || document.documentElement).appendChild(s);
    }

    function quickText(el) {
      if (!el || !el.tagName) return '';
      if (el.childElementCount > 4) return '';
      return (el.innerText || '').trim().replace(/^[^a-zA-Z]+/, '').replace(/[^a-zA-Z0-9 .]+$/, '').trim();
    }

    function hideLoadItem() {
      // Only scan SPAN elements (pure text, no children) to avoid
      // accidentally matching container divs and hiding the whole dropdown
      var spans = document.querySelectorAll('span');
      for (var i = 0; i < spans.length; i++) {
        try {
          var sp = spans[i];
          if (sp.getAttribute('data-x02-hide')) continue;
          if (sp.childElementCount > 0) continue; // must be a leaf text node
          var rect = sp.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) continue;
          var t = (sp.innerText || '').trim();
          if (t.indexOf('Load Plugin from File') !== -1) {
            // Hide the SPAN
            sp.setAttribute('data-x02-hide', '1');
            // Hide its direct parent (the menu item row with icon)
            // but ONLY if parent has few children (is a row, not a container)
            var par = sp.parentElement;
            if (par && par !== document.body && par.childElementCount <= 3) {
              par.setAttribute('data-x02-hide', '1');
            }
          }
        } catch(e) {}
      }
    }

    document.addEventListener('click', function(e) {
      try {
        var el = e.target;
        for (var i = 0; i < 2 && el && el !== document.body; i++) {
          if (!el.tagName || el.childElementCount > 4) { el = el.parentElement; continue; }
          // ONLY act on visible elements - prevents matching hidden dropdown items
          var rect = el.getBoundingClientRect();
          var isVisible = rect.width > 0 && rect.height > 0;
          if (!isVisible) { el = el.parentElement; continue; }
          var txt = quickText(el);
          if (!txt) { el = el.parentElement; continue; }
          if (txt === 'Manage Plugins' || txt === 'Manage Plugins...') {
            e.stopImmediatePropagation();
            e.preventDefault();
            handleManagePlugins(invoke);
            return;
          }
          if (txt === 'Load Plugin from File' || txt === 'Load Plugin from File...') {
            e.stopImmediatePropagation();
            e.preventDefault();
            handleManagePlugins(invoke);
            return;
          }
          if (txt.startsWith('Plugin')) {
            setTimeout(hideLoadItem, 80);
            setTimeout(hideLoadItem, 200);
            setTimeout(hideLoadItem, 400);
          }
          el = el.parentElement;
        }
      } catch(err) {}
    }, true);
    console.log('[X02 Plugins] Menu delegation active (capture phase, exact match)');
  }

  // -- Toast ------------------------------------------------------------------
  function injectToastStyles() {
    if (document.getElementById('x02-ps-toast-css')) return;
    const s = document.createElement('style');
    s.id = 'x02-ps-toast-css';
    s.textContent = `
      #x02-toast-wrap {
        position:fixed; bottom:38px; right:20px; z-index:999999;
        display:flex; flex-direction:column; gap:8px; pointer-events:none;
      }
      .x02-t {
        display:flex; align-items:flex-start; gap:10px;
        background:#252526; border:1px solid #3c3c3c; border-radius:8px;
        padding:11px 14px; font-family:-apple-system,'Segoe UI',sans-serif;
        font-size:13px; color:#d4d4d4; min-width:280px; max-width:360px;
        box-shadow:0 8px 24px rgba(0,0,0,.5); pointer-events:all;
        animation:x02-tin .25s ease;
      }
      .x02-t.ok  { border-left:3px solid #4caf50; }
      .x02-t.err { border-left:3px solid #f44336; }
      .x02-t.inf { border-left:3px solid #f9a825; }
      .x02-t-ico { font-size:18px; flex-shrink:0; margin-top:1px; }
      .x02-t-ttl { font-weight:600; font-size:13px; color:#e0e0e0; margin-bottom:2px; }
      .x02-t-msg { font-size:12px; color:#999; line-height:1.4; }
      @keyframes x02-tin  { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:none} }
      @keyframes x02-tout { from{opacity:1;transform:none} to{opacity:0;transform:translateX(20px)} }
    `;
    document.head.appendChild(s);
  }

  function toast(type, title, msg, ms = 4500) {
    injectToastStyles();
    let wrap = document.getElementById('x02-toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'x02-toast-wrap';
      document.body.appendChild(wrap);
    }
    const icons = { ok: '[OK]', err: '[!!]', inf: '[i]' };
    const el = document.createElement('div');
    el.className = `x02-t ${type}`;
    el.innerHTML = `
      <span class="x02-t-ico">${icons[type] || '~~~~'}</span>
      <div>
        <div class="x02-t-ttl">${title}</div>
        <div class="x02-t-msg">${msg}</div>
      </div>`;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.animation = 'x02-tout .25s ease forwards';
      setTimeout(() => el.remove(), 260);
    }, ms);
  }

  // -- Loading Spinner Overlay ------------------------------------------------
  function showSpinner(label) {
    const ov = document.createElement('div');
    ov.id = 'x02-ps-spinner';
    ov.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99998;
      display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);
    `;
    ov.innerHTML = `
      <div style="background:#1e1e1e;border:1px solid #3c3c3c;border-radius:10px;
                  padding:24px 32px;text-align:center;color:#d4d4d4;min-width:220px;
                  font-family:-apple-system,'Segoe UI',sans-serif;
                  box-shadow:0 16px 40px rgba(0,0,0,.6);">
        <style>@keyframes x02spin{to{transform:rotate(360deg)}}</style>
        <div style="width:32px;height:32px;border:3px solid #333;border-top-color:#f9a825;
                    border-radius:50%;margin:0 auto 14px;animation:x02spin .7s linear infinite;"></div>
        <div style="font-weight:600;font-size:14px;margin-bottom:5px;">Loading Plugin</div>
        <div style="font-size:12px;color:#888;">${label}</div>
      </div>`;
    document.body.appendChild(ov);
    return () => ov.remove();
  }

  // -- Core: extract + execute plugin ----------------------------------------
  async function installPlugin(invoke, zipPath) {
    // Get plugins directory
    const pluginsDir = await invoke('get_plugins_path');

    // Extract using PowerShell Expand-Archive
    await invoke('execute_command', {
      command: `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${pluginsDir}' -Force"`,
      working_dir: pluginsDir,
      is_powershell: false
    });

    // Derive expected folder name from zip filename
    // e.g. "ai-bug-explainer.x02plugin" -> "ai-bug-explainer"
    var zipBasename = zipPath.split('\\').pop().split('/').pop();
    var expectedFolder = zipBasename.replace(/\.x02plugin$/i, '').replace(/\.zip$/i, '');

    // Try expected folder first (most reliable approach)
    if (expectedFolder) {
      var expectedPath = pluginsDir + '\\' + expectedFolder;
      var expectedManifest = expectedPath + '\\manifest.json';
      var expectedExists = await invoke('file_exists', { path: expectedManifest });
      if (expectedExists) {
        // Unload old instance if running so we get fresh execution
        if (window.X02Plugins && window.X02Plugins._registry.has(expectedFolder)) {
          var oldScript = document.getElementById('x02-plugin-' + expectedFolder);
          if (oldScript) oldScript.remove();
          window.X02Plugins._registry.delete(expectedFolder);
        }
        return await executePlugin(invoke, expectedPath);
      }
    }

    // Fallback: scan all folders for any manifest.json
    var folders2 = await invoke('read_directory_simple', { path: pluginsDir });
    for (var fi = 0; fi < folders2.length; fi++) {
      var folder2 = folders2[fi];
      var folderPath2 = pluginsDir + '\\' + folder2;
      var manifestPath2 = folderPath2 + '\\manifest.json';
      var exists2 = await invoke('file_exists', { path: manifestPath2 });
      if (!exists2) continue;
      // Unload if already running, then reload fresh
      if (window.X02Plugins && window.X02Plugins._registry.has(folder2)) {
        var oldScript2 = document.getElementById('x02-plugin-' + folder2);
        if (oldScript2) oldScript2.remove();
        window.X02Plugins._registry.delete(folder2);
      }
      return await executePlugin(invoke, folderPath2);
    }

    throw new Error('Could not find plugin folder after extraction');
  }

  async function executePlugin(invoke, folderPath) {
    // Read manifest
    const manifestRaw = await invoke('read_file_content', {
      path: `${folderPath}\\manifest.json`
    });
    const manifest = JSON.parse(manifestRaw);

    // Read entry JS
    const entryFile = manifest.entry || 'plugin.js';
    const code = await invoke('read_file_content', {
      path: `${folderPath}\\${entryFile}`
    });

    // Inject as <script> tag ~~~ runs immediately
    const old = document.getElementById(`x02-plugin-${manifest.id}`);
    if (old) old.remove();

    const script = document.createElement('script');
    script.id = `x02-plugin-${manifest.id}`;
    script.textContent = code;
    document.body.appendChild(script);

    // Register in our loaded map
    window.X02Plugins._registry.set(manifest.id, {
      manifest, folderPath, status: 'active', loadedAt: Date.now()
    });

    return manifest;
  }

  // -- Auto-load all plugins from plugins folder ------------------------------
  async function autoLoadAll(invoke) {
    let pluginsDir;
    try {
      pluginsDir = await invoke('get_plugins_path');
    } catch {
      return; // plugins path not available yet
    }

    let folders = [];
    try {
      folders = await invoke('read_directory_simple', { path: pluginsDir });
    } catch {
      return; // plugins folder empty or doesn't exist yet
    }

    let count = 0;
    for (const folder of folders) {
      const folderPath = `${pluginsDir}\\${folder}`;
      const manifestPath = `${folderPath}\\manifest.json`;

      try {
        const exists = await invoke('file_exists', { path: manifestPath });
        if (!exists) continue;
        if (window.X02Plugins.isLoaded(folder)) continue;

        await executePlugin(invoke, folderPath);
        count++;
      } catch (e) {
        console.warn(`[X02 Plugins] Failed to load "${folder}":`, e);
      }
    }

    if (count > 0) {
      console.log(`[X02 Plugins] Auto-loaded ${count} plugin(s)`);
    }
  }

  // -- "Load Plugin from File..." handler ------------------------------------
  async function handleLoadFromFile(invoke) {
    let filePath;
    try {
      filePath = await invoke('open_file_dialog_with_path', { default_path: null });
    } catch (e) {
      toast('err', 'File Picker Failed', String(e));
      return;
    }

    if (!filePath) return; // user cancelled

    if (!filePath.endsWith('.x02plugin') && !filePath.endsWith('.zip')) {
      toast('err', 'Wrong File Type', 'Please select a .x02plugin file');
      return;
    }

    const fileName = filePath.split('\\').pop().split('/').pop();
    const hide = showSpinner(fileName);

    try {
      const manifest = await installPlugin(invoke, filePath);
      hide();

      const shortcut = manifest.panel?.shortcut;
      const hint = shortcut ? `Shortcut: ${shortcut}` : manifest.description || '';
      toast('ok', `~~~~ ${manifest.name} v${manifest.version} Loaded!`, hint, 5000);

    } catch (e) {
      hide();
      toast('err', 'Plugin Load Failed', String(e));
      console.error('[X02 Plugins] Load error:', e);
    }
  }

  // -- handleLoadFromFile with pre-selected path ---------------------------
  async function handleLoadFromFile_withPath(invoke, filePath) {
    if (!filePath.endsWith('.x02plugin') && !filePath.endsWith('.zip')) {
      toast('err', 'Wrong File Type', 'Please select a .x02plugin file');
      return;
    }
    var fileName = filePath.split('\\').pop().split('/').pop();
    var hide = showSpinner(fileName);
    try {
      var manifest = await installPlugin(invoke, filePath);
      hide();
      var shortcut = manifest.panel && manifest.panel.shortcut ? manifest.panel.shortcut : '';
      var hint = shortcut || manifest.description || '';
      toast('ok', '~~~~ ' + manifest.name + ' v' + manifest.version + ' Loaded!', hint, 5000);
    } catch (e) {
      hide();
      toast('err', 'Plugin Load Failed', String(e));
    }
  }

  // -- "Manage Plugins" handler ----------------------------------------------~~~
  // Remove plugin from DOM + registry (shared by unload and uninstall)
  function evictPlugin(id) {
    var script = document.getElementById('x02-plugin-' + id);
    if (script) { script.remove(); }

    var entry = window.X02Plugins._registry.get(id);
    if (entry) {
      var panelId = entry.manifest && entry.manifest.panel && entry.manifest.panel.id;
      if (panelId) {
        var panelEl = document.getElementById(panelId);
        if (panelEl) { panelEl.remove(); }
      }
      // Also remove any dock tab the plugin may have injected
      var dockTab = document.getElementById(id + '-dock-tab');
      if (!dockTab) { dockTab = document.getElementById('bxp-dock-tab'); }
      if (dockTab && dockTab.dataset.pluginId === id) { dockTab.remove(); }

      // Remove plugin-specific styles
      var styleEl = document.getElementById(id + '-styles');
      if (styleEl) { styleEl.remove(); }
      var styleEl2 = document.getElementById('bxp-styles');
      if (styleEl2) { styleEl2.remove(); }
    }

    window.X02Plugins._registry.delete(id);
  }

  // Clear plugin localStorage keys
  function clearPluginStorage(id) {
    var prefixes = [id + '_', id + '-', 'x02_' + id];
    var knownKeys = [
      'x02_bug_explainer_v1', 'x02_bug_explainer_v2',
      'x02_bug_explainer_mode', id + '_state', id + '_settings'
    ];
    // Remove known keys
    knownKeys.forEach(function(k) { try { localStorage.removeItem(k); } catch(e) {} });
    // Scan for any key starting with plugin prefix
    try {
      var toRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key) { continue; }
        for (var j = 0; j < prefixes.length; j++) {
          if (key.indexOf(prefixes[j]) === 0) { toRemove.push(key); break; }
        }
      }
      toRemove.forEach(function(k) { localStorage.removeItem(k); });
    } catch(e) {}
  }

  function handleManagePlugins(invoke) {
    var existing = document.getElementById('x02-pm-overlay');
    if (existing) { existing.remove(); }

    var overlay = document.createElement('div');
    overlay.id = 'x02-pm-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:99997;'
      + 'display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);';

    // ---- build modal shell ----
    var modal = document.createElement('div');
    modal.style.cssText = 'background:#1e1e1e;border:1px solid #3c3c3c;border-radius:10px;'
      + 'width:640px;max-width:95vw;max-height:85vh;display:flex;flex-direction:column;'
      + 'font-family:-apple-system,"Segoe UI",sans-serif;font-size:13px;color:#d4d4d4;'
      + 'box-shadow:0 24px 60px rgba(0,0,0,.6);overflow:hidden;';

    // header
    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;'
      + 'padding:14px 18px;background:#252526;border-bottom:1px solid #333;flex-shrink:0;';
    hdr.innerHTML = '<h2 style="margin:0;font-size:14px;font-weight:600;">[+] Plugin Manager</h2>';
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '[X]';
    closeBtn.style.cssText = 'background:none;border:none;color:#888;font-size:13px;'
      + 'cursor:pointer;padding:3px 7px;border-radius:3px;';
    hdr.appendChild(closeBtn);

    // toolbar
    var toolbar = document.createElement('div');
    toolbar.style.cssText = 'display:flex;gap:8px;align-items:center;padding:10px 18px;'
      + 'background:#252526;border-bottom:1px solid #2d2d2d;flex-shrink:0;';
    toolbar.innerHTML = '<button id="x02-pm-install" style="'
      + 'background:linear-gradient(135deg,#f9a825,#f57f17);border:none;color:#1a1a1a;'
      + 'padding:6px 14px;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer;">'
      + '[+] Install Plugin...</button>'
      + '<button id="x02-pm-folder" style="background:#2d2d2d;border:1px solid #3c3c3c;'
      + 'color:#d4d4d4;padding:6px 12px;border-radius:4px;font-size:12px;cursor:pointer;">'
      + '[F] Open Folder</button>'
      + '<span id="x02-pm-count" style="margin-left:auto;font-size:11px;color:#666;"></span>';

    // list area
    var listArea = document.createElement('div');
    listArea.id = 'x02-pm-list';
    listArea.style.cssText = 'flex:1;overflow-y:auto;padding:14px 18px;';

    modal.appendChild(hdr);
    modal.appendChild(toolbar);
    modal.appendChild(listArea);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // ---- render plugin cards ----
    function renderPlugins() {
      listArea.innerHTML = '';
      var plugins = window.X02Plugins.getAll();
      var countEl = document.getElementById('x02-pm-count');
      if (countEl) {
        countEl.textContent = plugins.length + ' plugin' + (plugins.length !== 1 ? 's' : '') + ' installed';
      }

      if (plugins.length === 0) {
        listArea.innerHTML = '<div style="padding:40px;text-align:center;color:#555;font-size:12px;">'
          + '<div style="font-size:36px;margin-bottom:10px;opacity:.35">[~]</div>'
          + 'No plugins installed yet.<br>'
          + 'Use <strong>[+] Install Plugin...</strong> to add one.</div>';
        return;
      }

      plugins.forEach(function(p) {
        var card = document.createElement('div');
        card.dataset.pluginCard = p.manifest.id;
        var borderColor = p.status === 'active' ? 'rgba(76,175,80,.35)' : 'rgba(244,67,54,.35)';
        card.style.cssText = 'display:flex;align-items:flex-start;gap:12px;background:#252526;'
          + 'border:1px solid ' + borderColor + ';border-radius:8px;'
          + 'padding:12px 14px;margin-bottom:8px;transition:border-color 0.2s;';

        var icon   = p.manifest.icon || '[P]';
        var name   = p.manifest.name || p.manifest.id;
        var ver    = p.manifest.version || '?';
        var desc   = p.manifest.description || '';
        var author = p.manifest.author || 'unknown';
        var sc     = p.manifest.panel && p.manifest.panel.shortcut ? p.manifest.panel.shortcut : '';
        var status = p.status ? p.status.toUpperCase() : 'ACTIVE';
        var statusBg   = p.status === 'active' ? 'rgba(76,175,80,.2)' : 'rgba(244,67,54,.2)';
        var statusColor = p.status === 'active' ? '#a5d6a7' : '#ef9a9a';
        var folder = p.folderPath || '';

        card.innerHTML = '<div style="font-size:22px;flex-shrink:0;margin-top:2px;">' + icon + '</div>'
          + '<div style="flex:1;min-width:0;">'
          +   '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:3px;">'
          +     '<span style="font-weight:600;color:#e0e0e0;">' + name + '</span>'
          +     '<span style="font-size:10px;color:#888;background:#2a2a2a;padding:1px 5px;border-radius:3px;">v' + ver + '</span>'
          +     '<span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:10px;'
          +       'background:' + statusBg + ';color:' + statusColor + ';">' + status + '</span>'
          +   '</div>'
          +   '<div style="font-size:12px;color:#999;margin-bottom:4px;">' + desc + '</div>'
          +   '<div style="font-size:11px;color:#555;">'
          +     'by ' + author + (sc ? ' &nbsp;|&nbsp; ' + sc : '')
          +   '</div>'
          +   (folder ? '<div style="font-size:10px;color:#444;margin-top:3px;overflow:hidden;'
          +     'text-overflow:ellipsis;white-space:nowrap;" title="' + folder + '">' + folder + '</div>' : '')
          + '</div>'
          + '<div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;">'
          +   '<button class="pm-unload-btn" data-id="' + p.manifest.id + '" style="'
          +     'background:none;border:1px solid #3c3c3c;color:#888;'
          +     'font-size:11px;padding:4px 10px;border-radius:3px;cursor:pointer;white-space:nowrap;">'
          +     'Unload</button>'
          +   '<button class="pm-uninstall-btn" data-id="' + p.manifest.id
          +     '" data-folder="' + (folder || '') + '" style="'
          +     'background:none;border:1px solid rgba(244,67,54,.5);color:#ef9a9a;'
          +     'font-size:11px;padding:4px 10px;border-radius:3px;cursor:pointer;white-space:nowrap;">'
          +     'Uninstall</button>'
          + '</div>';

        listArea.appendChild(card);
      });

      // ---- Unload (remove from DOM/memory only, keep files) ----
      listArea.querySelectorAll('.pm-unload-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id = btn.dataset.id;
          evictPlugin(id);
          toast('inf', 'Plugin unloaded', id + ' removed from session (files kept)');
          renderPlugins();
        });
      });

      // ---- Uninstall (remove files + DOM + localStorage) ----
      listArea.querySelectorAll('.pm-uninstall-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id     = btn.dataset.id;
          var folder = btn.dataset.folder;
          var entry  = window.X02Plugins._registry.get(id);
          var pname  = entry && entry.manifest ? entry.manifest.name : id;

          // Show inline confirm inside the card
          var card = listArea.querySelector('[data-plugin-card="' + id + '"]');
          if (!card) { return; }

          // Replace card content with confirm UI
          var originalHTML = card.innerHTML;
          card.style.borderColor = 'rgba(244,67,54,.7)';
          card.innerHTML = '<div style="flex:1;padding:4px 0;">'
            + '<div style="font-weight:600;color:#ef9a9a;margin-bottom:6px;">'
            +   'Uninstall "' + pname + '"?'
            + '</div>'
            + '<div style="font-size:12px;color:#888;margin-bottom:10px;">'
            +   'This will delete the plugin folder and clear all its data.'
            + '</div>'
            + '<div style="display:flex;gap:8px;">'
            +   '<button id="pm-confirm-yes" style="background:#c62828;border:none;color:#fff;'
            +     'font-size:12px;font-weight:600;padding:6px 16px;border-radius:4px;cursor:pointer;">'
            +     'Yes, Uninstall</button>'
            +   '<button id="pm-confirm-no" style="background:#2d2d2d;border:1px solid #3c3c3c;'
            +     'color:#d4d4d4;font-size:12px;padding:6px 14px;border-radius:4px;cursor:pointer;">'
            +     'Cancel</button>'
            + '</div>'
            + '</div>';

          // Cancel
          card.querySelector('#pm-confirm-no').addEventListener('click', function() {
            card.style.borderColor = '';
            card.innerHTML = originalHTML;
            // Re-attach event listeners by re-rendering
            renderPlugins();
          });

          // Confirm uninstall
          card.querySelector('#pm-confirm-yes').addEventListener('click', function() {
            var yesBtn = card.querySelector('#pm-confirm-yes');
            yesBtn.textContent = 'Removing...';
            yesBtn.setAttribute('disabled', 'true');

            // Step 1: remove from DOM + memory
            evictPlugin(id);

            // Step 2: delete plugin folder via Tauri
            function finishUninstall(folderRemoved) {
              // Step 3: clear localStorage
              clearPluginStorage(id);

              var msg = folderRemoved
                ? pname + ' completely removed'
                : pname + ' unloaded (folder removal failed)';
              toast(folderRemoved ? 'ok' : 'inf', 'Plugin uninstalled', msg, 5000);
              renderPlugins();
            }

            if (folder) {
              invoke('delete_path', { path: folder })
                .then(function()  { finishUninstall(true);  })
                .catch(function() { finishUninstall(false); });
            } else {
              finishUninstall(false);
            }
          });
        });
      });
    }

    renderPlugins();

    // ---- close ----
    var doClose = function() { overlay.remove(); };
    closeBtn.addEventListener('click', doClose);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) { doClose(); } });
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') { doClose(); document.removeEventListener('keydown', onEsc); }
    });

    // ---- install ----
    document.getElementById('x02-pm-install').addEventListener('click', async function() {
      var btn = document.getElementById('x02-pm-install');
      if (btn) { btn.disabled = true; btn.textContent = 'Opening...'; }
      try {
        var fp = null;
        // Try multiple dialog command names
        var cmds = ['open_file_dialog_with_path', 'open_file_dialog', 'open_dialog'];
        for (var ci = 0; ci < cmds.length; ci++) {
          try {
            fp = await Promise.race([
              invoke(cmds[ci], { default_path: null, filters: [{ name: 'X02 Plugin', extensions: ['x02plugin', 'zip'] }] }),
              new Promise(function(_, rej) { setTimeout(function() { rej(new Error('timeout')); }, 30000); })
            ]);
            if (fp !== null) break;
          } catch(e) { if (e.message !== 'timeout') continue; break; }
        }
        if (btn) { btn.disabled = false; btn.textContent = '[+] Install Plugin...'; }
        if (!fp) return;
        doClose();
        await handleLoadFromFile_withPath(invoke, fp);
      } catch(e) {
        if (btn) { btn.disabled = false; btn.textContent = '[+] Install Plugin...'; }
        console.error('[X02] Install error:', e);
      }
    });

    // ---- open folder ----
    document.getElementById('x02-pm-folder').addEventListener('click', function() {
      invoke('get_plugins_path').then(function(path) {
        console.log('[X02] Opening folder:', path);
        // Try multiple commands for revealing in explorer
        invoke('reveal_in_explorer', { path: path }).catch(function() {
          invoke('open_in_explorer', { path: path }).catch(function() {
            invoke('execute_command', { command: 'explorer', args: [path] }).catch(function(e) {
              console.error('[X02] Open folder failed:', e);
              toast('err', 'Cannot Open Folder', String(e));
            });
          });
        });
      }).catch(function(e) {
        console.error('[X02] get_plugins_path failed:', e);
        toast('err', 'Cannot Get Plugins Path', String(e));
      });
    });
  }

  // -- Drag & Drop support ----------------------------------------------------
  function enableDragDrop(invoke) {
    document.addEventListener('dragover', e => {
      if ([...e.dataTransfer?.items || []].some(i => i.kind === 'file')) {
        e.preventDefault();
      }
    });

    document.addEventListener('drop', async e => {
      e.preventDefault();
      const files = [...(e.dataTransfer?.files || [])];
      const plugin = files.find(f => f.name.endsWith('.x02plugin') || f.name.endsWith('.zip'));
      if (!plugin) return;

      const hide = showSpinner(plugin.name);
      try {
        // Save to temp then install
        const pluginsDir = await invoke('get_plugins_path');
        const tmpPath = `${pluginsDir}\\..\\${plugin.name}`;

        // Write file bytes via Tauri
        const arr = new Uint8Array(await plugin.arrayBuffer());
        // Use base64 to avoid encoding issues
        let binary = '';
        arr.forEach(b => binary += String.fromCharCode(b));
        const b64 = btoa(binary);

        await invoke('execute_command', {
          command: `powershell -NoProfile -Command "
            $bytes = [Convert]::FromBase64String('${b64}');
            [IO.File]::WriteAllBytes('${tmpPath}', $bytes)
          "`,
          is_powershell: false
        });

        const manifest = await installPlugin(invoke, tmpPath);
        hide();
        toast('ok', `~~~~ ${manifest.name} Loaded!`,
          manifest.panel?.shortcut ? `Shortcut: ${manifest.panel.shortcut}` : '', 5000);
      } catch (err) {
        hide();
        toast('err', 'Drag & Drop Failed', String(err));
      }
    });
  }

  // -- Public API ------------------------------------------------------------~~~
  window.X02Plugins = {
    _registry: new Map(),
    isLoaded:  (id) => window.X02Plugins._registry.has(id),
    getAll:    ()   => [...window.X02Plugins._registry.values()],
    get:       (id) => window.X02Plugins._registry.get(id),
  };

  // -- Bootstrap: runs automatically when script loads ----------------------~~~
  waitForTauri(async (invoke) => {
    console.log('[X02 Plugins] System ready [OK]');

    // 1. Auto-load existing plugins
    await autoLoadAll(invoke);

    // 2. Patch Plugin menu items
    patchMenuItems(invoke);

    // 3. Enable drag & drop
    enableDragDrop(invoke);

    console.log('[X02 Plugins] Menu patched, drag-drop enabled');
  });

})();
