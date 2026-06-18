// State Management
let allReleaseNotes = [];
let filteredNotes = [];
let currentFilter = 'all';
let searchQuery = '';
let selectedUpdate = null;

// DOM Elements
const notesFeed = document.getElementById('notes-feed');
const skeletonLoader = document.getElementById('skeleton-loader');
const emptyState = document.getElementById('empty-state');
const btnRefresh = document.getElementById('btn-refresh');
const refreshSpinner = btnRefresh.querySelector('.refresh-spinner');
const btnText = btnRefresh.querySelector('.btn-text');
const searchInput = document.getElementById('search-input');
const notesCount = document.getElementById('notes-count');
const apiStatus = document.getElementById('api-status');
const statusDot = document.querySelector('.status-dot');

// Navigation Filters
const navAll = document.getElementById('nav-all');
const navFeatures = document.getElementById('nav-features');
const navChanges = document.getElementById('nav-changes');
const navDeprecations = document.getElementById('nav-deprecations');

// Composer Drawer Elements
const composerOverlay = document.getElementById('composer-overlay');
const composerDrawer = document.getElementById('composer-drawer');
const btnCloseDrawer = document.getElementById('btn-close-drawer');
const previewTypeBadge = document.getElementById('preview-type-badge');
const previewDateBadge = document.getElementById('preview-date-badge');
const previewSummaryText = document.getElementById('preview-summary-text');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const charCount = document.getElementById('char-count');
const tweetPreviewBodyText = document.getElementById('tweet-preview-body-text');
const btnShareTweet = document.getElementById('btn-share-tweet');

