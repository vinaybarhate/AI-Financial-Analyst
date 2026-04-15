import os
import uvicorn

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

# Custom modules
from data_ingestion import load_pdf
from chunking import split_docs
from embedding import embed_and_store
from main import get_qa_chain


# --- INITIALIZATION ---
app = FastAPI()

# ADD THIS AT TOP
app.state.vector_store = None
app.state.chat_history = []

# ✅ Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔥 FIX: absolute path (important for deployment)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Static files
app.mount(
    "/static",
    StaticFiles(directory=os.path.join(BASE_DIR, "static")),
    name="static"
)

# --- ROUTES ---

@app.get("/")
async def serve_ui():
    return FileResponse(os.path.join(BASE_DIR, "index.html"))


# 🔥 UPLOAD ROUTE
@app.post("/upload")
async def handle_upload(file: UploadFile = File(...)):
    temp_path = f"/tmp/temp_{file.filename}"

    try:
        contents = await file.read()

        with open(temp_path, "wb") as f:
            f.write(contents)

        docs = load_pdf(temp_path)
        print(f"📄 Document loaded with {len(docs)} pages")

        chunks = split_docs(docs)

        # 🔥 EXTRA SAFETY LIMIT
        if len(chunks) > 80:
            chunks = chunks[:80]

        new_store = embed_and_store(chunks)

        # ✅ MULTI DOCUMENT SUPPORT (MERGE)
        if app.state.vector_store:
            app.state.vector_store.add_documents(chunks)
        else:
            app.state.vector_store = new_store

        if os.path.exists(temp_path):
            os.remove(temp_path)

        print("✅ File processed:", file.filename)

        return {
            "status": "Success",
            "message": "Knowledge Base Ready! You may now begin your analysis."
        }

    except Exception as e:
        print("❌ UPLOAD ERROR:", e)
        return {
            "status": "Error",
            "message": str(e)
        }


# 🔥 ASK ROUTE (UPDATED UX)
@app.post("/ask")
async def ask_question(query: str = Form(...)):

    print("💬 Query:", query)
    query_clean = query.lower().strip()

    small_talk = ["hi", "hello", "hey", "good morning", "good evening"]

    if any(word in query_clean for word in small_talk):
        return {
            "answer": "Hey 👋\n\nPlease upload a document first so I can analyze it.",
            "sources": []
        }

    if not app.state.vector_store:
        return {
            "answer": "Please upload a document 📄 first.",
            "sources": []
        }

    qa = get_qa_chain(app.state.vector_store, app.state.chat_history)

    try:
        result = qa.invoke({
            "input": query,
            "chat_history": str(app.state.chat_history[-5:])
        })

        # ✅ STORE MEMORY
        app.state.chat_history.append({"q": query, "a": result["answer"]})

        sources = []
        previews = []

        if "context" in result:
            for doc in result["context"]:
                source = os.path.basename(doc.metadata.get("source", "doc"))
                page = doc.metadata.get("page", "N/A")
                preview = doc.page_content[:120]

                sources.append(f"{source} (p.{page})")
                previews.append(preview)

        return {
            "answer": result.get("answer", "No response"),
            "sources": list(set(sources)),
            "previews": previews[:3]
        }

    except Exception as e:
        print("❌ ASK ERROR:", e)
        return {
            "answer": "⚠️ Error processing request.",
            "sources": []
        }


# --- EXECUTION ---
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port)


