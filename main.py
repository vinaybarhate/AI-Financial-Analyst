import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq

from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# 🔥 FIX: ensure API key exists
if not GROQ_API_KEY:
    raise ValueError("❌ GROQ_API_KEY not set")


def get_qa_chain(vectorstore):

    llm = ChatGroq(
        model_name="llama-3.3-70b-versatile",
        temperature=0.1,
        groq_api_key=GROQ_API_KEY
    )

    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

    # ✅ Professional prompt
    prompt = ChatPromptTemplate.from_template("""
You are a Senior Financial Analyst AI assistant.

Your job is to analyze financial documents and provide clear, structured insights.

Instructions:
- Use bullet points when helpful
- Be precise and factual
- Do NOT hallucinate
- If information is missing, say so clearly
- Highlight key numbers and impacts

Context:
{context}

Question:
{input}

Answer:
""")

    document_chain = create_stuff_documents_chain(llm, prompt)
    qa_chain = create_retrieval_chain(retriever, document_chain)

    return qa_chain