# import os
# import time
# from dotenv import load_dotenv

# from pinecone import Pinecone, ServerlessSpec
# from langchain_huggingface import HuggingFaceEmbeddings
# from langchain_pinecone import PineconeVectorStore

# # Load environment variables
# load_dotenv()


# def embed_and_store(chunks):
#     api_key = os.getenv("PINECONE_API_KEY")
#     index_name = "multi-query-rag-index"

#     pc = Pinecone(api_key=api_key)

#     # ✅ GET EXISTING INDEXES
#     existing_indexes = [index.name for index in pc.list_indexes()]

#     # 🔥 FIX: DELETE OLD INDEX (PREVENT DATA MIXING)
#     if index_name in existing_indexes:
#         print("Deleting old index (fresh upload)...")
#         pc.delete_index(index_name)
#         time.sleep(2)  # small wait to ensure deletion

#     # ✅ CREATE NEW INDEX
#     print(f"Creating new index: {index_name}")
#     pc.create_index(
#         name=index_name,
#         dimension=384,
#         metric="cosine",
#         spec=ServerlessSpec(cloud="aws", region="us-east-1")
#     )

#     # ✅ WAIT UNTIL READY
#     while True:
#         status = pc.describe_index(index_name).status
#         if status.get("ready"):
#             break
#         time.sleep(1)

#     # ✅ EMBEDDINGS
#     embeddings = HuggingFaceEmbeddings(
#         model_name="sentence-transformers/all-MiniLM-L6-v2"
#     )

#     # ✅ STORE DOCUMENTS
#     vectorstore = PineconeVectorStore.from_documents(
#         documents=chunks,
#         embedding=embeddings,
#         index_name=index_name
#     )

#     return vectorstore


from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings


def embed_and_store(chunks):

    # ✅ Local embedding model (no API needed)
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    # ✅ Store locally using FAISS
    vectorstore = FAISS.from_documents(chunks, embeddings)

    return vectorstore