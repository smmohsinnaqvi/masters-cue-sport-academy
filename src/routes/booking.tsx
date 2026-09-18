import { createFileRoute } from "@tanstack/react-router";

import { BookingEngine } from "@/components/booking-engine";
import { ACADEMY } from "@/lib/academy";

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: `Book a Table | ${ACADEMY.name}` },
      {
        name: "description",
        content:
          "Pick a date, a session length and a table off the floor map. Booking takes only your name and phone number.",
      },
      { property: "og:title", content: `Book a Table | ${ACADEMY.name}` },
      {
        property: "og:description",
        content: "Real-time snooker and pool table booking with a live floor map.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BookingPage,
});

function BookingPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold sm:text-4xl">Book a table</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        Like picking a seat on a bus — choose your date and session length, tap a table on the floor
        plan, then set any start time you want. The timeline shows what's already booked.
      </p>
      <div className="mt-8">
        <BookingEngine />
      </div>
    </main>
  );
}
