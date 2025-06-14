// Sidebar.tsx (Simplified version)
"use client";
import React, { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  FiMenu,
  FiSearch,
  FiHome,
  FiCamera,
  FiActivity,
  FiBookOpen,
  FiBell,
} from "react-icons/fi";
import Link from "next/link";

const sidebarLinks = [
  { name: "Dashboard", href: "/dashboard", icon: <FiHome /> },
  { name: "Scan", href: "/dashboard/posture", icon: <FiCamera /> },
  { name: "Exercise", href: "/dashboard/excercise", icon: <FiActivity /> },
  { name: "Guide", href: "/dashboard/guide", icon: <FiBookOpen /> },
];

const Sidebar = () => {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "k" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      setOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Update CSS custom property for layout margin
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      open ? "16rem" : "5rem"
    );
  }, [open]);

  return (
    <aside
      className={`bg-gradient-to-br from-[#eaf3fb] via-[#f4faff] to-[#eafaf1] text-[#0d3b66] min-h-screen fixed z-50 shadow-lg flex flex-col transition-all duration-300 ease-in-out ${
        open ? "w-64" : "w-30"
      }`}
      aria-label="Sidebar navigation"
    >
      {/* Top section with logo and menu button */}
      <div className="flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <span className="bg-[#27a1ff] rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold text-white shrink-0 hover:scale-110 transition-transform">
            S
          </span>
          <span
            className={`text-xl font-bold tracking-wide text-[#0d3b66] transition-all duration-300 ${
              open ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
            }`}
          >
            Spinovate
          </span>
        </div>
        <button
          aria-label={open ? "Close sidebar" : "Open sidebar"}
          onClick={() => setOpen((v) => !v)}
          className="text-xl p-3 rounded hover:bg-[#eaf3fb] hover:scale-110 transition-all text-[#0d3b66] shrink-0"
        >
          <FiMenu />
        </button>
      </div>

      

      {/* Navigation links */}
      <nav className="flex-1 flex flex-col gap-1 px-2">
        {sidebarLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-lg font-medium transition-all duration-200 relative group ${
                open ? "" : "justify-center"
              } ${
                isActive
                  ? "bg-[#27a1ff] text-white shadow-md transform scale-105"
                  : "hover:bg-[#eaf3fb] hover:scale-105 focus:outline-none focus:bg-[#eaf3fb]"
              }`}
            >
              <span
                className={`text-xl shrink-0 ${
                  isActive ? "text-white" : "text-[#27a1ff]"
                }`}
              >
                {link.icon}
              </span>
              <span
                className={`text-base transition-all duration-300 ${
                  open ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
                } ${isActive ? "text-white" : ""}`}
              >
                {link.name}
              </span>

              {/* Tooltip for collapsed state */}
              {!open && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {link.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