// Fetch and load notes from Flask API
async function loadNotes(forceRefresh = false) {
    try {
        setLoadingState(true);
        let url = '/api/notes';
        if (forceRefresh) {
            url += '?force_refresh=true';
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API returned HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            allReleaseNotes = data.entries;
            
            // Set status online
            setAPIStatus('online', 'Connected');
            
            // Display warnings if any
            if (data.warning) {
                console.warn(data.warning);
                setAPIStatus('warning', 'Cached (Offline)');
            }
        } else {
            throw new Error(data.error || 'Failed fetching feed');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        setAPIStatus('error', 'Fetch Failed');
        showErrorNotification(error.message);
    } finally {
        setLoadingState(false);
        applyFiltersAndRender();
    }
}

// Set loading UI states
function setLoadingState(isLoading) {
    if (isLoading) {
        skeletonLoader.classList.remove('hidden');
        notesFeed.classList.add('hidden');
        emptyState.classList.add('hidden');
        
        btnRefresh.disabled = true;
        refreshSpinner.classList.add('spinning');
        btnText.textContent = 'Refreshing...';
        
        setAPIStatus('loading', 'Fetching notes...');
    } else {
        skeletonLoader.classList.add('hidden');
        notesFeed.classList.remove('hidden');
        
        btnRefresh.disabled = false;
        refreshSpinner.classList.remove('spinning');
        btnText.textContent = 'Refresh Feed';
    }
}

// Update API status display
function setAPIStatus(state, message) {
    statusDot.className = 'status-dot';
    statusDot.classList.add(state);
    apiStatus.textContent = message;
}

// Helper to show basic notification
function showErrorNotification(message) {
    const errorBanner = document.createElement('div');
    errorBanner.style.position = 'fixed';
    errorBanner.style.bottom = '20px';
    errorBanner.style.left = '50%';
    errorBanner.style.transform = 'translateX(-50%)';
    errorBanner.style.backgroundColor = '#ef4444';
    errorBanner.style.color = '#fff';
    errorBanner.style.padding = '0.75rem 1.5rem';
    errorBanner.style.borderRadius = '8px';
    errorBanner.style.boxShadow = '0 10px 25px rgba(239, 68, 68, 0.3)';
    errorBanner.style.zIndex = '999';
    errorBanner.style.fontWeight = '600';
    errorBanner.style.fontSize = '0.9rem';
    errorBanner.style.transition = 'all 0.3s ease';
    errorBanner.textContent = `Error: ${message}`;
    
    document.body.appendChild(errorBanner);
    
    setTimeout(() => {
        errorBanner.style.opacity = '0';
        setTimeout(() => errorBanner.remove(), 300);
    }, 4000);
}

// Apply searches and category filters on the client side
function applyFiltersAndRender() {
    filteredNotes = [];
    
    allReleaseNotes.forEach(entry => {
        // Filter updates inside the entry
        const matchedUpdates = entry.updates.filter(update => {
            // Check Category filter
            if (currentFilter !== 'all') {
                const uType = update.type.toLowerCase();
                if (currentFilter === 'features' && uType !== 'feature') return false;
                if (currentFilter === 'changes' && uType !== 'change') return false;
                if (currentFilter === 'deprecations' && uType !== 'deprecation') return false;
            }
            
            // Check Search query
            if (searchQuery) {
                const matchText = update.text.toLowerCase();
                const matchType = update.type.toLowerCase();
                const query = searchQuery.toLowerCase();
                return matchText.includes(query) || matchType.includes(query);
            }
            
            return true;
        });
        
        if (matchedUpdates.length > 0) {
            filteredNotes.push({
                ...entry,
                updates: matchedUpdates
            });
        }
    });
    
    renderFeed();
}

// Render feed UI HTML
function renderFeed() {
    notesFeed.innerHTML = '';
    
    let totalUpdatesCount = 0;
    
    if (filteredNotes.length === 0) {
        emptyState.classList.remove('hidden');
        notesCount.textContent = '0';
        return;
    }
    
    emptyState.classList.add('hidden');
    
    filteredNotes.forEach(entry => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';
        
        const dateHeader = document.createElement('div');
        dateHeader.className = 'date-header';
        dateHeader.innerHTML = `
            <h2 class="date-title">${entry.date}</h2>
            <div class="date-line"></div>
        `;
        dateGroup.appendChild(dateHeader);
        
        entry.updates.forEach((update, idx) => {
            totalUpdatesCount++;
            
            const cardId = `${entry.id}-update-${idx}`;
            const card = document.createElement('article');
            
            // Assign card classification class
            const uTypeLower = update.type.toLowerCase();
            let classificationClass = 'other-type';
            if (uTypeLower === 'feature') classificationClass = 'feature-type';
            else if (uTypeLower === 'change') classificationClass = 'change-type';
            else if (uTypeLower === 'deprecation') classificationClass = 'deprecation-type';
            else if (uTypeLower === 'notice') classificationClass = 'notice-type';
            
            card.className = `update-card ${classificationClass}`;
            card.id = cardId;
            
            // Get proper badge class
            let badgeClass = 'other';
            if (['feature', 'change', 'deprecation', 'notice'].includes(uTypeLower)) {
                badgeClass = uTypeLower;
            }
            
            card.innerHTML = `
                <div class="card-header">
                    <div class="badge-row">
                        <span class="badge ${badgeClass}">${update.type}</span>
                    </div>
                    <a href="${entry.link}" target="_blank" rel="noopener noreferrer" class="card-source-link" title="View official GCloud release note">
                        <span>Original Note</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </a>
                </div>
                
                <div class="card-body">
                    ${update.html}
                </div>
                
                <div class="card-footer">
                    <button class="btn btn-copy-clipboard" id="btn-copy-${cardId}" aria-label="Copy update text to clipboard">
                        <span class="btn-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </span>
                        <span class="btn-text">Copy</span>
                    </button>
                    <button class="btn btn-tweet" id="btn-compose-${cardId}" aria-label="Compose tweet for this update">
                        <span class="btn-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                        </span>
                        <span>Compose Tweet</span>
                    </button>
                </div>
            `;
            
            // Attach Copy Button Click Handler
            const btnCopy = card.querySelector('.btn-copy-clipboard');
            btnCopy.addEventListener('click', () => {
                copyToClipboard(update.text, btnCopy);
            });
            
            // Attach Tweet Button Click Handler
            const btnCompose = card.querySelector('.btn-tweet');
            btnCompose.addEventListener('click', () => {
                openComposer(entry.date, update, cardId);
            });
            
            dateGroup.appendChild(card);
        });
        
        notesFeed.appendChild(dateGroup);
    });
    
    notesCount.textContent = totalUpdatesCount;
}

