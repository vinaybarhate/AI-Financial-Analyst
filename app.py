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
    # 🔥 FIX: absolute path for index.html
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
        chunks = split_docs(docs)

        # ✅ STORE IN FASTAPI STATE
        app.state.vector_store = embed_and_store(chunks)

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


# 🔥 ASK ROUTE
@app.post("/ask")
async def ask_question(query: str = Form(...)):

    print("💬 Query:", query)

    # ✅ Check if vector store exists
    if not hasattr(app.state, "vector_store"):
        return {
            "answer": "System Error: Knowledge base not initialized. Please upload a document first.",
            "sources": []
        }

    # 🔥 Handle greetings / small talk
    query_clean = query.lower().strip()
    small_talk = ["hi", "hello", "hey", "good morning", "good evening"]

    if any(word in query_clean for word in small_talk):
        return {
            "answer": "Hello! 👋 I’m your AI Financial Analyst.\n\n📄 Upload a financial document and ask questions to get insights.",
            "sources": []
        }

    # 🔥 NORMAL RAG FLOW
    qa = get_qa_chain(app.state.vector_store)

    try:
        result = qa.invoke({"input": query})

        sources = []
        if "context" in result:
            for doc in result["context"]:
                source_name = doc.metadata.get("source", "Reference Document")
                sources.append(os.path.basename(source_name))

        return {
            "answer": result.get("answer", "No response generated."),
            "sources": list(set(sources))
        }

    except Exception as e:
        print(f"❌ ASK ERROR: {e}")
        return {
            "answer": "I apologize, but I encountered a technical issue while processing your request.",
            "sources": []
        }


# --- EXECUTION ---
if __name__ == "__main__":
    # 🔥 REQUIRED for Render
    port = int(os.environ.get("PORT", 8000))

    uvicorn.run("app:app", host="0.0.0.0", port=port)