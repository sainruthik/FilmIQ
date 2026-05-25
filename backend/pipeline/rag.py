from typing import Callable

import litellm
from langchain_classic.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever

from config import settings

SYSTEM_PROMPT = """You are a senior film acquisitions analyst at a streaming platform.
Answer using ONLY the context provided below.
Every factual claim must include a PDF source label like [PDF p.1].
If the context does not contain enough information, say: "Not enough data in the documents."
Do not speculate or use outside knowledge. Be concise and factual."""


def _format_docs(docs: list) -> str:
    return "\n\n---\n\n".join(
        f"[PDF p.{int(d.metadata.get('page', 0)) + 1}]\n{d.page_content}"
        for d in docs
    )


def build_rag_chain(vector_store, chunks: list) -> Callable[[str], str]:
    bm25 = BM25Retriever.from_documents(chunks, k=5)
    dense = vector_store.as_retriever(search_kwargs={"k": 5})

    retriever = EnsembleRetriever(
        retrievers=[bm25, dense],
        weights=[0.4, 0.6],
        c=60,
    )

    def invoke(question: str) -> str:
        docs = retriever.invoke(question)
        context = _format_docs(docs)
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"},
        ]
        resp = litellm.completion(
            model=f"openai/{settings.openai_worker_model}",
            api_key=settings.openai_api_key,
            messages=messages,
            temperature=0.1,
            max_tokens=1024,
        )
        return resp.choices[0].message.content

    return invoke
