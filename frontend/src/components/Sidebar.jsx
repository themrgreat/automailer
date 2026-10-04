import { NavLink } from "react-router-dom";
import { LayoutDashboard, UploadCloud, BrainCircuit, Send, Mail, Settings, X } from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/import", label: "New Import", icon: UploadCloud },
  { to: "/settings/ai-providers", label: "AI Providers", icon: BrainCircuit },
  { to: "/settings/mail-providers", label: "Mail Providers", icon: Send },
  { to: "/settings/admin", label: "Admin Panel", icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && <div className="sidebar-scrim" onClick={onClose} />}
      <aside className={`sidebar${open ? " open" : ""}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">
            <Mail size={18} />
          </span>
          <div>
            <div className="sidebar-brand-title">AI Bulk Email</div>
            <div className="sidebar-brand-sub">Automailer</div>
          </div>
          <button className="sidebar-close" onClick={onClose} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
              onClick={onClose}
            >
              <item.icon size={17} strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer text-sm muted">Import → Template → Generate → Review → Send</div>
      </aside>
    </>
  );
}
