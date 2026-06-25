export async function getActivityWorks(id: string) {
  const response = await fetch(`/api/activities/${id}/works`);
  return response.json();
}
