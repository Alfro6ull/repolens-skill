from fastapi import FastAPI, Query

app = FastAPI()


@app.get("/api/activities/{activity_id}/works")
def activity_works(
    activity_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    all_works = work_rows_for(activity_id)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = all_works[start:end]
    authors_by_id = author_map_for({work["author_id"] for work in page_items})

    items = []
    for work in page_items:
        author = authors_by_id[work["author_id"]]
        items.append(
            {
                "id": work["id"],
                "title": work["title"],
                "authorName": author["name"],
                "coverUrl": work["cover_url"],
            },
        )

    return {
        "items": items,
        "page": page,
        "pageSize": page_size,
        "hasMore": end < len(all_works),
    }


def work_rows_for(activity_id: str):
    rows = []
    for index in range(500):
        rows.append(
            {
                "id": str(index),
                "title": f"{activity_id}-{index}",
                "author_id": str(index),
                "cover_url": "/x.png",
            },
        )
    return rows


def author_map_for(author_ids):
    return {author_id: {"id": author_id, "name": author_id} for author_id in author_ids}
