// layout.tsx
import React from "react";
import Sidebar from "../../components/Sidebar";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-[#f4faff]">
      <Sidebar />
      <main
        className="flex-1 p-8 transition-all duration-300 ease-in-out"
        style={{
          marginLeft: "var(--sidebar-width, 5rem)",
        }}
      >
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
