import os
import uvicorn

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from data_ingestion import load_pdf
from chunking import split_docs
from embedding import embed_and_store
from main import get_qa_chain

# ── APP INIT ─────────────────────────────────────────────────
app = FastAPI()

# ── STATE ────────────────────────────────────────────────────
app.state.vector_store  = None   # single merged FAISS store
app.state.chat_history  = []     # list of {q, a} dicts (last N kept)
app.state.loaded_docs   = []     # list of uploaded filenames

# ── CORS ─────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── STATIC / PATHS ───────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.mount(
    "/static",
    StaticFiles(directory=os.path.join(BASE_DIR, "static")),
    name="static"
)

# ─────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────

@app.get("/")
async def serve_ui():
    return FileResponse(os.path.join(BASE_DIR, "index.html"))


# ── LIST LOADED DOCS ─────────────────────────────────────────
@app.get("/docs")
async def list_docs():
    """Return list of already-uploaded document names."""
    return {"docs": app.state.loaded_docs}


# ── UPLOAD ───────────────────────────────────────────────────
@app.post("/upload")
async def handle_upload(file: UploadFile = File(...)):
    temp_path = f"/tmp/temp_{file.filename}"

    try:
        contents = await file.read()

        with open(temp_path, "wb") as f:
            f.write(contents)

        docs   = load_pdf(temp_path)
        print(f"📄 {file.filename}: {len(docs)} pages loaded")

        chunks = split_docs(docs)

        # ── Memory guard: cap at 80 chunks per upload on free tier
        if len(chunks) > 80:
            chunks = chunks[:80]
            print(f"⚠️  Chunks capped at 80 for memory safety")

        new_store = embed_and_store(chunks)

        # ── MULTI-DOC: merge into existing store
        if app.state.vector_store is not None:
            app.state.vector_store.merge_from(new_store)
            print(f"🔗 Merged {file.filename} into existing vector store")
        else:
            app.state.vector_store = new_store
            print(f"✅ New vector store created from {file.filename}")

        # ── Track loaded doc names (avoid duplicates)
        if file.filename not in app.state.loaded_docs:
            app.state.loaded_docs.append(file.filename)

        # ── Reset chat history on new doc upload
        app.state.chat_history = []

        if os.path.exists(temp_path):
            os.remove(temp_path)

        return {
            "status":  "Success",
            "message": f"✅ {file.filename} processed. Knowledge base ready!",
            "docs":    app.state.loaded_docs,
        }

    except Exception as e:
        print(f"❌ UPLOAD ERROR: {e}")
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return {"status": "Error", "message": str(e)}


# ── ASK ──────────────────────────────────────────────────────
@app.post("/ask")
async def ask_question(query: str = Form(...)):

    print(f"💬 Query: {query}")
    query_clean = query.lower().strip()

    # ── small talk handler
    small_talk = ["hi", "hello", "hey", "good morning", "good evening", "what's up"]
    if any(word in query_clean for word in small_talk):
        return {
            "answer":   "Hey 👋 I'm your AI Financial Analyst. Upload a PDF and ask me anything about it!",
            "sources":  [],
            "previews": [],
        }

    # ── no document uploaded yet
    if app.state.vector_store is None:
        return {
            "answer":   "📄 Please upload a document first before asking questions.",
            "sources":  [],
            "previews": [],
        }

    try:
        qa_chain, history_text = get_qa_chain(
            app.state.vector_store,
            app.state.chat_history
        )

        result = qa_chain.invoke({
            "input":        query,
            "chat_history": history_text,
        })

        answer = result.get("answer", "No response generated.")

        # ── Keep chat history lean (last 6 turns max → ~512MB safe)
        app.state.chat_history.append({"q": query, "a": answer})
        if len(app.state.chat_history) > 6:
            app.state.chat_history.pop(0)

        # ── Extract sources with page numbers + previews
        sources  = []
        previews = []

        if "context" in result:
            seen = set()
            for doc in result["context"]:
                source  = os.path.basename(doc.metadata.get("source", "document"))
                page    = doc.metadata.get("page", "?")
                label   = f"{source} — p.{page}"
                preview = doc.page_content.strip()[:100]

                if label not in seen:
                    seen.add(label)
                    sources.append(label)
                    previews.append(preview)

        return {
            "answer":   answer,
            "sources":  sources,
            "previews": previews,
        }

    except Exception as e:
        print(f"❌ ASK ERROR: {e}")
        return {
            "answer":   "⚠️ Error processing your request. Please try again.",
            "sources":  [],
            "previews": [],
        }


# ── CLEAR ────────────────────────────────────────────────────
@app.post("/clear")
async def clear_state():
    """Reset vector store and chat history."""
    app.state.vector_store = None
    app.state.chat_history = []
    app.state.loaded_docs  = []
    return {"status": "Cleared"}


# ── RUN ──────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port)