import os
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from data_ingestion import load_pdf
from chunking import split_docs
from embedding import embed_and_store
from main import get_qa_chain

app = FastAPI()

# Global State
app.state.vector_store = None
app.state.chat_history = []
app.state.loaded_docs = []

@app.post("/upload")
async def handle_upload(file: UploadFile = File(...)):
    temp_path = f"/tmp/{file.filename}"
    try:
        with open(temp_path, "wb") as f:
            f.write(await file.read())

        docs = load_pdf(temp_path)
        chunks = split_docs(docs)

        # ── RENDER MEMORY GUARD ──
        # Cap chunks to avoid 512MB RAM overflow
        if len(chunks) > 100:
            chunks = chunks[:100]

        new_store = embed_and_store(chunks)

        # ── MULTI-DOC MERGE ──
        if app.state.vector_store is None:
            app.state.vector_store = new_store
        else:
            app.state.vector_store.merge_from(new_store)

        if file.filename not in app.state.loaded_docs:
            app.state.loaded_docs.append(file.filename)

        return {"status": "Success", "docs": app.state.loaded_docs}
    finally:
        if os.path.exists(temp_path): os.remove(temp_path)

@app.post("/ask")
async def ask_question(query: str = Form(...)):
    if not app.state.vector_store:
        return {"answer": "Please upload a document first."}

    # Pass last 5 messages for memory
    qa_chain, _ = get_qa_chain(app.state.vector_store, app.state.chat_history[-5:])
    
    result = qa_chain.invoke({"input": query, "chat_history": app.state.chat_history})
    
    answer = result["answer"]
    app.state.chat_history.append({"q": query, "a": answer})

    # Prepare compact sources
    sources = []
    previews = []
    for doc in result.get("context", []):
        name = os.path.basename(doc.metadata.get("source", "Doc"))
        page = doc.metadata.get("page", "-")
        sources.append(f"{name} (p. {page})")
        previews.append(doc.page_content[:90])

    return {"answer": answer, "sources": sources, "previews": previews}