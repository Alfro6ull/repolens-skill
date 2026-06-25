from fastapi import FastAPI, Query

app = FastAPI()


@app.get("/api/discover/works")
def discover_works(
    q: str = "",
    tags: str = "",
    limit: int = Query(20, ge=1, le=50),
):
    selected_tags = {tag for tag in tags.split(",") if tag}
    candidates = content_index()
    filtered = [
        work
        for work in candidates
        if matches_text(q, work) or selected_tags.intersection(work["tags"])
    ]
    ranked = sorted(filtered, key=lambda work: (tag_overlap(selected_tags, work), work["score"]), reverse=True)
    items = [
        {
            "id": work["id"],
            "title": work["title"],
            "authorName": work["author_name"],
            "tags": work["tags"],
            "score": work["score"],
            "coverUrl": work["cover_url"],
        }
        for work in ranked[:limit]
    ]
    return {
        "items": items,
        "query": q,
        "rankingSignals": ["tag_overlap", "score"],
    }


def matches_text(query, work):
    normalized = query.lower()
    return normalized in work["title"].lower() or normalized in " ".join(work["tags"])


def tag_overlap(selected_tags, work):
    return len(selected_tags.intersection(work["tags"]))


def content_index():
    return [
        {
            "id": "work-1",
            "title": "Portrait in oil",
            "author_name": "Ada",
            "tags": ["oil", "portrait", "featured"],
            "score": 0.91,
            "cover_url": "/covers/1.png",
        },
        {
            "id": "work-2",
            "title": "Modern city study",
            "author_name": "Lin",
            "tags": ["urban", "sketch"],
            "score": 0.73,
            "cover_url": "/covers/2.png",
        },
    ]
