import os
from langchain_groq import ChatGroq

from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("❌ GROQ_API_KEY not set in environment variables")


def get_qa_chain(vectorstore, chat_history=None):

    llm = ChatGroq(
        model_name="llama-3.3-70b-versatile",
        temperature=0.1,
        groq_api_key=GROQ_API_KEY
    )

    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})  # optimized

    prompt = ChatPromptTemplate.from_template("""
You are a Senior Financial Analyst AI.

You analyze financial documents and respond in a professional format.

Rules:
- Use bullet points
- Highlight key numbers
- Be factual only
- If missing → clearly say "Not available"
- Keep answers structured

Chat History:
{chat_history}

Context:
{context}

Question:
{input}

Answer:
""")

    document_chain = create_stuff_documents_chain(llm, prompt)
    qa_chain = create_retrieval_chain(retriever, document_chain)

    return qa_chain