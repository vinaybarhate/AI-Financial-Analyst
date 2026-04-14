const chat = document.getElementById('chatBox');
let isTrained = false;
let sidebarOpen = true;

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

// ── SCROLL ───────────────────────────────────────────────────
function scrollToBottom() {
    chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
}

// ── THEME TOGGLE ─────────────────────────────────────────────
function toggleTheme() {
    document.body.classList.toggle('dark');
}

// ── SIDEBAR TOGGLE — FIXED ───────────────────────────────────
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const btn     = document.getElementById('edgeBtn');

    sidebarOpen = !sidebarOpen;

    if (sidebarOpen) {
        sidebar.classList.remove('collapsed');
        btn.style.left    = 'var(--sidebar-w)';
        btn.textContent   = '◀';
    } else {
        sidebar.classList.add('collapsed');
        btn.style.left    = '0px';
        btn.textContent   = '▶';
    }
}

// ── QUICK QUERY ──────────────────────────────────────────────
function quickQuery(text) {
    document.getElementById('userQuery').value = text;
    sendQuery();
}

// ── NEW CHAT ─────────────────────────────────────────────────
function newChat() {
    chat.innerHTML = `
    <div class="message ai-message">
        <div class="avatar ai-avatar">AI</div>
        <div class="message-content">
            👋 Hello! I'm your AI Financial Analyst.<br>
            Upload a document and ask anything.
        </div>
    </div>`;
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

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    btn.disabled = true;
    statusMsg.textContent = '⏳ Processing document...';
    progress.style.width = '40%';

    try {
        const res  = await fetch('/upload', { method: 'POST', body: formData });
        const data = await res.json();

        progress.style.width = '100%';
        statusMsg.textContent = data.message || '✅ Ready';

        // show KB ready dot
        kbStatus.classList.remove('hidden');

        // update header subtext
        if (docLoaded) {
            docLoaded.textContent =
                (fileInput.files[0]?.name || 'Document') + ' loaded';
        }

        isTrained = true;

    } catch (err) {
        statusMsg.textContent = '❌ Upload failed';
        progress.style.width = '0%';
    }

    btn.disabled = false;
    setTimeout(() => { progress.style.width = '0%'; }, 2000);
}

// ── SEND / ASK ───────────────────────────────────────────────
async function sendQuery() {
    const input = document.getElementById('userQuery');
    const query = input.value.trim();
    if (!query) return;

    // warn if not trained
    if (!isTrained) {
        appendAI('⚠️ Please upload and train on a document first.');
        return;
    }

    // user bubble
    chat.innerHTML += `
    <div class="message user-message">
        <div class="message-content">${escapeHtml(query)}</div>
    </div>`;

    input.value = '';

    // loading bubble
    const loaderId = 'load-' + Date.now();
    chat.innerHTML += `
    <div class="message ai-message" id="${loaderId}">
        <div class="avatar ai-avatar">AI</div>
        <div class="message-content typing">Analyzing</div>
    </div>`;

    scrollToBottom();

    const formData = new FormData();
    formData.append('query', query);

    try {
        const res  = await fetch('/ask', { method: 'POST', body: formData });
        const data = await res.json();

        document.getElementById(loaderId)?.remove();

        const formatted = marked.parse(data.answer || 'No response.');

        // build source tags
        let sourcesHtml = '';
        if (data.sources && data.sources.length > 0) {
            const tags = data.sources
                .map(s => `<span class="source-tag">📄 ${s}</span>`)
                .join('');
            sourcesHtml = `<div class="source-tags">${tags}</div>`;
        }

        chat.innerHTML += `
        <div class="message ai-message">
            <div class="avatar ai-avatar">AI</div>
            <div class="message-content">
                ${formatted}
                ${sourcesHtml}
            </div>
        </div>`;

    } catch (err) {
        document.getElementById(loaderId)?.remove();
        appendAI('❌ Something went wrong. Please try again.');
    }

    scrollToBottom();
}

// ── HELPERS ──────────────────────────────────────────────────
function appendAI(text) {
    chat.innerHTML += `
    <div class="message ai-message">
        <div class="avatar ai-avatar">AI</div>
        <div class="message-content">${text}</div>
    </div>`;
    scrollToBottom();
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ── DRAG & DROP ──────────────────────────────────────────────
const dragArea = document.getElementById('dragArea');

if (dragArea) {
    dragArea.addEventListener('dragover', e => {
        e.preventDefault();
        dragArea.style.background = 'rgba(16,163,127,0.1)';
        dragArea.style.borderColor = 'rgba(16,163,127,0.7)';
    });

    dragArea.addEventListener('dragleave', () => {
        dragArea.style.background = '';
        dragArea.style.borderColor = '';
    });

    dragArea.addEventListener('drop', e => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            document.getElementById('pdfFile').files = files;
            document.getElementById('fileName').textContent = files[0].name;
        }
        dragArea.style.background = '';
        dragArea.style.borderColor = '';
    });
}