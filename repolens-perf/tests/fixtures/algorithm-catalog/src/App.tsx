import { Route } from "react-router-dom";
import { DiscoverPage } from "./pages/DiscoverPage";

export function App() {
  return <Route path="/discover" element={<DiscoverPage />} />;
}
