# AI Financial Analyst

An AI-powered Financial Analyst application that uses Retrieval-Augmented Generation (RAG) to analyze financial documents and answer user queries intelligently.

## Overview

This project enables users to upload financial documents and interact with them through a conversational AI interface. The system processes documents, creates vector embeddings, stores them in a FAISS vector database, and retrieves relevant information to generate accurate responses.

## Features

- Financial document analysis
- PDF document processing
- Intelligent document chunking
- Vector embeddings generation
- FAISS vector database integration
- Retrieval-Augmented Generation (RAG)
- Interactive web interface
- Context-aware question answering
- Docker support for deployment

## Tech Stack

### Programming Language
- Python

### AI & Machine Learning
- LangChain
- FAISS
- Sentence Transformers
- Large Language Models (LLMs)

### Frontend
- HTML
- CSS

### Deployment
- Docker

## Project Structure

```
AI-Financial-Analyst/
│
├── app.py                 # Main application
├── main.py                # Application entry point
├── data_ingestion.py      # Document loading and processing
├── chunking.py            # Text chunking logic
├── embedding.py           # Embedding generation
├── documents.pdf          # Sample financial document
├── index.html             # Frontend interface
├── Dockerfile             # Docker configuration
├── requirements.txt       # Dependencies
└── static/                # Static assets
```

## How It Works

1. Upload financial documents.
2. Extract text from PDF files.
3. Split text into manageable chunks.
4. Generate vector embeddings.
5. Store embeddings in FAISS.
6. Retrieve relevant context based on user queries.
7. Generate AI-powered responses using retrieved information.

## Installation

### Clone the Repository

```bash
git clone https://github.com/vinaybarhate/AI-Financial-Analyst.git
cd AI-Financial-Analyst
```

### Create Virtual Environment

```bash
python -m venv venv
```

### Activate Environment

Windows:

```bash
venv\Scripts\activate
```

Linux/Mac:

```bash
source venv/bin/activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

## Run the Application

```bash
python app.py
```

or

```bash
python main.py
```

## Docker Setup

Build Docker Image:

```bash
docker build -t ai-financial-analyst .
```

Run Container:

```bash
docker run -p 8501:8501 ai-financial-analyst
```

## Future Improvements

- Multi-document support
- Financial report summarization
- Stock market insights
- Advanced analytics dashboard
- Real-time financial data integration
- Enhanced RAG pipeline

## Author

**Vinay Barhate**

B.Tech – Artificial Intelligence & Data Science

LinkedIn: https://www.linkedin.com/in/vinay-barhate

GitHub: https://github.com/vinaybarhate

---

⭐ If you found this project useful, consider giving it a star.
