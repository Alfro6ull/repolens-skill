from fastapi import FastAPI

app = FastAPI()


@app.get("/api/activities/{activity_id}/works")
def get_activity_works(activity_id: str):
    works = load_all_works(activity_id)
    return [
        {
            "id": work["id"],
            "title": work["title"],
            "authorName": load_author(work["author_id"])["name"],
            "coverUrl": work["cover_url"],
            "tags": work["tags"],
        }
        for work in works
    ]


@app.get("/api/search/works")
def search_works(q: str):
    return [work for work in load_global_work_index() if q in work["title"]]


def load_all_works(activity_id: str):
    return [{"id": str(index), "title": str(index), "author_id": str(index), "cover_url": "/x.png", "tags": []} for index in range(500)]


def load_author(author_id: str):
    return {"id": author_id, "name": author_id}


def load_global_work_index():
    return load_all_works("global")
