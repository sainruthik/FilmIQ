"""Unit tests for the hand-rolled reciprocal rank fusion and job-id check."""
import uuid

from langchain_core.documents import Document

from api.routes.analyze import _is_uuid4
from pipeline.rag import _fuse


def _docs(*texts: str) -> list[Document]:
    return [Document(page_content=t) for t in texts]


class TestFuse:
    def test_doc_found_by_both_retrievers_ranks_first(self):
        fused = _fuse([_docs("a", "shared"), _docs("shared", "b")], weights=[0.4, 0.6])
        assert fused[0].page_content == "shared"

    def test_duplicates_merge_into_one(self):
        fused = _fuse([_docs("x", "y"), _docs("y", "x")], weights=[0.5, 0.5])
        assert sorted(d.page_content for d in fused) == ["x", "y"]

    def test_weights_break_ties_between_lists(self):
        # Each doc is rank 1 in one list; the heavier list wins.
        fused = _fuse([_docs("bm25"), _docs("dense")], weights=[0.4, 0.6])
        assert [d.page_content for d in fused] == ["dense", "bm25"]

    def test_empty_lists(self):
        assert _fuse([[], []], weights=[0.4, 0.6]) == []


class TestIsUuid4:
    def test_accepts_canonical_any_case(self):
        u = str(uuid.uuid4())
        assert _is_uuid4(u) and _is_uuid4(u.upper())

    def test_rejects_non_canonical_and_other_versions(self):
        u = str(uuid.uuid4())
        for bad in ["abc", u.replace("-", ""), "{" + u + "}", "urn:uuid:" + u, str(uuid.uuid1())]:
            assert not _is_uuid4(bad), bad
