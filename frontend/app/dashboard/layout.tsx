// layout.tsx
import React from "react";
import Sidebar from "../../components/Sidebar";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f4faff" }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: 32 }}>{children}</main>
    </div>
  );
};

export default DashboardLayout;
