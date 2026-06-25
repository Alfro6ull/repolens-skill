export async function searchWorks(query: string, tags: string[] = []) {
  const params = new URLSearchParams({
    q: query,
    tags: tags.join(","),
    limit: "20",
  });
  const response = await fetch(`/api/discover/works?${params.toString()}`);
  return response.json();
}
