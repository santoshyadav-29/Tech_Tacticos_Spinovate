// Sidebar.tsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  FiMenu,
  FiSearch,
  FiHome,
  FiCamera,
  FiActivity,
  FiBookOpen,
} from "react-icons/fi";
import Link from "next/link";

const sidebarLinks = [
  { name: "Dashboard", href: "/dashboard", icon: <FiHome /> },
  { name: "Scan", href: "/dashboard/posture", icon: <FiCamera /> },
  { name: "Excercise", href: "/dashboard/excercise", icon: <FiActivity /> },
  { name: "Guide", href: "/dashboard/guide", icon: <FiBookOpen /> },
];

const Sidebar = () => {
  const [open, setOpen] = useState(true);

  // Keyboard shortcut: K to toggle sidebar (must be focused on the window)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "k" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      setOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <aside
      className={`bg-gradient-to-br from-[#eaf3fb] via-[#f4faff] to-[#eafaf1] text-[#0d3b66] min-h-screen fixed z-50 shadow-lg flex flex-col transition-all duration-300 ${
        open ? "w-64" : "w-20"
      }`}
      aria-label="Sidebar navigation"
    >
      {/* Top section with logo and menu button */}
      <div className="flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <span className="bg-[#27a1ff] rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold text-white">
            S
          </span>
          {open && (
            <span className="text-xl font-bold tracking-wide text-[#0d3b66]">
              Spinovate
            </span>
          )}
        </div>
        <button
          aria-label={open ? "Close sidebar" : "Open sidebar"}
          onClick={() => setOpen((v) => !v)}
          className="text-xl p-2 rounded hover:bg-[#eaf3fb] transition text-[#0d3b66]"
        >
          <FiMenu />
        </button>
      </div>

      {/* Search bar */}
      <div
        className={`flex items-center bg-white/80 mx-3 rounded-md px-3 py-2 mb-4 transition-all ${
          open ? "w-auto" : "w-10 mx-auto"
        }`}
      >
        <FiSearch className="text-lg text-[#27a1ff]" />
        {open && (
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent outline-none ml-2 text-sm w-full placeholder:text-[#b2b8d6] text-[#0d3b66]"
          />
        )}
      </div>

      {/* Navigation links */}
      <nav className="flex-1 flex flex-col gap-1">
        {sidebarLinks.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            className={`flex items-center gap-4 px-4 py-3 mx-2 rounded-lg font-medium transition-colors duration-200 hover:bg-[#eaf3fb] focus:outline-none focus:bg-[#eaf3fb] ${
              open ? "" : "justify-center"
            }`}
          >
            <span className="text-xl text-[#27a1ff]">{link.icon}</span>
            {open && <span className="text-base">{link.name}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
