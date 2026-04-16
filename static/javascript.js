/* ═══════════════════════════════════════════════════════════
   AI Financial Analyst — javascript.js
   ═══════════════════════════════════════════════════════════ */

const chat = document.getElementById('chatBox');
let sidebarOpen  = true;
let activeChatKey = null;   // localStorage key for current chat

// ── ON PAGE LOAD: restore docs list + last chat ──────────────
window.addEventListener('DOMContentLoaded', () => {
    restoreDocList();
    fetchLoadedDocs();
});

// ── FILE SELECT ──────────────────────────────────────────────
document.getElementById('pdfFile').addEventListener('change', function () {
    const file = this.files[0];
    document.getElementById('fileName').textContent =
        file ? file.name : 'No file selected';
});

// ── ENTER KEY ────────────────────────────────────────────────
function handleEnter(e) {
    if (e.key === 'Enter') sendQuery();
}

// ── AUTO SCROLL ──────────────────────────────────────────────
function scrollToBottom() {
    chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
}

// ── THEME ────────────────────────────────────────────────────
function toggleTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
}

// restore saved theme
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
}

// ── SIDEBAR ──────────────────────────────────────────────────
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const btn     = document.getElementById('edgeBtn');

    sidebarOpen = !sidebarOpen;

    if (sidebarOpen) {
        sidebar.classList.remove('collapsed');
        btn.style.left  = 'var(--sidebar-w)';
        btn.textContent = '◀';
    } else {
        sidebar.classList.add('collapsed');
        btn.style.left  = '0px';
        btn.textContent = '▶';
    }
}

// ── NEW CHAT ─────────────────────────────────────────────────
function newChat() {
    activeChatKey = null;
    chat.innerHTML = `
    <div class="message ai-message">
        <div class="avatar ai-avatar">AI</div>
        <div class="message-content">
            👋 <strong>New chat started.</strong><br>
            Ask me anything about your uploaded documents.
        </div>
    </div>`;
    document.getElementById('docLoaded').textContent = 'Upload a document to begin';
}

// ── CLEAR ALL ────────────────────────────────────────────────
async function clearAll() {
    if (!confirm('Clear all documents and chat history?')) return;

    try {
        await fetch('/clear', { method: 'POST' });
    } catch (e) { /* ignore */ }

    // clear localStorage chats
    Object.keys(localStorage).forEach(k => {
        if (k.startsWith('chat_')) localStorage.removeItem(k);
    });

    document.getElementById('docList').innerHTML = '';
    document.getElementById('docListSection').style.display = 'none';
    document.getElementById('kbStatus').classList.add('hidden');
    document.getElementById('uploadStatus').textContent = '';
    document.getElementById('fileName').textContent = 'No file selected';
    document.getElementById('docLoaded').textContent = 'Upload a document to begin';

    newChat();
}

// ── QUICK QUERY ──────────────────────────────────────────────
function quickQuery(text) {
    document.getElementById('userQuery').value = text;
    sendQuery();
}

// ── UPLOAD ───────────────────────────────────────────────────
async function uploadDoc() {
    const fileInput = document.getElementById('pdfFile');
    const statusMsg = document.getElementById('uploadStatus');
    const btn       = document.getElementById('processBtn');
    const progress  = document.getElementById('progressFill');
    const kbStatus  = document.getElementById('kbStatus');
    const docLoaded = document.getElementById('docLoaded');

    if (!fileInput.files[0]) {
        statusMsg.textContent = '⚠️ Select a file first';
        return;
    }

    const fileName = fileInput.files[0].name;
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    btn.disabled = true;
    statusMsg.textContent = '⏳ Processing...';
    progress.style.width  = '40%';

    try {
        const res  = await fetch('/upload', { method: 'POST', body: formData });
        const data = await res.json();

        progress.style.width = '100%';

        if (data.status === 'Success') {
            statusMsg.textContent = '✅ Ready!';
            kbStatus.classList.remove('hidden');

            // set active chat key = this filename
            activeChatKey = 'chat_' + fileName;

            // update header
            docLoaded.textContent = fileName + ' loaded';

            // refresh doc list in sidebar
            if (data.docs) renderDocList(data.docs);

            // load existing chat for this doc if any
            loadChatFromStorage(activeChatKey);

        } else {
            statusMsg.textContent = '❌ ' + data.message;
            progress.style.width  = '0%';
        }

    } catch (err) {
        console.error(err);
        statusMsg.textContent = '❌ Upload failed';
        progress.style.width  = '0%';
    }

    btn.disabled = false;
    setTimeout(() => { progress.style.width = '0%'; }, 2000);
}

// ── FETCH DOCS FROM SERVER (on page refresh) ──────────────────
async function fetchLoadedDocs() {
    try {
        const res  = await fetch('/docs');
        const data = await res.json();
        if (data.docs && data.docs.length > 0) {
            renderDocList(data.docs);
            document.getElementById('kbStatus').classList.remove('hidden');
            document.getElementById('docLoaded').textContent =
                data.docs[data.docs.length - 1] + ' loaded';
        }
    } catch (e) { /* server might not have docs on cold start */ }
}

