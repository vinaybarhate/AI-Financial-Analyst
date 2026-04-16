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

    # ── top-k kept at 4 to avoid memory issues on Render free tier
    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

    # ── format last 4 turns of chat history safely
    history_text = ""
    if chat_history:
        recent = chat_history[-4:]
        history_text = "\n".join(
            f"User: {turn['q']}\nAssistant: {turn['a']}"
            for turn in recent
        )

    prompt = ChatPromptTemplate.from_template("""
You are a Senior Financial Analyst AI assistant.

Your job is to analyze financial documents and respond in a clear, structured format.

RESPONSE RULES:
- Always use bullet points for lists
- Bold key numbers using **number** markdown syntax
- Separate sections with a blank line
- Keep answers concise but complete
- If information is not in the document, say "Not found in the document"
- Never hallucinate data

RECENT CONVERSATION:
{chat_history}

DOCUMENT CONTEXT:
{context}

USER QUESTION:
{input}

STRUCTURED ANSWER:
""")

    document_chain = create_stuff_documents_chain(llm, prompt)
    qa_chain = create_retrieval_chain(retriever, document_chain)

    return qa_chain, history_text