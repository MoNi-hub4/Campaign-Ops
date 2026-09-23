import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Ticket,
  Layers,
  Search,
  X,
  Sparkles,
  MessageSquareText,
} from "lucide-react";

export default function Sidebar({ isMobileOpen, setIsMobileOpen }) {
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Daily Chat Review", path: "/chat-review", icon: MessageSquareText },
    { name: "Coupons", path: "/coupons", icon: Ticket },
    { name: "Workstream Templates", path: "/workstreams", icon: Layers },
    { name: "Website Scanner", path: "/scanner", icon: Search },
    { name: "Preflight Scanner", path: "/preflight", icon: Sparkles },
  ];

  const handleLinkClick = () => {
    if (typeof setIsMobileOpen === "function") {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 lg:hidden"
          onClick={handleLinkClick}
        />
      )}

      <aside
        className={`
        fixed lg:static top-0 left-0 bottom-0 z-50
        w-64 bg-white border-r border-gray-200/80 flex flex-col justify-between p-6
        transition-transform duration-200 ease-in-out
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <div>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gray-950 text-yellow-400 flex items-center justify-center font-bold text-sm shadow-xs">
                C
              </div>
              <span className="font-bold text-base text-gray-950 tracking-tight">
                Campaign Ops
              </span>
            </div>
            <button
              onClick={handleLinkClick}
              className="lg:hidden p-1 text-gray-400 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={handleLinkClick}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-yellow-400 text-gray-950 shadow-2xs"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${isActive ? "text-gray-950" : "text-gray-400"}`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}