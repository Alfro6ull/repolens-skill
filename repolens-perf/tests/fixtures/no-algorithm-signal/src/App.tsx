import { Route } from "react-router-dom";
import { StatusPage } from "./pages/StatusPage";

export function App() {
  return <Route path="/status" element={<StatusPage />} />;
}
