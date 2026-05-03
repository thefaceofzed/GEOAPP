import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useBootstrapSession } from "../hooks/useBootstrapSession";
import { DashboardLayout } from "../components/DashboardLayout";
import { LandingPage } from "../routes/LandingPage";
import "../store/themeStore";

const SimulationPage = lazy(() => import("../routes/SimulationPage").then((m) => ({ default: m.SimulationPage })));
const IntelligencePage = lazy(() => import("../routes/IntelligencePage").then((m) => ({ default: m.IntelligencePage })));
const BriefingsPage = lazy(() => import("../routes/BriefingsPage").then((m) => ({ default: m.BriefingsPage })));
const ReplayPage = lazy(() => import("../routes/ReplayPage").then((m) => ({ default: m.ReplayPage })));
const AccountPage = lazy(() => import("../routes/AccountPage").then((m) => ({ default: m.AccountPage })));
const ComparePage = lazy(() => import("../routes/ComparePage").then((m) => ({ default: m.ComparePage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );
}

export default function App() {
  useBootstrapSession();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<DashboardLayout />}>
          <Route path="/app" element={<Suspense fallback={<PageLoader />}><SimulationPage /></Suspense>} />
          <Route path="/intelligence" element={<Suspense fallback={<PageLoader />}><IntelligencePage /></Suspense>} />
          <Route path="/briefings" element={<Suspense fallback={<PageLoader />}><BriefingsPage /></Suspense>} />
          <Route path="/replay/local" element={<Suspense fallback={<PageLoader />}><ReplayPage /></Suspense>} />
          <Route path="/replay/:token" element={<Suspense fallback={<PageLoader />}><ReplayPage /></Suspense>} />
          <Route path="/account" element={<Suspense fallback={<PageLoader />}><AccountPage /></Suspense>} />
          <Route path="/compare" element={<Suspense fallback={<PageLoader />}><ComparePage /></Suspense>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
