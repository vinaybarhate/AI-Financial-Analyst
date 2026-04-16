const chatBox = document.getElementById('chatBox');
let activeChatKey = "general_chat";

// Auto-scroll logic
function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ── LOCAL STORAGE PERSISTENCE ──
function saveChat() {
    localStorage.setItem(activeChatKey, chatBox.innerHTML);
}

function loadChat(key) {
    activeChatKey = key;
    const saved = localStorage.getItem(key);
    chatBox.innerHTML = saved || '<div class="message ai-message">Chat history cleared. How can I help?</div>';
    scrollToBottom();
}

async function sendQuery() {
    const input = document.getElementById('userQuery');
    const query = input.value.trim();
    if (!query) return;

    // Append User Message
    chatBox.innerHTML += `<div class="message user-message"><div class="message-content">${query}</div></div>`;
    input.value = '';

    // Typing Indicator
    const loaderId = 'loader-' + Date.now();
    chatBox.innerHTML += `
        <div class="message ai-message" id="${loaderId}">
            <div class="typing-indicator"><span></span><span></span><span></span></div>
        </div>`;
    scrollToBottom();

    const formData = new FormData();
    formData.append('query', query);

    const res = await fetch('/ask', { method: 'POST', body: formData });
    const data = await res.json();

    document.getElementById(loaderId).remove();

    // Compact Source Cards
    let sourceHtml = '';
    if(data.sources && data.sources.length > 0) {
        sourceHtml = `<div class="source-cards-wrap"><div class="source-cards">`;
        data.sources.forEach((s, i) => {
            sourceHtml += `
                <div class="source-card">
                    <div class="source-card-title">📄 ${s}</div>
                    <div class="source-card-preview">"${data.previews[i]}..."</div>
                </div>`;
        });
        sourceHtml += `</div></div>`;
    }

    chatBox.innerHTML += `
        <div class="message ai-message">
            <div class="message-content">
                ${marked.parse(data.answer)}
                ${sourceHtml}
            </div>
        </div>`;
    
    saveChat();
    scrollToBottom();
}

// ── REFRESH DOC LIST ──
function updateDocSidebar(docs) {
    const list = document.getElementById('docList');
    list.innerHTML = '';
    docs.forEach(doc => {
        const div = document.createElement('div');
        div.className = 'doc-item';
        div.innerHTML = `📄 ${doc}`;
        div.onclick = () => loadChat('chat_' + doc);
        list.appendChild(div);
    });
    document.getElementById('docListSection').style.display = 'block';
}