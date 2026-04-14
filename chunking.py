from langchain_text_splitters import RecursiveCharacterTextSplitter

def split_docs(documents):
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    return text_splitter.split_documents(documents)