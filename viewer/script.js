/* Synchrotext Viewer � FIX: Use SPAN for badges to solve color conflict */
document.addEventListener("DOMContentLoaded", () => {
  // --- CONFIGURATION ---
  const IMAGE_PATH_PREFIX = "images/"; 
  
  // Ballad folders will be auto-discovered
  let BALLADS = [];
  // -------------------

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const audioEl   = $("#audio");
  const rowsHost  = $("#rows");
  const seek      = $("#seek");
  const timeDisplay = $("#timeDisplay");
  const lineLabel = $("#lineLabel");
  const playBtn   = $("#playPause");
  const vol       = $("#vol");
  const annoPanel = $("#annoPanel");
  const imagePanel = $("#imagePanel");

  let TR = [];
  let EN = [];
  let AN = [];
  let SYNC = {};

  let idTimes = [];
  const timeById = new Map();
  const idToRow  = new Map();
  const rows     = [];

  let currentId = null;
  let activeAnnoIndex = null;

  /* -------- Utility -------- */

  function secToClock(s) {
    if (!isFinite(s) || s < 0) s = 0;
    const m  = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return m + ":" + (ss < 10 ? "0" : "") + ss;
  }

  function centerRow(row) {
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* -------- Core Transport Logic -------- */

  function buildIdTimes(syncObj) {
    idTimes = Object.keys(syncObj || {})
      .map(k => [Number(k), Number(syncObj[k])])
      .filter(([i, t]) => Number.isFinite(i) && Number.isFinite(t))
      .sort((a, b) => a[1] - b[1]);
    timeById.clear();
    for (const [i, t] of idTimes) timeById.set(i, t);
  }

  function idForTime(t) {
    const epsilon = 0.001; // 1ms tolerance for floating point precision
    for (let i = idTimes.length - 1; i >= 0; i--) {
      if (t >= idTimes[i][1] - epsilon) return idTimes[i][0];
    }
    return idTimes[0] ? idTimes[0][0] : null;
  }

  function timeForId(id) {
    return timeById.get(id);
  }

  function setCurrent(newId, opts = {}) {
    if (newId === currentId) return;

    const oldRow = currentId != null ? idToRow.get(currentId) : null;
    if (oldRow) oldRow.classList.remove("active");

    const newRow = newId != null ? idToRow.get(newId) : null;
    if (newRow) {
      newRow.classList.add("active");
      if (opts.center) centerRow(newRow);
    }

    currentId = newId;

    const rowData = TR.find(item => item.id === newId);
    const lineNum = rowData ? rowData.line : "-";
    if (lineLabel) lineLabel.textContent = lineNum;
  }

  /* -------- Row Building -------- */

  function buildRows() {
    rowsHost.innerHTML = "";

    TR.forEach(tr => {
      const en = EN.find(e => e.id === tr.id) || { text: "" };
      const id = tr.id;
      const lineNum = String(tr.line);
      const kind = tr.kind;

      let trText = (tr.text || '').replace(/^[\s\t\u2003]+/, "");
      let enText = (en.text || '').replace(/^[\s\t\u2003]+/, "");

      const isSubline = lineNum.includes('.');
      if (isSubline && kind !== 'blank') {
        trText = "\u2003" + trText;
        enText = "\u2003" + enText;
      }

      const rowEl = document.createElement("div");
      rowEl.className = `row kind-${kind}`;
      rowEl.dataset.id = id;
      rowEl.dataset.line = lineNum;

      const gutterEl = document.createElement("div");
      gutterEl.className = "cell gutter";
      const num = parseFloat(lineNum);
      if (kind === 'poem' && !lineNum.includes('.') && num % 5 === 0 && num > 0) {
          gutterEl.textContent = lineNum;
      }
      rowEl.appendChild(gutterEl);

      const trEl = document.createElement("div");
      trEl.className = "cell haya";
      trEl.innerHTML = trText;
      rowEl.appendChild(trEl);

      const enEl = document.createElement("div");
      enEl.className = "cell eng";
      enEl.innerHTML = enText;
      rowEl.appendChild(enEl);

      const tagsEl = document.createElement("div");
      tagsEl.className = "cell tags";
      rowEl.appendChild(tagsEl);

      rowsHost.appendChild(rowEl);
      rows.push(rowEl);
      idToRow.set(id, rowEl);
    });
  }

  /* -------- Annotation Logic -------- */

  function buildAnnos() {
    AN.forEach((anno, index) => {
      const targetRow = idToRow.get(Number(anno.id_ref));
      if (!targetRow) return;

      // CHANGED: Create a SPAN instead of a BUTTON
      const badge = document.createElement("span");
      badge.className = `tag tag-${anno.type}`;
      badge.textContent = (anno.badge || anno.type).toUpperCase();
      
      badge.dataset.annoIndex = index;

      badge.addEventListener('click', (event) => {
        event.stopPropagation();
        handleBadgeClick(index);
      });

      const tagsContainer = targetRow.querySelector(".tags");
      if (tagsContainer) {
        tagsContainer.appendChild(badge);
      }
    });
  }

  function handleBadgeClick(annoIndex) {
    const annoData = AN[annoIndex];
    if (!annoData) return;

    // Pause audio when opening annotation
    if (audioEl && !audioEl.paused) {
      audioEl.pause();
    }

    if (activeAnnoIndex === annoIndex) {
        closeTextPanel();
        closeImagePanel();
        activeAnnoIndex = null;
        return;
    }
    
    closeTextPanel();
    closeImagePanel();
    activeAnnoIndex = annoIndex;
    
    if (annoData.type === 'image') {
      openImagePanel(annoData);
    } else {
      openTextPanel(annoData);
    }
  }
  
  function openImagePanel(annoData) {
    if (!imagePanel || !annoData) return;
    if (!audioEl.paused) audioEl.pause();

    imagePanel.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'image-modal-header';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'image-modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = closeImagePanel;
    header.appendChild(closeBtn);

    const img = document.createElement('img');
    img.src = `${IMAGE_PATH_PREFIX}${annoData.img}`;
    img.alt = annoData.caption || 'Annotation Image';

    imagePanel.appendChild(header);
    imagePanel.appendChild(img);

    if (annoData.caption) {
        const caption = document.createElement('p');
        caption.className = 'image-modal-caption';
        caption.textContent = annoData.caption;
        imagePanel.appendChild(caption);
    }

    imagePanel.style.display = 'block';
  }

  function closeImagePanel() {
    if (!imagePanel) return;
    imagePanel.style.display = 'none';
    imagePanel.innerHTML = '';
  }

  function openTextPanel(annoData) {
     if (!annoPanel || !annoData) return;
     if (!audioEl.paused) audioEl.pause();

     let noteContent = annoData.note || '';
     
     // Highlight search term if present
     if (annoData._searchQuery) {
       const regex = new RegExp(`(${annoData._searchQuery})`, 'gi');
       noteContent = noteContent.replace(regex, '<mark class="search-highlight">$1</mark>');
       // Clean up temporary property
       delete annoData._searchQuery;
     }
     
     const isRange = annoData.line_end;
     const lineLabelText = isRange ? "Lines" : "Line";
     const lineRef = isRange ? `${annoData.line}&ndash;${annoData.line_end}` : annoData.line;

     const firstLineHTML = `
        <div class="anno-first-line">
            <div class="anno-badge-line">
                <span class="tag tag-${annoData.type}">${(annoData.badge || annoData.type).toUpperCase()}</span>
                <span class="anno-id"> ${lineLabelText} ${lineRef}</span>
            </div>
            <span class="anno-close-instruction">Close: &times; or ESC</span>
            <button class="anno-close">&times;</button>
        </div>`;

     const contentHTML = `<div class="anno-text">${noteContent}</div>`;

     annoPanel.innerHTML = `<div class="anno-wrap">${firstLineHTML}${contentHTML}</div>`;
     annoPanel.querySelector('.anno-close').addEventListener('click', closeTextPanel);

     document.documentElement.style.setProperty("--panel-h", "120px");
  }

  function closeTextPanel() {
    if (!annoPanel) return;
    annoPanel.innerHTML = "";
    document.documentElement.style.setProperty("--panel-h", "0px");
    activeAnnoIndex = null;
    const activeRow = currentId != null ? idToRow.get(currentId) : null;
    if (activeRow) centerRow(activeRow);
  }

  /* -------- Event Handlers -------- */

  function hookRows() {
    rowsHost.addEventListener('click', (event) => {
      if (event.target.closest('.tag')) {
        return;
      }
      
      const clickedRow = event.target.closest('.row');
      if (clickedRow) {
        const id = Number(clickedRow.dataset.id);
        if (!id) return;

        const time = timeForId(id);
        if (time != null && audioEl) {
            audioEl.currentTime = time;
        }
      }
    });
  }

  function audioHandlers() {
    if (!audioEl) return;

    audioEl.addEventListener("timeupdate", () => {
      const t = audioEl.currentTime || 0;
      if (timeDisplay) timeDisplay.textContent = `${secToClock(t)} / ${secToClock(audioEl.duration || 0)}`;
      if (seek && !seek.matches(":active")) seek.value = t;
      const id = idForTime(t);
      if (id != null) setCurrent(id, { center: true });
    });
    
    audioEl.addEventListener("loadedmetadata", () => {
      const d = audioEl.duration || 0;
      if (seek) seek.max = d;
      if (timeDisplay) timeDisplay.textContent = `${secToClock(0)} / ${secToClock(d)}`;
    });

    if (playBtn) {
      playBtn.addEventListener("click", () => {
        if (audioEl.paused) audioEl.play();
        else audioEl.pause();
      });
      audioEl.addEventListener("play", () => playBtn.textContent = "\u275A\u275A");
      audioEl.addEventListener("pause", () => playBtn.textContent = "\u25B6");
    }

    if (vol) {
      vol.addEventListener("input", () => {
        audioEl.volume = Math.max(0, Math.min(1, Number(vol.value) || 0));
      });
    }

    if (seek) {
      seek.addEventListener("input", () => {
        audioEl.currentTime = Number(seek.value) || 0;
      });
    }
  }

  /* -------- Load data & boot -------- */

  Promise.all([
    fetch("transcription.json").then(r => r.json()),
    fetch("translation.json").then(r => r.json()),
    fetch("annotations.json").then(r => r.json()),
    fetch("sync.json").then(r => r.json())
  ]).then(([tr, en, an, sy]) => {
    TR = tr || [];
    EN = en || [];
    AN = an || [];
    SYNC = sy || {};

    buildIdTimes(SYNC);
    buildRows();
    buildAnnos();
    hookRows();
    audioHandlers();
    lineNavHandlers();
    keyboardHandlers();
    initMenu();

    if (audioEl.readyState >= 1) {
      const d = audioEl.duration || 0;
      if (seek) seek.max = d;
      if (timeDisplay) timeDisplay.textContent = `${secToClock(0)} / ${secToClock(d)}`;
    }
    
    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const timeParam = urlParams.get('t');
    const lineParam = urlParams.get('line');
    const plotParam = urlParams.get('plot');
    const multiTab = urlParams.get('multiTab');
    const resultType = urlParams.get('resultType');
    const searchQuery = urlParams.get('query');
    const annoIndex = urlParams.get('annoIndex');
    
    if (multiTab === 'true') {
      // We're in a new tab opened from search results
      // Show search panel with Compare checkbox
      showSearchPanelInMultiTabMode(searchQuery, resultType);
      
      // Handle the specific result type
      if (plotParam) {
        // First scroll poem to first line of the range
        const lineRange = plotParam.split('-');
        const firstLine = lineRange[0];
        const matchingRow = TR.find(item => String(item.line) === firstLine && item.kind === "poem");
        if (matchingRow) {
          const time = timeForId(matchingRow.id);
          if (time != null && audioEl) {
            audioEl.currentTime = time;
            const id = matchingRow.id;
            if (id != null) {
              setCurrent(id, { center: true });
            }
          }
        }
        // Then show plot summary (so it doesn't override the line position)
        setTimeout(() => {
          showPlotSummaryWithLines(plotParam, searchQuery, true, true); // Last param = multiTab
        }, 100);
      } else if (annoIndex !== null && (timeParam || lineParam)) {
        // Navigate by time or line
        if (timeParam) {
          const targetTime = parseFloat(timeParam);
          if (!isNaN(targetTime) && targetTime >= 0) {
            audioEl.currentTime = targetTime;
            const id = idForTime(targetTime);
            if (id != null) {
              setCurrent(id, { center: true });
              setTimeout(() => highlightSearchTermInRow(id, searchQuery), 100);
            }
          }
        } else if (lineParam) {
          const matchingRow = TR.find(item => String(item.line) === lineParam && item.kind === "poem");
          if (matchingRow) {
            const time = timeForId(matchingRow.id);
            if (time != null && audioEl) {
              audioEl.currentTime = time;
              setCurrent(matchingRow.id, { center: true });
              setTimeout(() => highlightSearchTermInRow(matchingRow.id, searchQuery), 100);
            }
          }
        }
        // Open annotation with highlighting
        const annoData = AN[parseInt(annoIndex)];
        if (annoData && searchQuery) {
          annoData._searchQuery = searchQuery;
        }
        handleBadgeClick(parseInt(annoIndex));
      } else if (timeParam || lineParam) {
        // Navigate by time or line
        if (timeParam) {
          const targetTime = parseFloat(timeParam);
          if (!isNaN(targetTime) && targetTime >= 0) {
            audioEl.currentTime = targetTime;
            const id = idForTime(targetTime);
            if (id != null) {
              setCurrent(id, { center: true });
              setTimeout(() => highlightSearchTermInRow(id, searchQuery), 100);
            }
          }
        } else if (lineParam) {
          const matchingRow = TR.find(item => String(item.line) === lineParam && item.kind === "poem");
          if (matchingRow) {
            const time = timeForId(matchingRow.id);
            if (time != null && audioEl) {
              audioEl.currentTime = time;
              setCurrent(matchingRow.id, { center: true });
              setTimeout(() => highlightSearchTermInRow(matchingRow.id, searchQuery), 100);
            }
          }
        }
        // For Haya results, move panel right
        if (resultType === 'transcription') {
          setTimeout(() => moveSearchPanelRight(), 100);
        }
      }
    } else if (plotParam) {
      // Open plot summary and scroll to the section with this line range
      showPlotSummaryWithLines(plotParam, null, false);
    } else if (timeParam && audioEl) {
      const targetTime = parseFloat(timeParam);
      if (!isNaN(targetTime) && targetTime >= 0) {
        audioEl.currentTime = targetTime;
        const id = idForTime(targetTime);
        if (id != null) {
          setCurrent(id, { center: true });
        }
      }
    } else if (idTimes.length) {
      setCurrent(idTimes[0][0], { center: true });
    }
    
    // Listen for messages from child tabs to restore launch point
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'restoreLaunchPoint') {
        const time = event.data.time;
        console.log('[Multi-tab] Received restore message, time:', time);
        console.log('[Multi-tab] idTimes length:', idTimes.length);
        console.log('[Multi-tab] First few idTimes:', idTimes.slice(0, 5));
        console.log('[Multi-tab] idTimes around target:', idTimes.filter(([id, t]) => Math.abs(t - time) < 5));
        if (time != null && audioEl) {
          audioEl.currentTime = time;
          const id = idForTime(time);
          console.log('[Multi-tab] Restoring to ID:', id, 'with time:', timeForId(id));
          if (id != null) {
            setCurrent(id, { center: true });
          }
        }
      }
    });
    
    console.log("[Synchrotext] Data loaded and application initialized successfully.");
  }).catch(err => {
    console.error("[Synchrotext] FATAL BOOT ERROR:", err);
  });

  /* -------- Line Navigation -------- */
  
  function lineNavHandlers() {
    const lineNav = document.getElementById('line-nav');
    const lineInput = document.getElementById('lineInput');
    
    if (!lineNav || !lineLabel || !lineInput) return;
    
    console.log("[lineNavHandlers] Setting up line navigation");
    
    // Click handler on the box itself
    const handleBoxClick = () => {
      console.log("[lineNavHandlers] Box clicked!");
      lineLabel.classList.add("hidden");
      lineInput.classList.remove("hidden");
      lineInput.value = lineLabel.textContent;
      lineInput.focus();
      lineInput.select();
      console.log("[lineNavHandlers] Input shown, value:", lineInput.value);
    };
    
    // Handle input submission
    const submitLineNav = () => {
      const targetLine = lineInput.value.trim();
      lineInput.classList.add("hidden");
      lineLabel.classList.remove("hidden");
      
      if (!targetLine) return;
      
      console.log("[lineNavHandlers] Searching for line:", targetLine);
      
      // Find the row with matching line number
      const matchingRow = TR.find(item => String(item.line) === targetLine && item.kind === "poem");
      
      if (matchingRow) {
        console.log("[lineNavHandlers] Found match:", matchingRow.id, "line:", matchingRow.line);
        const time = timeForId(matchingRow.id);
        console.log("[lineNavHandlers] Time for ID", matchingRow.id, ":", time);
        if (time != null && audioEl) {
          audioEl.currentTime = time;
        }
      } else {
        console.warn("[lineNavHandlers] No match for line:", targetLine);
        // Debug: show what lines are available around this number
        const nearby = TR.filter(item => item.kind === "poem" && Math.abs(parseInt(item.line) - parseInt(targetLine)) <= 2);
        console.log("[lineNavHandlers] Nearby lines:", nearby.map(r => `${r.line}(ID${r.id})`));
      }
    };
    
    const handleKeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitLineNav();
      } else if (e.key === "Escape") {
        lineInput.classList.add("hidden");
        lineLabel.classList.remove("hidden");
      }
    };
    
    lineNav.addEventListener('click', handleBoxClick);
    lineInput.addEventListener("keydown", handleKeydown);
    lineInput.addEventListener("blur", submitLineNav);
    
    console.log("[lineNavHandlers] Line navigation ready");
  }

  /* -------- Keyboard Controls -------- */
  
  function keyboardHandlers() {
    // Global keyboard handlers
    document.addEventListener("keydown", (e) => {
      // ESC closes annotation panel
      if (e.key === "Escape" && annoPanel && annoPanel.innerHTML) {
        closeTextPanel();
        return;
      }
      
      // Space toggles play/pause (prevent default scroll)
      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        if (!audioEl) return;
        
        if (audioEl.paused) {
          audioEl.play();
        } else {
          audioEl.pause();
        }
        return;
      }
      
      // Up arrow: previous line + auto-play
      if (e.key === "ArrowUp") {
        e.preventDefault();
        
        if (currentId === null) return;
        
        // Find current line in TR array
        const currentIndex = TR.findIndex(item => item.id === currentId);
        if (currentIndex <= 0) return; // Already at first line
        
        // Get previous poem line
        const prevEntry = TR[currentIndex - 1];
        if (!prevEntry) return;
        
        const time = timeForId(prevEntry.id);
        if (time != null && audioEl) {
          audioEl.currentTime = time;
          // Auto-play after jump
          if (audioEl.paused) {
            audioEl.play();
          }
        }
        return;
      }
    });
  }

  /* -------- Hamburger Menu -------- */
  
  function initMenu() {
    const menuBtn = document.getElementById('menuBtn');
    const menuPanel = document.getElementById('menuPanel');
    
    if (!menuBtn || !menuPanel) return;
    
    // Toggle menu on click
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menuPanel.classList.toggle('hidden');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!menuPanel.contains(e.target) && !menuBtn.contains(e.target)) {
        menuPanel.classList.add('hidden');
      }
    });
    
    // Handle menu item clicks
    const menuItems = menuPanel.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const action = item.dataset.action;
        menuPanel.classList.add('hidden');
        handleMenuAction(action);
      });
    });
  }
  

  function getPlotFilename() {
    // Derive plot filename from current folder path
    const pathParts = window.location.pathname.split('/');
    const folderName = decodeURIComponent(pathParts[pathParts.length - 2]);
    const shortName = folderName.includes(' - ') ? folderName.split(' - ')[1] : folderName;
    return shortName.toLowerCase().replace(/\s+/g, '_') + '_plot.json';
  }

  function handleMenuAction(action) {
    console.log('[Menu] Action:', action);
    
    switch(action) {
      case 'controls':
        showControlsPanel();
        break;
      case 'plot':
        showPlotSummary();
        break;
      case 'verse':
        showPoeticForms();
        break;
      case 'pdf':
        // Derive PDF name from current folder path
        {
          const pathParts = window.location.pathname.split('/');
          const folderName = decodeURIComponent(pathParts[pathParts.length - 2]);
          const shortName = folderName.includes(' - ') ? folderName.split(' - ')[1] : folderName;
          const pdfName = shortName.replace(/\s+/g, '_') + '_full_text.pdf';
          console.log('[PDF] Opening:', pdfName);
          fetch(pdfName)
            .then(r => {
              if (r.ok) {
                window.open(pdfName, '_blank');
              } else {
                const pdfNameLower = pdfName.toLowerCase();
                return fetch(pdfNameLower).then(r2 => {
                  if (r2.ok) {
                    window.open(pdfNameLower, '_blank');
                  } else {
                    alert('PDF not found. Expected: ' + pdfName);
                  }
                });
              }
            })
            .catch(() => alert('PDF not found. Expected: ' + pdfName));
        }
        break;
      case 'search':
        showSearchPanel();
        break;
    }
  }
  
  function showPlotSummary() {
    showPlotSummaryWithLines(null, null, false);
  }
  
  function showPlotSummaryWithLines(targetLines, searchQuery, isFromSearch, isMultiTab) {
    if (isFromSearch) {
      // Transform search panel to show plot summary
      const searchPanel = isMultiTab ? 
        document.querySelector('.search-in-multitab .search-panel') :
        document.querySelector('.search-panel');
      
      if (!searchPanel) return;
      
      // Store original search results for back navigation
      const resultsDiv = searchPanel.querySelector('#searchResults');
      if (resultsDiv) {
        searchPanel.dataset.savedResults = resultsDiv.innerHTML;
        searchPanel.dataset.savedQuery = resultsDiv.dataset.query || '';
      }
      
      // Load plot data
      fetch(getPlotFilename())
        .then(r => r.json())
        .then(plotData => {
          let scrollToSection = 0;
          
          if (targetLines) {
            plotData.sections.forEach((section, index) => {
              if (section.lines === targetLines) {
                scrollToSection = index;
              }
            });
          }
          
          // Helper function to highlight search term
          const highlightText = (text, query) => {
            if (!query) return text;
            const regex = new RegExp(`(${query})`, 'gi');
            return text.replace(regex, '<mark class="search-highlight">$1</mark>');
          };
          
          let sectionsHTML = plotData.sections.map((section, index) => {
            const highlightedText = searchQuery ? highlightText(section.text, searchQuery) : section.text;
            return `<section id="plot-section-${index}" class="plot-section">
              <div class="plot-lines">Lines ${section.lines}</div>
              <div class="plot-text">${highlightedText}</div>
            </section>`;
          }).join('');
          
          // Replace search content with plot summary
          const header = searchPanel.querySelector('.content-header');
          
          if (isMultiTab) {
            // Multi-tab mode: show Back & Close button
            header.innerHTML = `
              <button class="back-to-launch" aria-label="Back and close tab">&larr; Back &amp; Close Tab</button>
              <h2>Plot Summary</h2>
              <button class="close-panel-btn" aria-label="Close">&times;</button>
            `;
          } else {
            // Single tab mode: show Back to search + title
            header.innerHTML = `
              <button class="back-to-search" aria-label="Back to search results">&larr; Back</button>
              <h2>Plot Summary</h2>
              <button class="close-panel-btn" aria-label="Close">&times;</button>
            `;
          }
          
          const body = searchPanel.querySelector('.content-body');
          body.innerHTML = `<div class="plot-body">${sectionsHTML}</div>`;
          
          // Scroll to target section
          setTimeout(() => {
            const targetSection = body.querySelector(`#plot-section-${scrollToSection}`);
            if (targetSection) {
              targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
          
          // Add back button handler
          if (isMultiTab) {
            const backBtn = header.querySelector('.back-to-launch');
            const urlParams = new URLSearchParams(window.location.search);
            const launchTime = urlParams.get('launchTime');
            
            backBtn.addEventListener('click', () => {
              // Send message to opener to restore launch point
              if (window.opener && !window.opener.closed && launchTime) {
                window.opener.postMessage({
                  type: 'restoreLaunchPoint',
                  time: parseFloat(launchTime)
                }, '*');
              }
              
              // Focus opener and close this tab
              if (window.opener && !window.opener.closed) {
                window.opener.focus();
              }
              window.close();
            });
            
            const closeBtn = header.querySelector('.close-panel-btn');
            closeBtn.addEventListener('click', () => window.close());
          } else {
            const backBtn = header.querySelector('.back-to-search');
            backBtn.addEventListener('click', () => restoreSearchResults(searchPanel));
          }
        })
        .catch(err => {
          console.error('[Plot] Failed to load:', err);
          alert('Plot summary not available');
        });
      
    } else {
      // Open as separate panel (from hamburger menu)
      // Load plot data
      fetch(getPlotFilename())
        .then(r => r.json())
        .then(plotData => {
          let scrollToSection = 0;
          
          if (targetLines) {
            plotData.sections.forEach((section, index) => {
              if (section.lines === targetLines) {
                scrollToSection = index;
              }
            });
          } else {
            const currentLine = currentId ? (TR.find(e => e.id === currentId)?.line || '1') : '1';
            const currentLineNum = parseInt(String(currentLine).split('.')[0]);
            
            plotData.sections.forEach((section, index) => {
              const range = section.lines.split('-');
              const start = parseInt(range[0]);
              const end = parseInt(range[range.length - 1]);
              if (currentLineNum >= start && currentLineNum <= end) {
                scrollToSection = index;
              }
            });
          }
          
          const panel = document.createElement('div');
          panel.className = 'content-panel floating';
          
          let sectionsHTML = plotData.sections.map((section, index) => 
            `<section id="plot-section-${index}" class="plot-section">
              <div class="plot-lines">Lines ${section.lines}</div>
              <div class="plot-text">${section.text}</div>
            </section>`
          ).join('');
          
          panel.innerHTML = `
            <div class="content-inner plot-summary draggable">
              <div class="content-header drag-handle">
                <h2>Plot Summary</h2>
                <button class="close-panel-btn" aria-label="Close">&times;</button>
              </div>
              <div class="content-body plot-body">
                ${sectionsHTML}
              </div>
            </div>
          `;
          
          document.body.appendChild(panel);
          
          const inner = panel.querySelector('.content-inner');
          makeDraggable(inner);
          
          setTimeout(() => {
            const targetSection = panel.querySelector(`#plot-section-${scrollToSection}`);
            if (targetSection) {
              targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
          
          const closeBtn = panel.querySelector('.close-panel-btn');
          closeBtn.addEventListener('click', () => panel.remove());
          
          const escHandler = (e) => {
            if (e.key === 'Escape') {
              panel.remove();
              document.removeEventListener('keydown', escHandler);
            }
          };
          document.addEventListener('keydown', escHandler);
          
          panel.addEventListener('click', (e) => {
            if (e.target === panel) panel.remove();
          });
        })
        .catch(err => {
          console.error('[Plot] Failed to load:', err);
          alert('Plot summary not available');
        });
    }
  }
  
  function restoreSearchResults(searchPanel) {
    const savedResults = searchPanel.dataset.savedResults;
    const savedQuery = searchPanel.dataset.savedQuery;
    
    if (!savedResults) return;
    
    // Clear any search highlights
    clearSearchHighlights();
    
    // Move panel back to left if it was moved
    moveSearchPanelLeft();
    
    // Restore header
    const header = searchPanel.querySelector('.content-header');
    header.innerHTML = `
      <h2>Search</h2>
      <button class="close-panel-btn" aria-label="Close">&times;</button>
    `;
    
    // Restore body
    const body = searchPanel.querySelector('.content-body');
    body.innerHTML = `
      <div class="search-controls">
        <input type="text" id="searchInput" placeholder="Enter search term..." class="search-input" value="${savedQuery}">
        <div class="search-options">
          <div class="search-option-group">
            <label class="search-option-label">Scope:</label>
            <label>
              <input type="radio" name="searchScope" value="current" checked>
              Current file
            </label>
            <label>
              <input type="radio" name="searchScope" value="all">
              All files
            </label>
          </div>
          <div class="search-option-group">
            <label class="search-option-label">Display:</label>
            <label>
              <input type="radio" name="tabMode" value="single" checked>
              Show in this tab
            </label>
            <label>
              <input type="radio" name="tabMode" value="multiple">
              Show in separate tabs
            </label>
          </div>
        </div>
        <button id="searchBtn" class="search-btn">Search</button>
      </div>
      <div id="searchResults" class="search-results">${savedResults}</div>
    `;
    
    // Re-attach handlers
    const resultsDiv = body.querySelector('#searchResults');
    const query = savedQuery;
    const results = JSON.parse(resultsDiv.dataset.results || '[]');
    
    resultsDiv.querySelectorAll('.search-result[data-index]').forEach(resultEl => {
      resultEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('result-open-tab')) return;
        const index = parseInt(resultEl.dataset.index);
        const result = results[index];
        handleSearchResultClick(result, query);
      });
    });
    
    resultsDiv.querySelectorAll('.result-open-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        const result = results[index];
        openResultInNewTab(result);
      });
    });
    
    // Re-attach close handler
    const closeBtn = header.querySelector('.close-panel-btn');
    closeBtn.addEventListener('click', () => {
      const panel = searchPanel.closest('.content-panel');
      if (panel) panel.remove();
    });
    
    // Return to original position
    if (idTimes.length) {
      setCurrent(idTimes[0][0], { center: true });
    }
  }
  
  function showPoeticForms() {
    // Load poetic forms data from shared viewer directory
    fetch('../viewer/poetic_forms.json')
      .then(r => r.json())
      .then(formsData => {
        const panel = document.createElement('div');
        panel.className = 'content-panel floating';
        
        let sectionsHTML = formsData.sections.map((section, index) => {
          const titleClass = section.title.match(/^[\d]/) ? 'verse-subsection' : 'verse-section-title';

          function escHtml(str) {
            if (!str) return '';
            return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
          }

          function renderInline(str) {
            return escHtml(str)
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.+?)\*/g, '<em>$1</em>');
          }

          function renderItem(item) {
            if (typeof item === 'string') {
              return `<div class="verse-text">${renderInline(item)}</div>`;
            }
            if (item.verse !== undefined) {
              return `<pre class="verse-example-block">${renderInline(item.verse)}</pre>`;
            }
            if (item.divider) {
              return `<hr class="verse-divider">`;
            }
            if (item.outline_l1 !== undefined) {
              return `<div class="verse-text outline-l1">${renderInline(item.outline_l1)}</div>`;
            }
            if (item.outline_l2 !== undefined) {
              return `<div class="verse-text outline-l2">${renderInline(item.outline_l2)}</div>`;
            }
            if (item.outline_l3 !== undefined) {
              return `<div class="verse-text outline-l3">${renderInline(item.outline_l3)}</div>`;
            }
            if (item.psalm_text) {
              const rows = item.psalm_text.map(row => {
                const label = `<td class="psalm-verse-label">${escHtml(row.verse_label)}</td>`;
                return `<tr>${label}<td class="psalm-line-text">${escHtml(row.text)}</td><td class="psalm-line-num">${row.line}</td></tr>`;
              }).join('');
              return `<table class="psalm-text-table"><tbody>${rows}</tbody></table>`;
            }
            if (item.schematic_table) {
              const t = item.schematic_table;
              const header = `<tr>
                <th class="sch-verse"></th>
                <th class="sch-line">line</th>
                <th class="sch-inner">inner</th>
                <th class="sch-comp">compound</th>
                <th class="sch-overall">overall</th>
              </tr>`;
              const rows = t.rows.map(r => `<tr>
                <td class="sch-verse">${escHtml(r.verse)}</td>
                <td class="sch-line">${escHtml(r.line)}</td>
                <td class="sch-inner">${escHtml(r.inner)}</td>
                <td class="sch-comp">${escHtml(r.compound)}</td>
                <td class="sch-overall">${r.overall ? `<em>${escHtml(r.overall)}</em>` : ''}</td>
              </tr>`).join('');
              return `<table class="schematic-table"><thead>${header}</thead><tbody>${rows}</tbody></table>`;
            }
            return '';
          }

          return `<section id="verse-section-${index}" class="verse-section">
            ${section.title ? `<div class="${titleClass}">${renderInline(section.title)}</div>` : ''}
            ${section.content.map(renderItem).join('')}
          </section>`;
        }).join('');
        
        panel.innerHTML = `
          <div class="content-inner verse-forms draggable">
            <div class="content-header drag-handle">
              <h2>Poetic Verse Forms</h2>
              <div class="header-buttons">
                <button class="open-tab-btn" aria-label="Open in new tab">&#x29C9;</button>
                <button class="close-panel-btn" aria-label="Close">&times;</button>
              </div>
            </div>
            <div class="content-body verse-body">
              ${sectionsHTML}
            </div>
          </div>
        `;
        
        document.body.appendChild(panel);
        
        const inner = panel.querySelector('.content-inner');
        makeDraggable(inner);
        
        // Open in new tab handler
        const openTabBtn = panel.querySelector('.open-tab-btn');
        openTabBtn.addEventListener('click', () => {
          openPoeticFormsInTab(formsData);
        });
        
        // Close handlers
        const closeBtn = panel.querySelector('.close-panel-btn');
        closeBtn.addEventListener('click', () => panel.remove());
        
        const escHandler = (e) => {
          if (e.key === 'Escape') {
            panel.remove();
            document.removeEventListener('keydown', escHandler);
          }
        };
        document.addEventListener('keydown', escHandler);
        
        panel.addEventListener('click', (e) => {
          if (e.target === panel) panel.remove();
        });
      })
      .catch(err => {
        console.error('[Verse Forms] Failed to load:', err);
        alert('Poetic verse forms not available');
      });
  }
  
  function openPoeticFormsInTab(formsData) {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${formsData.title}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #333;
    }
    h1 {
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }
    .section-title {
      color: #0066cc;
      font-size: 1.2em;
      font-weight: 600;
      margin: 1.5em 0 0.5em 0;
    }
    .subsection-title {
      font-weight: 500;
      margin: 1em 0 0.5em 0;
    }
    .content {
      margin-bottom: 1em;
    }
    i, em { font-style: italic; }
    strong { font-weight: bold; }
    pre.verse-block {
      font-family: inherit;
      white-space: pre-wrap;
      border-left: 2px solid #ccc;
      padding: 0.4em 0.8em;
      margin: 0.5em 0 0.5em 0.5em;
      line-height: 1.7;
    }
    hr.tab-divider { border: none; border-top: 1px solid #ccc; width: 20%; margin: 0.3em 0 0.3em 0.5em; }
    .outline-l1 { margin-left: 0; }
    .outline-l2 { margin-left: 2em; }
    .outline-l3 { margin-left: 4em; }
    table.psalm-tab { border-collapse: collapse; font-size: 0.95em; line-height: 1.7; margin: 0.5em 0 0.5em 0.5em; }
    table.psalm-tab td { padding: 0 0.8em 0 0; vertical-align: baseline; }
    table.psalm-tab td.pl { font-style: italic; color: #555; min-width: 1.8em; }
    table.psalm-tab td.pn { text-align: right; color: #888; min-width: 1.5em; }
    table.schema-tab { border-collapse: collapse; font-size: 0.9em; line-height: 1.9; margin: 0.5em 0 0.5em 0.5em; }
    table.schema-tab td, table.schema-tab th { padding: 0 0.9em 0 0; vertical-align: baseline; white-space: nowrap; }
    table.schema-tab th { font-weight: normal; font-style: italic; color: #888; font-size: 0.85em; padding-bottom: 0.3em; }
    table.schema-tab td.sv { font-style: italic; color: #888; min-width: 4.5em; }
    table.schema-tab td.sl { text-align: right; padding-right: 0.9em; min-width: 1.8em; }
    table.schema-tab td.si, table.schema-tab td.sc { text-align: center; min-width: 1.5em; }
    table.schema-tab td.so { text-align: center; min-width: 1.5em; font-style: italic; font-weight: bold; color: #0055aa; }
  </style>
</head>
<body>
  <h1>${formsData.title}</h1>
  ${formsData.sections.map(section => {
    const titleClass = section.title.match(/^\d+\./) ? 'subsection-title' : 'section-title';
    function escHtml2(str) {
      if (!str) return '';
      return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    function renderInline2(str) {
      return escHtml2(str)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
    }
    function renderItem2(item) {
      if (typeof item === 'string') return `<div class="content">${renderInline2(item)}</div>`;
      if (item.verse !== undefined) return `<pre class="verse-block">${renderInline2(item.verse)}</pre>`;
      if (item.divider) return `<hr class="tab-divider">`;
      if (item.outline_l1 !== undefined) return `<div class="content outline-l1">${renderInline2(item.outline_l1)}</div>`;
      if (item.outline_l2 !== undefined) return `<div class="content outline-l2">${renderInline2(item.outline_l2)}</div>`;
      if (item.outline_l3 !== undefined) return `<div class="content outline-l3">${renderInline2(item.outline_l3)}</div>`;
      if (item.psalm_text) {
        const rows = item.psalm_text.map(r =>
          `<tr><td class="pl">${escHtml2(r.verse_label)}</td><td class="pt">${escHtml2(r.text)}</td><td class="pn">${r.line}</td></tr>`
        ).join('');
        return `<table class="psalm-tab"><tbody>${rows}</tbody></table>`;
      }
      if (item.schematic_table) {
        const hdr = `<tr><th></th><th>line</th><th>inner</th><th>compound</th><th>overall</th></tr>`;
        const rows = item.schematic_table.rows.map(r =>
          `<tr><td class="sv">${escHtml2(r.verse)}</td><td class="sl">${escHtml2(r.line)}</td><td class="si">${escHtml2(r.inner)}</td><td class="sc">${escHtml2(r.compound)}</td><td class="so">${r.overall ? `<em>${escHtml2(r.overall)}</em>` : ''}</td></tr>`
        ).join('');
        return `<table class="schema-tab"><thead>${hdr}</thead><tbody>${rows}</tbody></table>`;
      }
      return '';
    }
    return `
      <div class="${titleClass}">${section.title}</div>
      ${section.content.map(renderItem2).join('')}
    `;
  }).join('')}
</body>
</html>`;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
  
  function showControlsPanel() {
    const panel = document.createElement('div');
    panel.className = 'content-panel floating';
    panel.innerHTML = `
      <div class="content-inner draggable">
        <div class="content-header drag-handle">
          <h2>Player Controls</h2>
          <button class="close-panel-btn" aria-label="Close">&times;</button>
        </div>
        <div class="content-body">
          <section>
            <h3>Playback</h3>
            <ul>
              <li>Press <kbd>Space</kbd> or ?/?? to play or pause</li>
              <li>Press <kbd>?</kbd> to replay the previous line</li>
            </ul>
          </section>
          
          <section>
            <h3>Navigation</h3>
            <ul>
              <li>Click any line to jump to that moment</li>
              <li>Enter a line number in the box to jump directly</li>
              <li>Drag the seek slider to find a passage</li>
            </ul>
          </section>
          
          <section>
            <h3>Commentary</h3>
            <ul>
              <li>Click a <span class="tag tag-note">NOTE</span> or <span class="tag tag-verse">VERSE</span> badge (audio pauses)</li>
              <li>Press <kbd>ESC</kbd> to close</li>
            </ul>
          </section>
          
          <section>
            <h3>Volume</h3>
            <ul>
              <li>Adjust using the slider in control bar</li>
            </ul>
          </section>
        </div>
      </div>
    `;
    
    document.body.appendChild(panel);
    const inner = panel.querySelector('.content-inner');
    makeDraggable(inner);
    
    // Close button handler
    const closeBtn = panel.querySelector('.close-panel-btn');
    closeBtn.addEventListener('click', () => {
      panel.remove();
    });
    
    // Close on ESC
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        panel.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
    
    // Close on outside click
    panel.addEventListener('click', (e) => {
      if (e.target === panel) {
        panel.remove();
      }
    });
  }
  
  
  
  function showSearchPanelInMultiTabMode(searchQuery, resultType) {
    const panel = document.createElement('div');
    panel.className = 'content-panel floating search-in-multitab compact';
    
    // Get launch time from URL
    const urlParams = new URLSearchParams(window.location.search);
    const launchTime = urlParams.get('launchTime');
    
    panel.innerHTML = `
      <div class="content-inner search-panel draggable compact-panel">
        <div class="content-header drag-handle">
          <button class="back-to-launch" aria-label="Back and close tab">&larr; Back &amp; Close Tab</button>
          <div class="multitab-info-inline">Search: "${searchQuery}"</div>
          <button class="close-panel-btn" aria-label="Close">&times;</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    const inner = panel.querySelector('.content-inner');
    makeDraggable(inner);
    
    // Handle back button - always restore and close
    const backBtn = panel.querySelector('.back-to-launch');
    backBtn.addEventListener('click', () => {
      console.log('[Multi-tab] Back & Close clicked, launchTime:', launchTime);
      
      // Send message to opener to restore launch point
      if (window.opener && !window.opener.closed && launchTime) {
        console.log('[Multi-tab] Sending restore message to opener');
        window.opener.postMessage({
          type: 'restoreLaunchPoint',
          time: parseFloat(launchTime)
        }, '*');
      }
      
      // Focus opener and close this tab
      if (window.opener && !window.opener.closed) {
        window.opener.focus();
      }
      window.close();
    });
    
    // Close button
    const closeBtn = panel.querySelector('.close-panel-btn');
    closeBtn.addEventListener('click', () => window.close());
  }
  
  /* -------- Search Functionality -------- */
  
  function showSearchPanel() {
    const panel = document.createElement('div');
    panel.className = 'content-panel floating';
    panel.innerHTML = `
      <div class="content-inner search-panel draggable">
        <div class="content-header drag-handle">
          <h2>Search</h2>
          <button class="close-panel-btn" aria-label="Close">&times;</button>
        </div>
        <div class="content-body">
          <div class="search-controls">
            <input type="text" id="searchInput" placeholder="Enter search term..." class="search-input">
            <div class="search-options">
              <div class="search-option-group">
                <label class="search-option-label">Scope:</label>
                <label>
                  <input type="radio" name="searchScope" value="current" checked>
                  Current file
                </label>
                <label>
                  <input type="radio" name="searchScope" value="all">
                  All files
                </label>
              </div>
              <div class="search-option-group">
                <label class="search-option-label">Display:</label>
                <label>
                  <input type="radio" name="tabMode" value="single" checked>
                  Show in this tab
                </label>
                <label>
                  <input type="radio" name="tabMode" value="multiple">
                  Show in separate tabs
                </label>
              </div>
            </div>
            <button id="searchBtn" class="search-btn">Search</button>
          </div>
          <div id="searchResults" class="search-results"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    const inner = panel.querySelector('.content-inner');
    makeDraggable(inner);
    
    const searchInput = panel.querySelector('#searchInput');
    const searchBtn = panel.querySelector('#searchBtn');
    const resultsDiv = panel.querySelector('#searchResults');
    
    // Get scope and tab mode controls
    const scopeRadios = panel.querySelectorAll('input[name="searchScope"]');
    const tabModeRadios = panel.querySelectorAll('input[name="tabMode"]');
    const singleTabRadio = panel.querySelector('input[name="tabMode"][value="single"]');
    const multipleTabRadio = panel.querySelector('input[name="tabMode"][value="multiple"]');
    const singleTabLabel = singleTabRadio.closest('label');
    
    // Handler to update tab mode options based on scope
    const updateTabModeAvailability = () => {
      const scope = panel.querySelector('input[name="searchScope"]:checked').value;
      if (scope === 'all') {
        // All files: disable single tab, force multiple tabs
        singleTabRadio.disabled = true;
        singleTabLabel.style.opacity = '0.5';
        singleTabLabel.style.cursor = 'not-allowed';
        multipleTabRadio.checked = true;
      } else {
        // Current file: enable both options
        singleTabRadio.disabled = false;
        singleTabLabel.style.opacity = '1';
        singleTabLabel.style.cursor = 'pointer';
      }
    };
    
    // Attach change handlers to scope radios
    scopeRadios.forEach(radio => {
      radio.addEventListener('change', updateTabModeAvailability);
    });
    
    // Initialize on load
    updateTabModeAvailability();
    
    // Prevent space bar from triggering play when typing in search
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.stopPropagation();
      }
      
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = searchInput.value.trim();
        const scope = panel.querySelector('input[name="searchScope"]:checked').value;
        if (query) {
          performSearch(query, scope, resultsDiv);
        }
      } else if (e.key === 'Escape') {
        panel.remove();
      }
    });
    
    // Search on button click
    searchBtn.addEventListener('click', () => {
      const query = searchInput.value.trim();
      const scope = panel.querySelector('input[name="searchScope"]:checked').value;
      if (query) {
        performSearch(query, scope, resultsDiv);
      }
    });
    
    // Focus search input
    searchInput.focus();
    
    // Close handlers
    const closeBtn = panel.querySelector('.close-panel-btn');
    closeBtn.addEventListener('click', () => panel.remove());
    
    // Close on outside click (but not ESC - that's for annotations)
    panel.addEventListener('click', (e) => {
      if (e.target === panel) panel.remove();
    });
  }
  
  async function performSearch(query, scope, resultsDiv) {
    resultsDiv.innerHTML = '<div class="search-loading">Searching...</div>';
    
    const queryLower = query.toLowerCase();
    const results = [];
    
    if (scope === 'current') {
      // Search current ballad only
      await searchCurrentBallad(queryLower, results);
      
      // Mark current ballad results with proper ballad name and folder
      // Get current ballad folder from path
      const currentPath = window.location.pathname;
      const pathParts = currentPath.split('/');
      const currentFolder = decodeURIComponent(pathParts[pathParts.length - 2]);
      
      // Auto-discover to get ballad info if not already done
      if (BALLADS.length === 0) {
        await discoverBalladFolders();
      }
      
      // Find current ballad info
      const currentBallad = BALLADS.find(b => b.folder === currentFolder);
      const currentBalladName = currentBallad ? currentBallad.name : null;
      
      // Mark all results with actual ballad name (replace 'current' marker)
      results.forEach(r => {
        if ((r.ballad === 'current' || !r.ballad) && currentBalladName) {
          r.ballad = currentBalladName;
          r.balladFolder = currentFolder;
          r.isCurrent = true;
        }
      });
    } else {
      // Search all ballads
      await searchAllBallads(queryLower, results);
    }
    
    // Sort results
    if (scope === 'all') {
      // For all files: group by ballad, then by relevance within each ballad
      results.sort((a, b) => {
        // First, sort by ballad name
        if (a.ballad !== b.ballad) {
          return a.ballad.localeCompare(b.ballad);
        }
        // Within same ballad, sort by line number
        const lineA = parseFloat(String(a.line).split('-')[0]) || 0;
        const lineB = parseFloat(String(b.line).split('-')[0]) || 0;
        return lineA - lineB;
      });
    } else {
      // For current file: just sort by relevance
      results.sort((a, b) => b.relevance - a.relevance);
    }
    
    displaySearchResults(results, resultsDiv, query, scope);
  }
  
  async function searchCurrentBallad(queryLower, results) {
    // Search transcription
    TR.forEach(item => {
      if (item.text) {
        const textLower = stripFormatting(item.text).toLowerCase();
        if (textLower.includes(queryLower)) {
          results.push({
            type: 'transcription',
            ballad: 'current',
            line: item.line,
            id: item.id,
            text: item.text,
            context: getContext(textLower, queryLower, item.text),
            relevance: calculateRelevance(textLower, queryLower)
          });
        }
      }
    });
    
    // Search translation
    EN.forEach(item => {
      if (item.text) {
        const textLower = stripFormatting(item.text).toLowerCase();
        if (textLower.includes(queryLower)) {
          results.push({
            type: 'translation',
            ballad: 'current',
            line: TR.find(t => t.id === item.id)?.line || item.id,
            id: item.id,
            text: item.text,
            context: getContext(textLower, queryLower, item.text),
            relevance: calculateRelevance(textLower, queryLower)
          });
        }
      }
    });
    
    // Search annotations
    AN.forEach((anno, index) => {
      const searchText = `${anno.badge || ''} ${anno.note || ''}`;
      const textLower = stripFormatting(searchText).toLowerCase();
      if (textLower.includes(queryLower)) {
        results.push({
          type: 'annotation',
          ballad: 'current',
          line: anno.line,
          id: anno.id_ref,
          annoIndex: index,
          text: anno.note || '',
          badge: anno.badge,
          badgeType: anno.type,
          context: getContext(textLower, queryLower, searchText),
          relevance: calculateRelevance(textLower, queryLower, true)
        });
      }
    });
    
    // Search plot summary
    try {
      const response = await fetch(getPlotFilename());
      const plotData = await response.json();
      
      plotData.sections.forEach(section => {
        const textLower = stripFormatting(section.text).toLowerCase();
        if (textLower.includes(queryLower)) {
          results.push({
            type: 'plot',
            ballad: 'current',
            line: section.lines,
            id: null,
            text: section.text,
            context: getContext(textLower, queryLower, section.text),
            relevance: calculateRelevance(textLower, queryLower) + 1
          });
        }
      });
    } catch (err) {
      console.warn('[Search] Could not load plot summary:', err);
    }
  }
  
  async function searchAllBallads(queryLower, results) {
    // Auto-discover ballad folders if not already done
    if (BALLADS.length === 0) {
      await discoverBalladFolders();
    }
    
    // Get current ballad folder from path
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/');
    const currentFolder = decodeURIComponent(pathParts[pathParts.length - 2]);
    
    console.log('[Search] Current folder:', currentFolder);
    console.log('[Search] Discovered ballads:', BALLADS.map(b => b.name).join(', '));
    
    // Find current ballad info
    const currentBallad = BALLADS.find(b => b.folder === currentFolder);
    const currentBalladName = currentBallad ? currentBallad.name : null;
    
    // Search current ballad first (already loaded)
    await searchCurrentBallad(queryLower, results);
    
    // Mark current ballad results with actual ballad name (replace 'current' marker)
    results.forEach(r => {
      if ((r.ballad === 'current' || !r.ballad) && currentBalladName) {
        r.ballad = currentBalladName;
        r.balladFolder = currentFolder;
        r.isCurrent = true; // Flag to know it's current ballad
      }
    });
    
    // Search other ballads
    for (const ballad of BALLADS) {
      // Skip current ballad (already searched)
      if (currentFolder === ballad.folder) {
        console.log('[Search] Skipping current ballad:', ballad.name);
        continue;
      }
      
      console.log('[Search] Searching ballad:', ballad.name);
      await searchBalladFiles(ballad, queryLower, results);
    }
    
    // Search essays and intros
    await searchEssaysAndIntros(queryLower, results);

    console.log('[Search] Total results from all ballads:', results.length);
  }
  
  async function searchEssaysAndIntros(queryLower, results) {
    // Build repo root URL
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/');
    pathParts.pop(); // remove index.html
    pathParts.pop(); // remove ballad folder
    const repoRoot = window.location.origin + pathParts.join('/');

    // Known essays
    const ESSAYS = [
      { file: 'haya_people.html',          title: 'The Haya People' },
      { file: 'enanga_tradition.html',     title: 'The Enanga Tradition' },
      { file: 'recording_methodology.html',title: 'Recording These Performances' },
      { file: 'heroic_age.html',           title: 'Why These Are Epics: The Heroic Age' },
      { file: 'call_episode.html',         title: 'The Call Episode' },
      { file: 'bards_voices.html',         title: 'Four Bards, Four Voices' },
      { file: 'poetic_forms.html',         title: 'Poetic Forms in Haya Epic Ballads' },
    ];

    for (const essay of ESSAYS) {
      try {
        const url = `${repoRoot}/essays/${essay.file}`;
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const html = await resp.text();
        // Strip tags for searching
        const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        const textLower = text.toLowerCase();
        if (textLower.includes(queryLower)) {
          // Find a context snippet
          const idx = textLower.indexOf(queryLower);
          const start = Math.max(0, idx - 80);
          const end = Math.min(text.length, idx + queryLower.length + 80);
          const snippet = text.substring(start, end).trim();
          results.push({
            type: 'essay',
            ballad: essay.title,
            balladFolder: null,
            file: essay.file,
            line: null,
            id: null,
            text: snippet,
            context: snippet,
            relevance: 1
          });
        }
      } catch (err) {
        console.log('[Search] Could not load essay:', essay.file, err.message);
      }
    }

    // Search intro pages for each ballad
    for (const ballad of BALLADS) {
      try {
        const url = `${repoRoot}/${encodeURIComponent(ballad.folder)}/intro.html`;
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const html = await resp.text();
        const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        const textLower = text.toLowerCase();
        if (textLower.includes(queryLower)) {
          const idx = textLower.indexOf(queryLower);
          const start = Math.max(0, idx - 80);
          const end = Math.min(text.length, idx + queryLower.length + 80);
          const snippet = text.substring(start, end).trim();
          results.push({
            type: 'intro',
            ballad: ballad.name + ' (Introduction)',
            balladFolder: ballad.folder,
            file: 'intro.html',
            line: null,
            id: null,
            text: snippet,
            context: snippet,
            relevance: 1
          });
        }
      } catch (err) {
        console.log('[Search] Could not load intro for:', ballad.name, err.message);
      }
    }
  }

    async function discoverBalladFolders() {
    // Hardcoded ballad list — GitHub Pages has no directory listing
    const KNOWN_BALLADS = [
      { folder: 'Feza - Kaitaba',         name: 'Kaitaba',              hasPlot: true,  plotFile: 'kaitaba_plot.json' },
      { folder: 'Fezza - Kitekele',        name: 'King Kitekere',        hasPlot: true,  plotFile: 'kitekele_plot.json' },
      { folder: 'Habib - Mugasha I',       name: 'Mugasha I',            hasPlot: true,  plotFile: 'mugasha_i_plot.json' },
      { folder: 'Habib - Mugasha II',      name: 'Mugasha II',           hasPlot: false, plotFile: null },
      { folder: 'Mugasha - Mbali',         name: 'The Place You Come From', hasPlot: true, plotFile: 'mbali_plot.json' },
      { folder: 'Mugasha - Rukiza',        name: 'Rukiza',               hasPlot: true,  plotFile: 'rukiza_plot.json' },
      { folder: 'Muzee - Kachwenyanja',    name: 'Kachwenyanja',         hasPlot: true,  plotFile: 'kachwenyanja_plot.json' },
      { folder: 'Muzee - Kaiyula',         name: 'Kaiyula',              hasPlot: true,  plotFile: 'kaiyula_plot.json' },
      { folder: 'Muzee - Kajango',         name: 'Kajango',              hasPlot: true,  plotFile: 'kajango_plot.json' },
      { folder: 'Muzee - The Tree Mwata',  name: 'The Tree Mwata',       hasPlot: true,  plotFile: 'the_tree_mwata_plot.json' },
    ];
    BALLADS = KNOWN_BALLADS;
    console.log('[Discovery] Using hardcoded ballad list:', BALLADS.map(b => b.name).join(', '));
  }

  
  async function searchBalladFiles(ballad, queryLower, results) {
    const balladResults = [];
    
    // Build absolute URL - go up to parent, then into ballad folder
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/');
    pathParts.pop(); // Remove index.html
    pathParts.pop(); // Remove current ballad folder
    const baseURL = `${window.location.origin}${pathParts.join('/')}/${encodeURIComponent(ballad.folder)}`;
    
    console.log('[Search] Searching in:', baseURL);
    
    try {
      // Try to fetch transcription
      const trResponse = await fetch(`${baseURL}/transcription.json`);
      if (trResponse.ok) {
        const trData = await trResponse.json();
        trData.forEach(item => {
          if (item.text) {
            const textLower = stripFormatting(item.text).toLowerCase();
            if (textLower.includes(queryLower)) {
              balladResults.push({
                type: 'transcription',
                ballad: ballad.name,
                balladFolder: ballad.folder,
                line: item.line,
                id: item.id,
                text: item.text,
                context: getContext(textLower, queryLower, item.text),
                relevance: calculateRelevance(textLower, queryLower)
              });
            }
          }
        });
      }
    } catch (err) {
      console.log(`[Search] Could not load transcription for ${ballad.name}:`, err.message);
    }
    
    try {
      // Try to fetch translation
      const enResponse = await fetch(`${baseURL}/translation.json`);
      if (enResponse.ok) {
        const enData = await enResponse.json();
        
        // Also fetch transcription to get line numbers if needed
        let trData = null;
        try {
          const trResp = await fetch(`${baseURL}/transcription.json`);
          if (trResp.ok) trData = await trResp.json();
        } catch {}
        
        enData.forEach(item => {
          if (item.text) {
            const textLower = stripFormatting(item.text).toLowerCase();
            if (textLower.includes(queryLower)) {
              // Get line number from translation or look it up in transcription
              let lineNum = item.line;
              if (!lineNum && trData) {
                const trItem = trData.find(t => t.id === item.id);
                lineNum = trItem ? trItem.line : item.id;
              }
              
              balladResults.push({
                type: 'translation',
                ballad: ballad.name,
                balladFolder: ballad.folder,
                line: lineNum || item.id,
                id: item.id,
                text: item.text,
                context: getContext(textLower, queryLower, item.text),
                relevance: calculateRelevance(textLower, queryLower)
              });
            }
          }
        });
      }
    } catch (err) {
      console.log(`[Search] Could not load translation for ${ballad.name}:`, err.message);
    }
    
    try {
      // Try to fetch annotations
      const anResponse = await fetch(`${baseURL}/annotations.json`);
      if (anResponse.ok) {
        const anData = await anResponse.json();
        anData.forEach((anno, index) => {
          if (anno.note) {
            const textLower = stripFormatting(anno.note).toLowerCase();
            if (textLower.includes(queryLower)) {
              balladResults.push({
                type: 'annotation',
                ballad: ballad.name,
                balladFolder: ballad.folder,
                line: anno.line,
                id: anno.id,
                annoIndex: index,
                text: anno.note,
                context: getContext(textLower, queryLower, anno.note),
                relevance: calculateRelevance(textLower, queryLower) + 2
              });
            }
          }
        });
      }
    } catch (err) {
      console.log(`[Search] Could not load annotations for ${ballad.name}:`, err.message);
    }
    
    // Try to fetch plot summary if it exists
    if (ballad.hasPlot) {
      try {
        const plotResponse = await fetch(`${baseURL}/${ballad.plotFile}`);
        if (plotResponse.ok) {
          const plotData = await plotResponse.json();
          plotData.sections.forEach(section => {
            const textLower = stripFormatting(section.text).toLowerCase();
            if (textLower.includes(queryLower)) {
              balladResults.push({
                type: 'plot',
                ballad: ballad.name,
                balladFolder: ballad.folder,
                line: section.lines,
                id: null,
                text: section.text,
                context: getContext(textLower, queryLower, section.text),
                relevance: calculateRelevance(textLower, queryLower) + 1
              });
            }
          });
        }
      } catch (err) {
        console.log(`[Search] Could not load plot for ${ballad.name}:`, err.message);
      }
    }
    
    // Add all results from this ballad
    results.push(...balladResults);
  }
  
  function stripFormatting(text) {
    // Remove HTML tags and extra whitespace
    return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
  
  function getContext(textLower, queryLower, originalText) {
    const stripped = stripFormatting(originalText);
    const index = textLower.indexOf(queryLower);
    if (index === -1) return stripped.substring(0, 100);
    
    const start = Math.max(0, index - 50);
    const end = Math.min(stripped.length, index + queryLower.length + 50);
    
    let context = stripped.substring(start, end);
    if (start > 0) context = '...' + context;
    if (end < stripped.length) context = context + '...';
    
    // Highlight the match
    const matchStart = context.toLowerCase().indexOf(queryLower);
    if (matchStart !== -1) {
      const matchEnd = matchStart + queryLower.length;
      context = context.substring(0, matchStart) + 
                '<mark>' + context.substring(matchStart, matchEnd) + '</mark>' +
                context.substring(matchEnd);
    }
    
    return context;
  }
  
  function calculateRelevance(textLower, queryLower, isAnnotation = false) {
    let score = 0;
    
    // Base score for containing the term
    score += 1;
    
    // Bonus for exact word match (not substring)
    const words = textLower.split(/\s+/);
    if (words.includes(queryLower)) {
      score += 2;
    }
    
    // Bonus for annotation matches (higher priority)
    if (isAnnotation) {
      score += 3;
    }
    
    // Bonus for multiple occurrences
    const occurrences = (textLower.match(new RegExp(queryLower, 'g')) || []).length;
    score += occurrences * 0.5;
    
    return score;
  }
  
  function displaySearchResults(results, resultsDiv, query, scope) {
    if (results.length === 0) {
      resultsDiv.innerHTML = '<div class="search-no-results">No results found.</div>';
      return;
    }
    
    // Filter out info messages for count
    const actualResults = results.filter(r => r.type !== 'info');
    
    let html = `
      <div class="search-results-header">
        <div class="search-summary">${actualResults.length} result${actualResults.length !== 1 ? 's' : ''} for "${query}"</div>
        <button class="open-tab-btn search-tab-btn" onclick="openSearchInTab()" title="Open all results in new tab">&#x29C9;</button>
      </div>
    `;
    
    html += '<div class="search-results-list">';
    
    let currentBalladGroup = null;
    
    results.forEach((result, index) => {
      if (result.type === 'info') {
        html += `<div class="search-result search-info">${result.text}</div>`;
      } else {
        const typeLabel = result.type === 'transcription' ? 'Haya' : 
                         result.type === 'translation' ? 'English' : 
                         result.type === 'plot' ? 'Plot' :
                         result.type === 'essay' ? 'Essay' :
                         result.type === 'intro' ? 'Intro' : 'Note';
        
        // Always show ballad name inline with result (same style as type badge)
        const balladLabel = result.ballad ? 
          `<span class="search-ballad-name-inline">${result.ballad}</span>` : '';
        
        // Get the correct badge for annotations
        let typeBadge;
        if (result.type === 'annotation') {
          // For non-current ballads, we don't have AN loaded, so use generic badge
          if (!result.isCurrent) {
            typeBadge = `<span class="tag tag-note">NOTE</span>`;
          } else {
            const annoData = AN[result.annoIndex];
            const badgeType = annoData?.type || 'note';
            const badgeText = (annoData?.badge || badgeType).toUpperCase();
            typeBadge = `<span class="tag tag-${badgeType}">${badgeText}</span>`;
          }
        } else {
          typeBadge = `<span class="search-type-badge">${typeLabel}</span>`;
        }
        
        html += `
          <div class="search-result" data-index="${index}">
            <div class="search-result-header">
              ${balladLabel}
              ${typeBadge}
              ${result.line ? `<span class="search-result-line">Line${result.type === 'plot' ? 's' : ''} ${result.line}</span>` : ''}
            </div>
            <div class="search-result-context">${result.context}</div>
          </div>
        `;
      }
    });
    html += '</div>';
    
    resultsDiv.innerHTML = html;
    
    // Store results for "open in tab" feature
    resultsDiv.dataset.query = query;
    resultsDiv.dataset.results = JSON.stringify(results);
    
    // Add click handlers to results (for jumping to line)
    resultsDiv.querySelectorAll('.search-result[data-index]').forEach(resultEl => {
      resultEl.addEventListener('click', (e) => {
        const index = parseInt(resultEl.dataset.index);
        const result = results[index];
        handleSearchResultClick(result, query);
      });
    });
  }
  
  function highlightSearchTermInRow(rowId, searchQuery) {
    const row = idToRow.get(rowId);
    if (!row || !searchQuery) return;
    
    const hayaCell = row.querySelector('.haya');
    const engCell = row.querySelector('.eng');
    
    if (hayaCell) {
      highlightTermInCell(hayaCell, searchQuery);
    }
    if (engCell) {
      highlightTermInCell(engCell, searchQuery);
    }
  }
  
  function highlightTermInCell(cell, query) {
    const originalHTML = cell.innerHTML;
    const textContent = cell.textContent;
    
    // Case-insensitive search
    const regex = new RegExp(`(${query})`, 'gi');
    
    if (regex.test(textContent)) {
      // Replace with highlighted version
      const highlighted = originalHTML.replace(regex, '<mark class="search-highlight">$1</mark>');
      cell.innerHTML = highlighted;
    }
  }
  
  function addBackArrowToSearchPanel() {
    const searchPanel = document.querySelector('.search-panel');
    if (!searchPanel) return;
    
    const header = searchPanel.querySelector('.content-header');
    if (!header) return;
    
    // Check if back arrow already exists
    if (header.querySelector('.back-to-search')) return;
    
    // Add back arrow before the title
    const h2 = header.querySelector('h2');
    const backBtn = document.createElement('button');
    backBtn.className = 'back-to-search';
    backBtn.setAttribute('aria-label', 'Back to search results');
    backBtn.textContent = '\u2190 Back'; // Unicode left arrow
    
    backBtn.addEventListener('click', () => {
      // Close any open annotation panel
      closeTextPanel();
      closeImagePanel();
      // Restore original position
      moveSearchPanelLeft();
      // Clear highlights
      clearSearchHighlights();
      // Remove back arrow
      backBtn.remove();
      // Return to original launch point
      if (idTimes.length) {
        setCurrent(idTimes[0][0], { center: true });
      }
    });
    
    header.insertBefore(backBtn, h2);
  }
  
  function clearSearchHighlights() {
    document.querySelectorAll('.search-highlight').forEach(mark => {
      const parent = mark.parentNode;
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize();
    });
  }
  
  function handleSearchResultClick(result, searchQuery) {
    // Check if result is from a different ballad (not marked as current)
    if (result.ballad && !result.isCurrent) {
      // Result is from another ballad - need to open that ballad
      const searchPanel = document.querySelector('.search-panel');
      const tabMode = searchPanel?.querySelector('input[name="tabMode"]:checked')?.value || 'single';
      
      if (tabMode === 'multiple') {
        // Open other ballad in new tab
        openResultInNewTabWithContext(result, searchQuery);
      } else {
        // Open other ballad in current tab (replacing current ballad)
        openResultInCurrentTab(result, searchQuery);
      }
      return;
    }
    
    // Result is from current ballad - handle normally
    // Check if we're in multiple tab mode
    const searchPanel = document.querySelector('.search-panel');
    const tabMode = searchPanel?.querySelector('input[name="tabMode"]:checked')?.value || 'single';
    
    if (tabMode === 'multiple') {
      // Open result in new tab
      openResultInNewTabWithContext(result, searchQuery);
    } else {
      // Single tab mode - navigate within current tab
      // Clear any previous highlights
      clearSearchHighlights();
      
      if (result.type === 'annotation') {
        // Open annotation panel at bottom, keep search results visible
        // Store search query for highlighting
        const annoData = AN[result.annoIndex];
        if (annoData) {
          annoData._searchQuery = searchQuery; // Temporary property for highlighting
        }
        handleBadgeClick(result.annoIndex);
        // Also jump to relevant line
        const time = timeForId(result.id);
        if (time != null && audioEl) {
          audioEl.currentTime = time;
          const row = idToRow.get(result.id);
          if (row) {
            centerRow(row);
            // Highlight search term in the row
            setTimeout(() => highlightSearchTermInRow(result.id, searchQuery), 100);
          }
        }
        // Add back arrow
        addBackArrowToSearchPanel();
      } else if (result.type === 'plot') {
        // Transform search panel to show plot summary
        showPlotSummaryWithLines(result.line, searchQuery, true);
        // Jump to relevant line range
        const lineRange = result.line.split('-');
        const firstLine = lineRange[0];
        const matchingRow = TR.find(item => String(item.line) === firstLine && item.kind === "poem");
        if (matchingRow) {
          const time = timeForId(matchingRow.id);
          if (time != null && audioEl) {
            audioEl.currentTime = time;
          }
        }
      } else if (result.type === 'transcription') {
        // Haya result - move search panel to right and add back arrow
        addBackArrowToSearchPanel();
        moveSearchPanelRight();
        // Jump to line and highlight
        const time = timeForId(result.id);
        if (time != null && audioEl) {
          audioEl.currentTime = time;
          const row = idToRow.get(result.id);
          if (row) {
            centerRow(row);
            // Highlight search term in the row
            setTimeout(() => highlightSearchTermInRow(result.id, searchQuery), 100);
          }
        }
      } else {
        // English: Jump to line, add back arrow, highlight term
        addBackArrowToSearchPanel();
        const time = timeForId(result.id);
        if (time != null && audioEl) {
          audioEl.currentTime = time;
          const row = idToRow.get(result.id);
          if (row) {
            centerRow(row);
            // Highlight search term in the row
            setTimeout(() => highlightSearchTermInRow(result.id, searchQuery), 100);
          }
        }
      }
    }
  }
  
  function moveSearchPanelRight() {
    const panel = document.querySelector('.content-panel.floating');
    const rowsContainer = document.getElementById('rows');
    
    if (panel && rowsContainer) {
      // Calculate position to align with right edge of content
      const rowsRect = rowsContainer.getBoundingClientRect();
      const rightEdge = rowsRect.right;
      const panelWidth = panel.offsetWidth;
      
      // Position panel so its left edge aligns with right column
      // Right column starts roughly at the midpoint of rows container
      const leftPosition = rowsRect.left + (rowsRect.width * 0.5) + 20; // 20px padding
      
      panel.style.left = leftPosition + 'px';
      panel.style.right = 'auto';
    }
  }
  
  function moveSearchPanelLeft() {
    const panel = document.querySelector('.content-panel.floating');
    if (panel) {
      panel.style.left = '20px';
      panel.style.right = 'auto';
    }
  }
  
  
  function openResultInCurrentTab(result, searchQuery) {
    // Build URL for the other ballad - go up to parent, then into ballad folder
    const currentPath = window.location.pathname;
    pathParts.pop(); // Remove index.html
    pathParts.pop(); // Remove current ballad folder
    let url = `${window.location.origin}${pathParts.join('/')}/${result.balladFolder}/index.html`;
    
    // Add parameters for navigation
    const params = new URLSearchParams();
    params.set('query', searchQuery);
    params.set('resultType', result.type);
    params.set('fromSearch', 'true');
    
    if (result.type === 'plot') {
      params.set('plot', result.line);
    } else if (result.id) {
      // We don't have the time for this ballad, so we'll need to navigate by line
      params.set('line', result.line);
      if (result.type === 'annotation') {
        params.set('annoIndex', result.annoIndex);
      }
    }
    
    url += '?' + params.toString();
    window.location.href = url;
  }
  
  function openResultInNewTabWithContext(result, searchQuery) {
    // Build URL - use other ballad's folder if needed
    let url;
    if (!result.isCurrent) {
      // Opening a different ballad - go up to parent, then into ballad folder
      const currentPath = window.location.pathname;
      const pathParts = currentPath.split('/');
      pathParts.pop(); // Remove index.html
      pathParts.pop(); // Remove current ballad folder
      url = `${window.location.origin}${pathParts.join('/')}/${result.balladFolder}/index.html`;
    } else {
      // Opening current ballad
      const currentPath = window.location.pathname;
      const basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
      url = window.location.origin + basePath + 'index.html';
    }
    
    // Store current position as launch point
    const launchId = currentId;
    const launchTime = launchId ? timeForId(launchId) : 0;
    
    // Add parameters based on result type
    const params = new URLSearchParams();
    params.set('query', searchQuery);
    params.set('resultType', result.type);
    params.set('multiTab', 'true');
    params.set('launchTime', launchTime || '0');
    params.set('launchBallad', window.location.pathname); // Store where we came from
    
    if (result.type === 'plot') {
      params.set('plot', result.line);
    } else if (result.id) {
      // For current ballad, use time; for other ballads, use line
      if (result.isCurrent) {
        const time = timeForId(result.id);
        if (time != null) {
          params.set('t', time);
        }
      } else {
        params.set('line', result.line);
      }
      if (result.type === 'annotation') {
        params.set('annoIndex', result.annoIndex);
      }
    }
    
    url += '?' + params.toString();
    window.open(url, '_blank');
  }
  
  
  
  function openResultInNewTab(result) {
    // Build URL from origin + repo root + encoded folder + index.html
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/');
    pathParts.pop(); // remove index.html
    pathParts.pop(); // remove current ballad folder
    const repoRoot = window.location.origin + pathParts.join('/');

    // Debug: log repoRoot so we can verify path construction
    console.log('[Search] repoRoot:', repoRoot);

    let url;
    if (result.type === 'essay') {
      // Essays live at repoRoot/essays/filename
      url = `${repoRoot}/essays/${result.file}`;
      console.log('[Search] Essay URL:', url);
    } else if (result.type === 'intro') {
      // Intros: encode each path segment separately to handle spaces
      const encodedFolder = result.balladFolder.split(' ').map(encodeURIComponent).join('%20');
      url = `${repoRoot}/${encodedFolder}/intro.html`;
      console.log('[Search] Intro URL:', url);
    } else if (result.balladFolder) {
      // Poem result — go to index.html in that ballad folder
      const base = `${repoRoot}/${encodeURIComponent(result.balladFolder)}/index.html`;
      if (result.type === 'plot') {
        url = `${base}?plot=${encodeURIComponent(result.line)}`;
      } else if (result.id) {
        const time = timeForId(result.id);
        url = time != null ? `${base}?t=${time}` : base;
      } else {
        url = base;
      }
    } else {
      // Current ballad result
      const basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
      url = window.location.origin + basePath;
      if (result.type === 'plot') {
        url += `?plot=${encodeURIComponent(result.line)}`;
      } else if (result.id) {
        const time = timeForId(result.id);
        if (time != null) url += `?t=${time}`;
      }
    }

    window.open(url, '_blank');
  }
  
  function openSearchInTab() {
    const resultsDiv = document.querySelector('#searchResults');
    if (!resultsDiv) return;
    
    const query = resultsDiv.dataset.query;
    const results = JSON.parse(resultsDiv.dataset.results || '[]');
    const actualResults = results.filter(r => r.type !== 'info');
    
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Search Results: "${query}"</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #0f0f10;
      color: #fff;
    }
    h1 {
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      color: #fff;
    }
    .result-count {
      color: #999;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .search-result {
      margin-bottom: 20px;
      padding: 12px;
      background: #1a1a1a;
      border-radius: 6px;
      border: 1px solid #333;
    }
    .result-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .tag {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .tag-note { background: #2a5a8a; color: #fff; }
    .tag-verse { background: #5a2a7a; color: #fff; }
    .tag-image { background: #7a5a2a; color: #fff; }
    .type-badge {
      padding: 2px 8px;
      background: #333;
      color: #aaa;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      border-radius: 3px;
    }
    .line-ref {
      font-size: 12px;
      color: #888;
    }
    .context {
      font-size: 14px;
      line-height: 1.5;
      color: #ccc;
    }
    mark {
      background: #ffefad;
      color: #000;
      padding: 2px 4px;
      border-radius: 2px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <h1>Search Results</h1>
  <div class="result-count">${actualResults.length} result${actualResults.length !== 1 ? 's' : ''} for "${query}"</div>
  ${results.map(result => {
    if (result.type === 'info') return '';
    
    const typeLabel = result.type === 'transcription' ? 'Haya' : 
                     result.type === 'translation' ? 'English' :
                     result.type === 'essay' ? 'Essay' :
                     result.type === 'intro' ? 'Intro' : 'Note';
    
    let typeBadge;
    if (result.type === 'annotation') {
      // Use the badge data stored in result, not from AN array
      const badgeType = result.badgeType || 'note';
      const badgeText = result.badge || badgeType.toUpperCase();
      typeBadge = `<span class="tag tag-${badgeType}">${badgeText}</span>`;
    } else {
      typeBadge = `<span class="type-badge">${typeLabel}</span>`;
    }
    
    return `
      <div class="search-result">
        <div class="result-header">
          ${typeBadge}
          <span class="line-ref">Line ${result.line}</span>
        </div>
        <div class="context">${result.context}</div>
      </div>
    `;
  }).join('')}
</body>
</html>`;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
  
  /* -------- Draggable Panels -------- */
  
  function makeDraggable(element) {
    const header = element.querySelector('.drag-handle');
    if (!header) return;
    
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    header.style.cursor = 'move';
    header.addEventListener('mousedown', dragMouseDown);
    
    function dragMouseDown(e) {
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.addEventListener('mouseup', closeDragElement);
      document.addEventListener('mousemove', elementDrag);
    }
    
    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      
      const newTop = element.offsetTop - pos2;
      const newLeft = element.offsetLeft - pos1;
      
      element.style.top = newTop + 'px';
      element.style.left = newLeft + 'px';
      element.style.position = 'fixed';
    }
    
    function closeDragElement() {
      document.removeEventListener('mouseup', closeDragElement);
      document.removeEventListener('mousemove', elementDrag);
    }
    
    // Add resize functionality for search panel
    if (element.classList.contains('search-panel')) {
      makeResizable(element);
    }
  }
  
  function makeResizable(element) {
    // Create resize handles
    const rightHandle = document.createElement('div');
    rightHandle.className = 'resize-handle-right';
    
    const bottomHandle = document.createElement('div');
    bottomHandle.className = 'resize-handle-bottom';
    
    const cornerHandle = document.createElement('div');
    cornerHandle.className = 'resize-handle-corner';
    
    element.appendChild(rightHandle);
    element.appendChild(bottomHandle);
    element.appendChild(cornerHandle);
    
    let startX, startY, startWidth, startHeight;
    
    // Right edge resize
    rightHandle.addEventListener('mousedown', (e) => initResize(e, 'right'));
    
    // Bottom edge resize
    bottomHandle.addEventListener('mousedown', (e) => initResize(e, 'bottom'));
    
    // Corner resize
    cornerHandle.addEventListener('mousedown', (e) => initResize(e, 'both'));
    
    function initResize(e, direction) {
      e.preventDefault();
      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      startWidth = element.offsetWidth;
      startHeight = element.offsetHeight;
      
      const resizeHandler = (e) => resize(e, direction);
      document.addEventListener('mousemove', resizeHandler);
      document.addEventListener('mouseup', () => stopResize(resizeHandler));
    }
    
    function resize(e, direction) {
      if (direction === 'right' || direction === 'both') {
        const width = startWidth + (e.clientX - startX);
        element.style.width = Math.max(350, width) + 'px';
      }
      
      if (direction === 'bottom' || direction === 'both') {
        const height = startHeight + (e.clientY - startY);
        element.style.height = Math.max(300, height) + 'px';
      }
    }
    
    function stopResize(handler) {
      document.removeEventListener('mousemove', handler);
    }
  }
  
  /* -------- First Interaction Detection -------- */
  
  let hasInteracted = false;
  const menuBtnForPulse = document.getElementById('menuBtn');
  
  function hideHamburgerPulse() {
    if (menuBtnForPulse && !hasInteracted) {
      hasInteracted = true;
      menuBtnForPulse.classList.remove('pulse');
    }
  }
  
  // Add pulse class initially
  if (menuBtnForPulse) {
    menuBtnForPulse.classList.add('pulse');
  }
  
  // Listen for any user interaction
  const interactionEvents = ['click', 'keydown', 'touchstart'];
  interactionEvents.forEach(event => {
    document.addEventListener(event, hideHamburgerPulse, { once: true });
  });


  /* -------- Intro Modal -------- */
  (function() {
    const overlay = document.getElementById('introOverlay');
    if (!overlay) return;

    const closeBtn   = document.getElementById('introClose');
    const playBtn    = document.getElementById('introClosePlay');
    const libBtn     = document.getElementById('introBackLib');
    const audio      = document.getElementById('audio');

    function closeModal() {
      overlay.classList.remove('open');
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    if (playBtn) playBtn.addEventListener('click', function() {
      closeModal();
      if (audio) { audio.play(); }
    });

    if (libBtn) libBtn.addEventListener('click', function() {
      window.close();
    });

    // Open on page load if ?intro=1 param present (from library "Read introduction" link)
    if (new URLSearchParams(window.location.search).get('intro') === '1') {
      overlay.classList.add('open');
    }
  })();

});