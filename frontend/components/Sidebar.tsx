// Sidebar.tsx
"use client";
import React, { useState } from "react";
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

  return (
    <aside
      className={`bg-[#181c2f] text-white min-h-screen fixed z-50 shadow-lg flex flex-col transition-all duration-300 ${
        open ? "w-64" : "w-20"
      }`}
      aria-label="Sidebar navigation"
    >
      {/* Top section with logo and menu button */}
      <div className="flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <span className="bg-[#27a1ff] rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold">
            S
          </span>
          {open && (
            <span className="text-xl font-bold tracking-wide">Spinovate</span>
          )}
        </div>
        <button
          aria-label={open ? "Close sidebar" : "Open sidebar"}
          onClick={() => setOpen((v) => !v)}
          className="text-xl p-2 rounded hover:bg-[#23263a] transition"
        >
          <FiMenu />
        </button>
      </div>

      {/* Search bar */}
      <div
        className={`flex items-center bg-[#23263a] mx-3 rounded-md px-3 py-2 mb-4 transition-all ${
          open ? "w-auto" : "w-10 mx-auto"
        }`}
      >
        <FiSearch className="text-lg" />
        {open && (
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent outline-none ml-2 text-sm w-full placeholder:text-[#b2b8d6] text-white"
          />
        )}
      </div>

      {/* Navigation links */}
      <nav className="flex-1 flex flex-col gap-1">
        {sidebarLinks.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            className={`flex items-center gap-4 px-4 py-3 mx-2 rounded-lg font-medium transition-colors duration-200 hover:bg-[#23263a] focus:outline-none focus:bg-[#23263a] ${
              open ? "" : "justify-center"
            }`}
          >
            <span className="text-xl">{link.icon}</span>
            {open && <span className="text-base">{link.name}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