// ── RENDER DOC LIST IN SIDEBAR ────────────────────────────────
function renderDocList(docs) {
    const section = document.getElementById('docListSection');
    const list    = document.getElementById('docList');

    section.style.display = 'block';
    list.innerHTML = '';

    docs.forEach(docName => {
        const key  = 'chat_' + docName;
        const item = document.createElement('div');
        item.className = 'doc-item' + (activeChatKey === key ? ' active' : '');
        item.innerHTML = `<span class="doc-icon">📄</span><span class="doc-name" title="${docName}">${docName}</span>`;
        item.onclick = () => switchDoc(docName, key, item);
        list.appendChild(item);
    });
}

// ── RESTORE DOC LIST FROM LOCALSTORAGE ───────────────────────
function restoreDocList() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('chat_'));
    if (keys.length === 0) return;

    const docs = keys.map(k => k.replace('chat_', ''));
    renderDocList(docs);
}

// ── SWITCH DOC / LOAD CHAT ───────────────────────────────────
function switchDoc(docName, key, itemEl) {
    activeChatKey = key;

    // highlight active
    document.querySelectorAll('.doc-item').forEach(el => el.classList.remove('active'));
    itemEl.classList.add('active');

    // update header
    document.getElementById('docLoaded').textContent = docName + ' loaded';

    // load chat history
    loadChatFromStorage(key);
}

// ── LOCALSTORAGE: SAVE CHAT ───────────────────────────────────
function saveChatToStorage() {
    if (!activeChatKey) return;
    // save last 30 messages worth of HTML (keep it lean)
    const msgs = chat.querySelectorAll('.message');
    const slice = Array.from(msgs).slice(-30);
    const html  = slice.map(m => m.outerHTML).join('');
    try {
        localStorage.setItem(activeChatKey, html);
    } catch (e) {
        // storage full — clear oldest
        const oldest = Object.keys(localStorage)
            .filter(k => k.startsWith('chat_'))
            .shift();
        if (oldest) localStorage.removeItem(oldest);
    }
}

// ── LOCALSTORAGE: LOAD CHAT ───────────────────────────────────
function loadChatFromStorage(key) {
    const saved = localStorage.getItem(key);
    if (saved) {
        chat.innerHTML = saved;
    } else {
        chat.innerHTML = `
        <div class="message ai-message">
            <div class="avatar ai-avatar">AI</div>
            <div class="message-content">
                👋 Document loaded. Ask me anything!
            </div>
        </div>`;
    }
    scrollToBottom();
}

// ── SEND / ASK ────────────────────────────────────────────────
async function sendQuery() {
    const input = document.getElementById('userQuery');
    const query = input.value.trim();
    if (!query) return;

    // user bubble
    chat.innerHTML += `
    <div class="message user-message">
        <div class="message-content">${escapeHtml(query)}</div>
    </div>`;

    input.value = '';

    // typing indicator
    const loaderId = 'load-' + Date.now();
    chat.innerHTML += `
    <div class="message ai-message" id="${loaderId}">
        <div class="avatar ai-avatar">AI</div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    </div>`;

    scrollToBottom();

    const formData = new FormData();
    formData.append('query', query);

    try {
        const res  = await fetch('/ask', { method: 'POST', body: formData });
        const data = await res.json();

        document.getElementById(loaderId)?.remove();

        const formatted = marked.parse(data.answer || 'No response.');

        // build compact source cards
        let sourcesHtml = '';
        if (data.sources && data.sources.length > 0) {
            const cards = data.sources.map((s, i) => {
                const preview = data.previews?.[i]
                    ? data.previews[i].substring(0, 90) + '…'
                    : '';
                return `
                <div class="source-card">
                    <div class="source-card-title">📄 ${escapeHtml(s)}</div>
                    ${preview ? `<div class="source-card-preview">${escapeHtml(preview)}</div>` : ''}
                </div>`;
            }).join('');

            sourcesHtml = `
            <div class="source-cards-wrap">
                <div class="source-cards-label">Sources</div>
                <div class="source-cards">${cards}</div>
            </div>`;
        }

        chat.innerHTML += `
        <div class="message ai-message">
            <div class="avatar ai-avatar">AI</div>
            <div class="message-content">
                ${formatted}
                ${sourcesHtml}
            </div>
        </div>`;

        // persist to localStorage
        saveChatToStorage();

    } catch (err) {
        console.error(err);
        document.getElementById(loaderId)?.remove();
        appendAI('❌ Something went wrong. Please try again.');
    }

    scrollToBottom();
}

// ── HELPERS ───────────────────────────────────────────────────
function appendAI(text) {
    chat.innerHTML += `
    <div class="message ai-message">
        <div class="avatar ai-avatar">AI</div>
        <div class="message-content">${text}</div>
    </div>`;
    scrollToBottom();
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ── DRAG & DROP ───────────────────────────────────────────────
const dragArea = document.getElementById('dragArea');

if (dragArea) {
    dragArea.addEventListener('dragover', e => {
        e.preventDefault();
        dragArea.style.background    = 'rgba(16,163,127,0.1)';
        dragArea.style.borderColor   = 'rgba(16,163,127,0.7)';
    });

    dragArea.addEventListener('dragleave', () => {
        dragArea.style.background  = '';
        dragArea.style.borderColor = '';
    });

    dragArea.addEventListener('drop', e => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            document.getElementById('pdfFile').files = files;
            document.getElementById('fileName').textContent = files[0].name;
        }
        dragArea.style.background  = '';
        dragArea.style.borderColor = '';
    });
}