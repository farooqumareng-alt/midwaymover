import type { Metadata } from "next";
import { StaffLogin } from "../../../components/staff/StaffLogin.tsx";

export const metadata: Metadata = {
  title: "Staff Sign In — Midway Mover",
  robots: { index: false, follow: false },
};

export default function StaffLoginPage() {
  return <StaffLogin />;
}
