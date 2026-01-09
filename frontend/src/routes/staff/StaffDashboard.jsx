import { useState } from "react";
import Sidebar from "../components/Sidebar";

export default function StaffDashboard() {
  const [role] = useState("staff");

  return (
    <div className="flex">
      <Sidebar role={role} />
    </div>
  );
}