// Open Composer Drawer
function openComposer(date, update, cardId) {
    selectedUpdate = {
        date,
        type: update.type,
        text: update.text,
        html: update.html,
        cardId
    };
    
    // Highlight Card
    document.querySelectorAll('.btn-tweet').forEach(btn => btn.classList.remove('selected-active'));
    const activeBtn = document.getElementById(`btn-compose-${cardId}`);
    if (activeBtn) {
        activeBtn.classList.add('selected-active');
    }
    
    // Load Preview
    let badgeClass = 'other';
    const uTypeLower = update.type.toLowerCase();
    if (['feature', 'change', 'deprecation', 'notice'].includes(uTypeLower)) {
        badgeClass = uTypeLower;
    }
    
    previewTypeBadge.textContent = update.type;
    previewTypeBadge.className = `preview-badge badge ${badgeClass}`;
    previewDateBadge.textContent = date;
    previewSummaryText.textContent = update.text;
    
    // Set Draft Text Template
    const hashTag = getHashtagForType(update.type);
    let tweetTemplate = `🚀 BigQuery Update (${date}): [${update.type.toUpperCase()}]\n\n`;
    
    // Shorten preview text if needed to fit character limit comfortably (280 max)
    // Link placeholder takes ~23 characters.
    const remainingSpace = 280 - tweetTemplate.length - 30; // buffer
    let snippet = update.text;
    if (snippet.length > remainingSpace) {
        snippet = snippet.substring(0, remainingSpace - 3) + '...';
    }
    
    tweetTemplate += `"${snippet}"\n\n#BigQuery #GCP ${hashTag}\nhttps://cloud.google.com/bigquery/docs/release-notes`;
    
    tweetTextarea.value = tweetTemplate;
    
    // Trigger preview update
    updateTweetPreview();
    
    // Display Drawer
    composerOverlay.classList.add('active');
    composerDrawer.classList.add('active');
    
    // Focus Editor
    tweetTextarea.focus();
}

function getHashtagForType(type) {
    const t = type.toLowerCase();
    if (t === 'feature') return '#NewFeature';
    if (t === 'deprecation') return '#Deprecation';
    if (t === 'change') return '#Updates';
    return '#DataAnalytics';
}

// Close Composer Drawer
function closeComposer() {
    composerOverlay.classList.remove('active');
    composerDrawer.classList.remove('active');
    
    // Remove highlight
    document.querySelectorAll('.btn-tweet').forEach(btn => btn.classList.remove('selected-active'));
    selectedUpdate = null;
}

// Live update preview and characters counter
function updateTweetPreview() {
    const text = tweetTextarea.value;
    const count = text.length;
    charCount.textContent = count;
    
    // Character Limit Styles
    charCounter.className = 'char-count-badge';
    if (count > 260 && count <= 280) {
        charCounter.classList.add('warning');
    } else if (count > 280) {
        charCounter.classList.add('danger');
    }
    
    // Handle tweet preview rendering (escapes and renders linebreaks)
    tweetPreviewBodyText.textContent = text || 'Your tweet draft will show here...';
    
    // Enable/Disable Tweet Button
    if (count === 0 || count > 280) {
        btnShareTweet.disabled = true;
        btnShareTweet.style.opacity = '0.5';
        btnShareTweet.style.cursor = 'not-allowed';
    } else {
        btnShareTweet.disabled = false;
        btnShareTweet.style.opacity = '1';
        btnShareTweet.style.cursor = 'pointer';
    }
}

// Share/Tweet on X (Twitter Intent)
function shareOnTwitter() {
    const tweetText = tweetTextarea.value;
    if (!tweetText || tweetText.length > 280) return;
    
    // Open Twitter Web Intent
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(url, '_blank', 'width=550,height=420,toolbar=no,menubar=no,scrollbars=yes');
}

