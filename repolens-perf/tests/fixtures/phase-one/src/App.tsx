import { ActivityDetailPage } from "./pages/ActivityDetailPage";

export function App() {
  return <Route path="/activity/:id" element={<ActivityDetailPage />} />;
}
