import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useBootstrapSession } from "../hooks/useBootstrapSession";
import { AccountPage } from "../routes/AccountPage";
import { LandingPage } from "../routes/LandingPage";
import { ReplayPage } from "../routes/ReplayPage";
import { SimulationPage } from "../routes/SimulationPage";

export default function App() {
  useBootstrapSession();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<SimulationPage />} />
        <Route path="/replay/local" element={<ReplayPage />} />
        <Route path="/replay/:token" element={<ReplayPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
