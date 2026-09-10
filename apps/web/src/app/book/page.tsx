import type { Metadata } from "next";
import { BookingFlow } from "../../components/booking/BookingFlow.tsx";

export const metadata: Metadata = {
  title: "Book a Pickup — Midway Mover",
  description: "Book a private, dedicated pickup in three steps.",
};

export default function BookPage() {
  return <BookingFlow />;
}
