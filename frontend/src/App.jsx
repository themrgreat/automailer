import { useState } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import ImportPage from "./pages/ImportPage";
import BatchWorkflow from "./pages/BatchWorkflow";
import AiProviders from "./pages/AiProviders";
import MailProviders from "./pages/MailProviders";
import { ToastProvider } from "./components/Toast";

export default function App() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <ToastProvider>
      <HashRouter>
        <div className="layout">
          <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
          <div className="layout-main">
            <header className="topbar">
              <button className="topbar-menu-btn" onClick={() => setNavOpen(true)} aria-label="Open navigation">
                <Menu size={20} />
              </button>
              <div className="topbar-title">AI Bulk Email</div>
            </header>
            <div className="app-shell">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/import" element={<ImportPage />} />
                <Route path="/batches/:batchId" element={<BatchWorkflow />} />
                <Route path="/settings/ai-providers" element={<AiProviders />} />
                <Route path="/settings/mail-providers" element={<MailProviders />} />
              </Routes>
            </div>
          </div>
        </div>
      </HashRouter>
    </ToastProvider>
  );
}
