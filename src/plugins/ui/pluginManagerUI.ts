// plugins/ui/pluginManagerUI.ts
// Plugin Manager UI - extracted from main.ts
// Contains: loadPluginFromFile, refreshPluginManagerContent,
//           togglePlugin, showPluginManager, plugin menu button
//
// Called from main.ts: setTimeout(() => initializePluginMenu({ showNvidiaSampleModal }), 2500)

import { createGameProject } from '../../ide/android';

interface PluginMenuDeps {
  showNvidiaSampleModal: () => void;
}

export function initializePluginMenu(deps: PluginMenuDeps): void {
  const { showNvidiaSampleModal } = deps;

  const menuBar = document.querySelector('.menu-bar');
  if (!menuBar) {
    console.error('[PluginMenu] Menu bar not found');
    return;
  }


    const loadPluginFromFile = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.js';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        try {
          const manager = (window as any).externalPluginManager;
          if (!manager) {
            alert('Plugin system not initialized!');
            return;
          }
          
          const reader = new FileReader();
          reader.onload = async (event) => {
            const pluginCode = event.target.result as string;
            const apis = (window as any).pluginAPIs;
            
            const pluginId = await manager.loadFromCode(pluginCode);
            const pluginModule = manager.loadedPlugins.get(pluginId);
            const manifest = pluginModule.manifest;
            
            const originalActivate = manager.loadedPlugins.get(pluginId).activate;
            manager.loadedPlugins.get(pluginId).activate = function(context: any) {
              Object.assign(context, apis);
              return originalActivate(context);
            };
            
            await manager.activatePlugin(pluginId);
            
            if ((window as any).showNotification) {
              (window as any).showNotification(`Plugin loaded: ${manifest.name}`, 'success');
            }
            
            const existingPanel = document.querySelector('[style*="position: fixed"][style*="50%"]');
            if (existingPanel && (window as any).refreshPluginManagerContent) {
              (window as any).refreshPluginManagerContent(existingPanel);
            }
          };
          
          reader.readAsText(file);
          
        } catch (error) {
          console.error('Failed to load plugin:', error);
          alert(`Failed to load plugin: ${error.message || 'Unknown error'}`);
        }
      };
      
      input.click();
    };

    const refreshPluginManagerContent = (panel: Element) => {
      const manager = (window as any).externalPluginManager;
      if (!manager) return;
      
      const plugins = manager.getLoadedPlugins();
      
      const updatedHTML = `
        <div style="font-family: 'Segoe UI', sans-serif; color: #d4d4d4;">
          <h3 style="margin: 0 0 15px 0;">Plugin Manager</h3>
          
          <button id="pm-load-btn" style="width: 100%; padding: 12px; background: #007acc; color: white; 
                  border: none; border-radius: 4px; cursor: pointer; margin-bottom: 15px; font-size: 14px; 
                  font-weight: 500; transition: background 0.2s;">Load New Plugin</button>
          
          <h4 style="color: #969696; font-size: 12px; margin: 15px 0 10px 0; text-transform: uppercase;">
            Installed Plugins (${plugins.length})
          </h4>
          
          ${plugins.length === 0 ? 
            '<p style="color: #666; text-align: center; padding: 20px;">No plugins installed</p>' :
            plugins.map((p: any) => `
              <div style="background: #2d2d30; padding: 14px; margin-bottom: 10px; border-radius: 6px; 
                          border-left: 3px solid ${p.active ? '#4CAF50' : '#666'}; transition: all 0.2s;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                      <strong style="color: #ffffff; font-size: 14px;">${p.name}</strong>
                      ${p.active ? 
                        '<svg width="16" height="16" viewBox="0 0 16 16" style="fill: #4CAF50;"><circle cx="8" cy="8" r="3"/></svg>' : 
                        '<svg width="16" height="16" viewBox="0 0 16 16" style="fill: #666;"><circle cx="8" cy="8" r="3"/></svg>'}
                    </div>
                    <div style="font-size: 11px; color: #666;">v${p.version} ? ${p.author}</div>
                    <div style="font-size: 12px; color: #969696; margin-top: 4px;">${p.description}</div>
                  </div>
                  <div style="margin-left: 10px;">
                    <label class="plugin-toggle" data-plugin-id="${p.id}" style="position: relative; display: inline-block; width: 48px; height: 24px; cursor: pointer;">
                      <input type="checkbox" ${p.active ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                      <span style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; 
                                   background: ${p.active ? '#4CAF50' : '#666'}; border-radius: 24px; transition: 0.3s;
                                   box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);">
                        <span style="position: absolute; content: ''; height: 18px; width: 18px; 
                                     left: ${p.active ? '27px' : '3px'}; bottom: 3px; background: white; 
                                     border-radius: 50%; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            `).join('')}
        </div>
      `;
      
      const contentDiv = panel.querySelector('div:last-child');
      if (contentDiv) {
        contentDiv.innerHTML = updatedHTML;
        
        const loadBtn = document.getElementById('pm-load-btn');
        if (loadBtn) {
          loadBtn.onclick = () => loadPluginFromFile();
          loadBtn.onmouseenter = () => (loadBtn as HTMLElement).style.background = '#005a9e';
          loadBtn.onmouseleave = () => (loadBtn as HTMLElement).style.background = '#007acc';
        }
        
        const toggleSwitches = panel.querySelectorAll('.plugin-toggle');
        toggleSwitches.forEach(toggle => {
          const pluginId = (toggle as HTMLElement).dataset.pluginId;
          if (pluginId) {
            toggle.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              togglePlugin(pluginId);
              setTimeout(() => refreshPluginManagerContent(panel), 200);
            });
          }
        });
      }
    };

    (window as any).refreshPluginManagerContent = refreshPluginManagerContent;

    const togglePlugin = (pluginId: string) => {
      const manager = (window as any).externalPluginManager;
      if (!manager) return;
      
      const plugins = manager.getLoadedPlugins();
      const plugin = plugins.find((p: any) => p.id === pluginId);
      if (!plugin) return;
      
      try {
        if (plugin.active) {
          manager.deactivatePlugin(pluginId);
          
          const menuBar = document.querySelector('.menu-bar');
          if (menuBar && pluginId.includes('code-analyzer-buttons')) {
            Array.from(menuBar.children).forEach((child: Element) => {
              const text = child.textContent?.trim();
              if (text === 'Analyze' || text === 'Stats' || text === 'History') {
                child.remove();
              }
            });
          }
          
          document.querySelectorAll(`[data-plugin="${pluginId}"]`).forEach(el => el.remove());
          
          if ((window as any).showNotification) {
            (window as any).showNotification(`Plugin deactivated: ${plugin.name}`, 'info');
          }
        } else {
          const apis = (window as any).pluginAPIs;
          const originalActivate = manager.loadedPlugins.get(pluginId).activate;
          manager.loadedPlugins.get(pluginId).activate = function(context: any) {
            context.createdElements = [];
            Object.assign(context, apis);
            return originalActivate(context);
          };
          
          manager.activatePlugin(pluginId);
          if ((window as any).showNotification) {
            (window as any).showNotification(`Plugin activated: ${plugin.name}`, 'success');
          }
        }
      } catch (error) {
        console.error('Error toggling plugin:', error);
      }
    };

    const showPluginManager = () => {
      const manager = (window as any).externalPluginManager;
      if (!manager) return;
      const plugins = manager.getLoadedPlugins();

      const renderPluginCard = (p: any) => `
        <div class="plg-card ${p.active ? 'plg-card-active' : ''}" data-plugin-id="${p.id}"
             style="background:${p.active ? 'rgba(0,120,212,0.08)' : 'rgba(30,30,32,0.8)'};
             border:1px solid ${p.active ? 'rgba(0,120,212,0.35)' : 'rgba(60,60,65,0.8)'};
             border-radius:8px; padding:14px 16px; margin-bottom:8px; transition:all 0.2s;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;
                 background:${p.active ? 'rgba(0,120,212,0.2)' : 'rgba(255,255,255,0.05)'};flex-shrink:0;">
              ${p.icon || '&#129513;'}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
                <span style="color:#fff;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</span>
                ${p.active ? '<span style="font-size:9px;padding:1px 6px;border-radius:3px;background:rgba(0,200,100,0.2);color:#4caf50;font-weight:600;letter-spacing:0.05em;">ACTIVE</span>' : ''}
              </div>
              <div style="font-size:11px;color:#666;">v${p.version || '1.0.0'} ? ${p.author || 'Unknown'}</div>
              ${p.description ? `<div style="font-size:11px;color:#888;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.description}</div>` : ''}
            </div>
            <label class="plugin-toggle" data-plugin-id="${p.id}"
                   style="position:relative;display:inline-block;width:44px;height:22px;cursor:pointer;flex-shrink:0;">
              <input type="checkbox" ${p.active ? 'checked' : ''} style="opacity:0;width:0;height:0;">
              <span style="position:absolute;top:0;left:0;right:0;bottom:0;
                           background:${p.active ? '#0078d4' : '#444'};border-radius:22px;transition:0.25s;
                           box-shadow:${p.active ? '0 0 8px rgba(0,120,212,0.4)' : 'none'};">
                <span style="position:absolute;height:16px;width:16px;left:${p.active ? '25px' : '3px'};top:3px;
                             background:white;border-radius:50%;transition:0.25s;
                             box-shadow:0 1px 4px rgba(0,0,0,0.4);"></span>
              </span>
            </label>
          </div>
        </div>
      `;

      const html = `
        <style>
          .plg-search { width:100%; padding:8px 12px; background:rgba(255,255,255,0.06);
            border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#fff;
            font-size:12px; outline:none; box-sizing:border-box; transition:border 0.2s; }
          .plg-search:focus { border-color:rgba(0,120,212,0.6); background:rgba(255,255,255,0.08); }
          .plg-search::placeholder { color:#555; }
          .plg-load-btn { width:100%; padding:10px; background:linear-gradient(135deg,#0078d4,#005a9e);
            color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:12.5px;
            font-weight:600; letter-spacing:0.03em; transition:all 0.2s;
            box-shadow:0 2px 8px rgba(0,120,212,0.3); display:flex; align-items:center; justify-content:center; gap:8px; }
          .plg-load-btn:hover { background:linear-gradient(135deg,#106ebe,#004c87); box-shadow:0 4px 14px rgba(0,120,212,0.45); transform:translateY(-1px); }
          .plg-load-btn:active { transform:translateY(0); }
          .plg-card { cursor:default; }
          .plg-card:hover { border-color:rgba(0,120,212,0.5) !important; background:rgba(0,120,212,0.06) !important; }
          .plg-tab { padding:6px 14px; font-size:11px; font-weight:600; letter-spacing:0.05em;
            text-transform:uppercase; cursor:pointer; border-radius:5px; transition:all 0.15s; color:#666; }
          .plg-tab.active { background:rgba(0,120,212,0.2); color:#4fc3f7; }
          .plg-tab:hover:not(.active) { color:#aaa; background:rgba(255,255,255,0.05); }
          #plg-empty { text-align:center; padding:32px 0; color:#555; font-size:12px; }
          #plg-empty .plg-empty-icon { font-size:32px; margin-bottom:10px; opacity:0.4; }
        </style>
        <div style="font-family:'Segoe UI',sans-serif;color:#d4d4d4;display:flex;flex-direction:column;gap:0;">

          <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
            <input class="plg-search" id="plg-search" placeholder="&#128269; Search plugins..." />
          </div>

          <div style="display:flex;gap:4px;margin-bottom:14px;">
            <div class="plg-tab active" data-tab="all">All (${plugins.length})</div>
            <div class="plg-tab" data-tab="active">Active (${plugins.filter((p:any)=>p.active).length})</div>
            <div class="plg-tab" data-tab="inactive">Inactive (${plugins.filter((p:any)=>!p.active).length})</div>
          </div>

          <div id="plg-list" style="max-height:320px;overflow-y:auto;padding-right:2px;">
            ${plugins.length === 0 ?
              `<div id="plg-empty"><div class="plg-empty-icon">&#129513;</div>No plugins installed yet</div>` :
              plugins.map((p: any) => renderPluginCard(p)).join('')
            }
          </div>

          <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);">
            <button class="plg-load-btn" id="pm-load-btn">&#128230; Load Plugin from File</button>
          </div>

          <div style="margin-top:10px;text-align:center;font-size:10px;color:#444;letter-spacing:0.04em;">
            ${plugins.length} plugin${plugins.length !== 1 ? 's' : ''} installed
          </div>
        </div>
      `;

      const uiApi = (window as any).pluginAPIs?.uiApi;
      if (uiApi) {
        uiApi.showPanel('Plugin Manager', html);
        setTimeout(() => {
          const panel = document.querySelector('[style*="position: fixed"][style*="50%"]');
          if (!panel) return;

          // Load button
          const loadBtn = document.getElementById('pm-load-btn');
          if (loadBtn) loadBtn.onclick = () => loadPluginFromFile();

          // Toggle switches
          panel.querySelectorAll('.plugin-toggle').forEach(toggle => {
            const pluginId = (toggle as HTMLElement).dataset.pluginId;
            if (pluginId) {
              toggle.addEventListener('click', (e) => {
                e.preventDefault();
                togglePlugin(pluginId);
                setTimeout(() => refreshPluginManagerContent(panel), 200);
              });
            }
          });

          // Search filter
          const searchEl = document.getElementById('plg-search') as HTMLInputElement;
          const listEl = document.getElementById('plg-list');
          let currentTab = 'all';
          const rerender = () => {
            if (!listEl) return;
            const q = searchEl?.value.toLowerCase() || '';
            const all = manager.getLoadedPlugins();
            const filtered = all.filter((p: any) => {
              const matchTab = currentTab === 'all' || (currentTab === 'active' ? p.active : !p.active);
              const matchQ = !q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
              return matchTab && matchQ;
            });
            listEl.innerHTML = filtered.length === 0
              ? `<div id="plg-empty"><div class="plg-empty-icon">&#128269;</div>No results for "${q}"</div>`
              : filtered.map((p: any) => renderPluginCard(p)).join('');
            listEl.querySelectorAll('.plugin-toggle').forEach(toggle => {
              const pid = (toggle as HTMLElement).dataset.pluginId;
              if (pid) toggle.addEventListener('click', (e) => {
                e.preventDefault(); togglePlugin(pid);
                setTimeout(rerender, 200);
              });
            });
          };
          if (searchEl) searchEl.oninput = rerender;

          // Tab filter
          panel.querySelectorAll('.plg-tab').forEach(tab => {
            tab.addEventListener('click', () => {
              panel.querySelectorAll('.plg-tab').forEach(t => t.classList.remove('active'));
              tab.classList.add('active');
              currentTab = (tab as HTMLElement).dataset.tab || 'all';
              rerender();
            });
          });
        }, 100);
      }
    };

    // -- Plugin Menu (Redesigned) -----------------------------------------
    if (!document.getElementById('x02-plugin-menu-styles')) {
      const pmStyle = document.createElement('style');
      pmStyle.id = 'x02-plugin-menu-styles';
      pmStyle.textContent = `
        @keyframes pmSlideIn {
          from { opacity: 0; transform: translateY(-8px) scaleY(0.92); }
          to   { opacity: 1; transform: translateY(0)   scaleY(1);    }
        }
        @keyframes pmItemIn {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes pmGlow {
          0%,100% { box-shadow: 0 0 6px rgba(0,170,255,0.15); }
          50%      { box-shadow: 0 0 14px rgba(0,170,255,0.35); }
        }
        @keyframes nvidiaGlow {
          0%,100% { text-shadow: 0 0 6px rgba(118,185,0,0.4); }
          50%      { text-shadow: 0 0 14px rgba(118,185,0,0.9); }
        }
        #x02-plugin-dropdown {
          animation: pmSlideIn 0.18s cubic-bezier(0.22,1,0.36,1) both;
          transform-origin: top left;
        }
        .pm-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 14px; cursor: pointer; color: #c8c8c8;
          font-size: 12.5px; border-radius: 5px; margin: 1px 5px;
          transition: background 0.15s, color 0.15s, transform 0.12s;
          position: relative; overflow: hidden; letter-spacing: 0.01em;
        }
        .pm-item::before {
          content: ''; position: absolute;
          left: 0; top: 0; bottom: 0; width: 2px;
          background: transparent; border-radius: 2px; transition: background 0.15s;
        }
        .pm-item:hover { background: rgba(0,120,212,0.18); color: #fff; transform: translateX(2px); }
        .pm-item:hover::before { background: #0078d4; }
        .pm-item:active { transform: translateX(2px) scale(0.98); background: rgba(0,120,212,0.28); }
        .pm-item .pm-icon {
          width: 22px; height: 22px; display: flex; align-items: center;
          justify-content: center; border-radius: 5px; font-size: 13px;
          flex-shrink: 0; transition: transform 0.15s;
        }
        .pm-item:hover .pm-icon { transform: scale(1.15); }
        .pm-item-nvidia { color: #76b900 !important; animation: nvidiaGlow 2.5s ease-in-out infinite; }
        .pm-item-nvidia:hover { background: rgba(118,185,0,0.14) !important; color: #9cd400 !important; }
        .pm-item-nvidia:hover::before { background: #76b900 !important; }
        .pm-section-label {
          padding: 8px 14px 4px; font-size: 10px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase; color: #555; user-select: none;
        }
        .pm-divider {
          height: 1px;
          background: linear-gradient(to right, transparent, #333 20%, #333 80%, transparent);
          margin: 4px 0;
        }
        .pm-badge {
          margin-left: auto; background: rgba(0,120,212,0.25); color: #4fc3f7;
          font-size: 9px; padding: 1px 5px; border-radius: 3px;
          font-weight: 600; letter-spacing: 0.05em; flex-shrink: 0;
        }
        .pm-badge-nvidia { background: rgba(118,185,0,0.2); color: #9cd400; }
        #x02-plugin-btn.active {
          color: #fff !important; background: rgba(0,120,212,0.2) !important;
          animation: pmGlow 2s ease-in-out infinite;
        }
        #x02-plugin-btn .pm-chevron {
          display: inline-block; font-size: 8px; margin-left: 3px;
          transition: transform 0.18s; opacity: 0.6;
        }
        #x02-plugin-btn.active .pm-chevron { transform: rotate(180deg); opacity: 1; }
      `;
      document.head.appendChild(pmStyle);
    }

    const pluginMenuBtn = document.createElement('div');
    pluginMenuBtn.id = 'x02-plugin-btn';
    pluginMenuBtn.className = 'menu-btn';
    pluginMenuBtn.innerHTML = 'Plugin<span class="pm-chevron">&#9660;</span>';
    pluginMenuBtn.style.cssText = `padding: 0 13px; height: 100%; display: flex; align-items: center;
      cursor: pointer; color: #cccccc; font-size: 13px; user-select: none;
      position: relative; transition: background 0.15s, color 0.15s; border-radius: 0;`;

    const viewMenu = document.querySelector('[data-menu="view"]');
    if (viewMenu && viewMenu.nextSibling) {
      menuBar.insertBefore(pluginMenuBtn, viewMenu.nextSibling);
    } else {
      menuBar.appendChild(pluginMenuBtn);
    }

    pluginMenuBtn.onmouseenter = () => {
      if (!pluginMenuBtn.classList.contains('active'))
        pluginMenuBtn.style.background = 'rgba(255,255,255,0.08)';
    };
    pluginMenuBtn.onmouseleave = () => {
      if (!pluginMenuBtn.classList.contains('active'))
        pluginMenuBtn.style.background = 'transparent';
    };

    let dropdownMenu: HTMLElement | null = null;

    const closePluginMenu = () => {
      if (!dropdownMenu) return;
      dropdownMenu.style.animation = 'none';
      dropdownMenu.style.opacity = '0';
      dropdownMenu.style.transform = 'translateY(-6px) scaleY(0.95)';
      dropdownMenu.style.transition = 'opacity 0.12s ease, transform 0.12s ease';
      setTimeout(() => { dropdownMenu?.remove(); dropdownMenu = null; }, 120);
      pluginMenuBtn.classList.remove('active');
      pluginMenuBtn.style.background = 'transparent';
    };

    pluginMenuBtn.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll('.menu-btn.active').forEach(btn => {
        if (btn !== pluginMenuBtn) btn.classList.remove('active');
      });
      if (pluginMenuBtn.classList.contains('active')) {
        closePluginMenu(); return;
      }
      pluginMenuBtn.classList.add('active');
      pluginMenuBtn.style.background = '';
      dropdownMenu = document.createElement('div');
      dropdownMenu.id = 'x02-plugin-dropdown';
      dropdownMenu.style.cssText = `
        position: absolute; top: calc(100% + 2px); left: 0;
        background: rgba(20,20,22,0.97);
        backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(80,80,88,0.7);
        border-top: 1px solid rgba(0,140,255,0.25);
        min-width: 240px; z-index: 10000; border-radius: 8px;
        overflow: hidden; padding: 6px 0 7px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06);
      `;
      const manager = (window as any).externalPluginManager;
      const loadedPlugins = manager ? manager.getLoadedPlugins() : [];
      const pluginCount = loadedPlugins.length;
      dropdownMenu.innerHTML = `
        <div class="pm-section-label">Projects</div>
        <div class="pm-item" data-action="new-game">
          <span class="pm-icon" style="background:rgba(0,170,100,0.15);">&#127918;</span>
          <span>New Game Project</span>
          <span class="pm-badge">Android</span>
        </div>
        <div class="pm-item pm-item-nvidia" data-action="nvidia-samples">
          <span class="pm-icon" style="background:rgba(118,185,0,0.12);">&#9889;</span>
          <span>New NVIDIA Sample</span>
          <span class="pm-badge pm-badge-nvidia">CUDA</span>
        </div>
        <div class="pm-divider"></div>
        <div class="pm-section-label">Extensions</div>
        <div class="pm-item" data-action="load">
          <span class="pm-icon" style="background:rgba(0,120,212,0.15);">&#128230;</span>
          <span>Load Plugin from File&#8230;</span>
        </div>
        <div class="pm-item" data-action="manage">
          <span class="pm-icon" style="background:rgba(150,100,255,0.15);">&#129513;</span>
          <span>Manage Plugins</span>
          ${pluginCount > 0 ? `<span class="pm-badge">${pluginCount} active</span>` : ''}
        </div>
      `;
      pluginMenuBtn.appendChild(dropdownMenu);
      dropdownMenu.querySelectorAll('.pm-item').forEach((item, i) => {
        (item as HTMLElement).style.animation = `pmItemIn 0.2s cubic-bezier(0.22,1,0.36,1) ${0.05 + i * 0.04}s both`;
      });
      dropdownMenu.querySelectorAll('.pm-item').forEach(item => {
        item.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const action = (item as HTMLElement).dataset.action;
          closePluginMenu();
          setTimeout(() => {
            if (action === 'new-game') createGameProject();
            else if (action === 'nvidia-samples') showNvidiaSampleModal();
            else if (action === 'load') loadPluginFromFile();
            else if (action === 'manage') showPluginManager();
          }, 80);
        });
      });
      setTimeout(() => {
        const outsideClick = (ev: MouseEvent) => {
          if (!pluginMenuBtn.contains(ev.target as Node)) {
            closePluginMenu();
            document.removeEventListener('click', outsideClick);
          }
        };
        document.addEventListener('click', outsideClick);
      }, 120);
    };

    console.log('Plugin menu initialized');
}

