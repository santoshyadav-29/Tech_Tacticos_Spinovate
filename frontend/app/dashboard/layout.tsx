// layout.tsx
import React from "react";
import Sidebar from "../../components/Sidebar";


const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-[#f4faff]">
      <Sidebar />
      {/* Margin left matches sidebar width: w-20 (collapsed) and w-64 (expanded) */}
      <main className="flex-1 ml-20 md:ml-64 p-8 transition-all duration-300">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
