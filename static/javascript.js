const chat = document.getElementById('chatBox');
let sidebarOpen = true;

// FILE SELECT
document.getElementById('pdfFile').addEventListener('change', function () {
    const file = this.files[0];
    document.getElementById('fileName').textContent =
        file ? file.name : 'No file selected';
});

// ENTER KEY
function handleEnter(e) {
    if (e.key === 'Enter') sendQuery();
}

// SCROLL
function scrollToBottom() {
    chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
}

// THEME
function toggleTheme() {
    document.body.classList.toggle('dark');
}

// SIDEBAR
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const btn = document.getElementById('edgeBtn');

    sidebarOpen = !sidebarOpen;

    if (sidebarOpen) {
        sidebar.classList.remove('collapsed');
        btn.style.left = 'var(--sidebar-w)';
        btn.textContent = '◀';
    } else {
        sidebar.classList.add('collapsed');
        btn.style.left = '0px';
        btn.textContent = '▶';
    }
}

// QUICK QUERY
function quickQuery(text) {
    document.getElementById('userQuery').value = text;
    sendQuery();
}

// NEW CHAT
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

// UPLOAD
async function uploadDoc() {
    const fileInput = document.getElementById('pdfFile');
    const statusMsg = document.getElementById('uploadStatus');
    const btn = document.getElementById('processBtn');
    const progress = document.getElementById('progressFill');
    const kbStatus = document.getElementById('kbStatus');
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
        const res = await fetch('/upload', { method: 'POST', body: formData });
        const data = await res.json();

        console.log("UPLOAD RESPONSE:", data);

        progress.style.width = '100%';
        statusMsg.textContent = data.message || '✅ Ready';

        kbStatus.classList.remove('hidden');

        if (docLoaded) {
            docLoaded.textContent =
                (fileInput.files[0]?.name || 'Document') + ' loaded';
        }

    } catch (err) {
        console.error(err);
        statusMsg.textContent = '❌ Upload failed';
        progress.style.width = '0%';
    }

    btn.disabled = false;
    setTimeout(() => { progress.style.width = '0%'; }, 2000);
}

// ASK (FIXED)
async function sendQuery() {
    const input = document.getElementById('userQuery');
    const query = input.value.trim();
    if (!query) return;

    chat.innerHTML += `
    <div class="message user-message">
        <div class="message-content">${escapeHtml(query)}</div>
    </div>`;

    input.value = '';

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
        const res = await fetch('/ask', { method: 'POST', body: formData });
        const data = await res.json();

        console.log("ASK RESPONSE:", data);

        document.getElementById(loaderId)?.remove();

        const formatted = marked.parse(data.answer || 'No response.');

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
        console.error(err);
        document.getElementById(loaderId)?.remove();
        appendAI('❌ Something went wrong. Please try again.');
    }

    scrollToBottom();
}

// HELPERS
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