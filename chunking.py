from langchain_text_splitters import RecursiveCharacterTextSplitter

# def split_docs(documents):
#     text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
#     return text_splitter.split_documents(documents)

def split_docs(docs):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )

    chunks = text_splitter.split_documents(docs)

    print(f"📄 Total chunks before limit: {len(chunks)}")

    # 🔥 LIMIT (VERY IMPORTANT FOR RENDER FREE PLAN)
    MAX_CHUNKS = 80
    chunks = chunks[:MAX_CHUNKS]

    print(f"✅ Using chunks: {len(chunks)}")

    return chunks