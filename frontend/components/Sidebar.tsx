// Sidebar.tsx
"use client";
import React, { useState } from "react";

const sidebarLinks = [
  { name: "Posture Detection", href: "/dashboard/posture" },
  { name: "Exercises", href: "/dashboard/excercise" },
];

const Sidebar = () => {
  const [open, setOpen] = useState(true);
  return (
    <aside
      className={`bg-[#0d3b66] text-white min-h-screen fixed z-50 shadow-lg flex flex-col transition-all duration-300 ${
        open ? "w-56" : "w-16"
      } items-${open ? "start" : "center"}`}
      aria-label="Sidebar navigation"
    >
      <button
        aria-label={open ? "Close sidebar" : "Open sidebar"}
        onClick={() => setOpen((v) => !v)}
        className={`bg-[#3fb68b] text-white border-none m-4 rounded p-2 cursor-pointer self-${
          open ? "end" : "center"
        } focus:outline-none focus:ring-2 focus:ring-[#3fb68b]`}
      >
        {open ? "⏴" : "⏵"}
      </button>
      <nav className="w-full">
        {sidebarLinks.map((link) => (
          <a
            key={link.name}
            href={link.href}
            className={`block rounded font-medium mx-2 my-1 transition-colors duration-200 focus:outline-none focus:bg-[#144e7a] hover:bg-[#144e7a] ${
              open ? "px-6 py-3" : "px-2 py-3"
            } text-white`}
            tabIndex={0}
          >
            {open ? link.name : link.name[0]}
          </a>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