// Change filtering category
function selectFilter(filter, activeNav) {
    currentFilter = filter;
    
    // Update active nav class
    [navAll, navFeatures, navChanges, navDeprecations].forEach(nav => {
        nav.classList.remove('active');
    });
    activeNav.classList.add('active');
    
    applyFiltersAndRender();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initial Load
    loadNotes();
    
    // Refresh Button Handler
    btnRefresh.addEventListener('click', () => {
        loadNotes(true);
    });
    
    // Search Box Handler
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        applyFiltersAndRender();
    });
    
    // Filter Navigation Handlers
    navAll.addEventListener('click', (e) => {
        e.preventDefault();
        selectFilter('all', navAll);
    });
    
    navFeatures.addEventListener('click', (e) => {
        e.preventDefault();
        selectFilter('features', navFeatures);
    });
    
    navChanges.addEventListener('click', (e) => {
        e.preventDefault();
        selectFilter('changes', navChanges);
    });
    
    navDeprecations.addEventListener('click', (e) => {
        e.preventDefault();
        selectFilter('deprecations', navDeprecations);
    });
    
    // Composer Drawer Handlers
    btnCloseDrawer.addEventListener('click', closeComposer);
    composerOverlay.addEventListener('click', closeComposer);
    
    tweetTextarea.addEventListener('input', updateTweetPreview);
    
    btnShareTweet.addEventListener('click', shareOnTwitter);

    // Export CSV Button Handler
    const btnExportCsv = document.getElementById('btn-export-csv');
    if (btnExportCsv) {
        btnExportCsv.addEventListener('click', exportToCSV);
    }

    // Theme Toggle Handler
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const iconSun = themeToggle.querySelector('.icon-sun');
        const iconMoon = themeToggle.querySelector('.icon-moon');
        const themeText = themeToggle.querySelector('.btn-text');

        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
            iconSun.classList.remove('hidden');
            iconMoon.classList.add('hidden');
            themeText.textContent = 'Light Mode';
        }

        themeToggle.addEventListener('click', () => {
            const isLight = document.body.classList.toggle('light-theme');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            if (isLight) {
                iconSun.classList.remove('hidden');
                iconMoon.classList.add('hidden');
                themeText.textContent = 'Light Mode';
            } else {
                iconSun.classList.add('hidden');
                iconMoon.classList.remove('hidden');
                themeText.textContent = 'Dark Mode';
            }
        });
    }
});

// Copy to Clipboard Utility Function
async function copyToClipboard(text, btnElement) {
    try {
        await navigator.clipboard.writeText(text);
        
        // Show Copied feedback
        const btnTextSpan = btnElement.querySelector('.btn-text');
        const originalText = btnTextSpan.textContent;
        btnElement.classList.add('copied-active');
        btnTextSpan.textContent = 'Copied!';
        
        setTimeout(() => {
            btnElement.classList.remove('copied-active');
            btnTextSpan.textContent = originalText;
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text: ', err);
        showErrorNotification('Failed to copy to clipboard.');
    }
}

// Export Filtered Release Notes to CSV
function exportToCSV() {
    if (filteredNotes.length === 0) {
        showErrorNotification("No release notes to export.");
        return;
    }
    
    let csvRows = [];
    // CSV Headers
    csvRows.push('"Date","Category","Description","Link"');
    
    filteredNotes.forEach(entry => {
        entry.updates.forEach(update => {
            const escapedText = update.text.replace(/"/g, '""');
            const escapedType = update.type.replace(/"/g, '""');
            const escapedDate = entry.date.replace(/"/g, '""');
            const escapedLink = entry.link.replace(/"/g, '""');
            
            csvRows.push(`"${escapedDate}","${escapedType}","${escapedText}","${escapedLink}"`);
        });
    });
    
    const csvString = csvRows.join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_release_notes_${currentFilter}_export.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
