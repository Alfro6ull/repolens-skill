export async function getActivityWorks(id: string, page = 1, pageSize = 20) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  const response = await fetch(`/api/activities/${id}/works?${params.toString()}`);
  return response.json();
}
