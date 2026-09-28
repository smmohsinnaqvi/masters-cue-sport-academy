import { SiteHeader } from "@/components/layout/site-header";
import { BookingEngine } from "@/components/booking/booking-engine";

export const dynamic = "force-dynamic";

export default function BookingPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-7 sm:px-6 sm:pb-20 sm:pt-10 lg:px-8">
        <h1 className="text-3xl font-bold sm:text-4xl">Book your next game</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Choose a day and table, then set your session length and start time. We&apos;ll calculate
          the end time, and each table&apos;s hourly rate is shown upfront. Today&apos;s past times
          aren&apos;t bookable.
        </p>
        <div className="mt-6 sm:mt-8">
          <BookingEngine initialNow={new Date().toISOString()} />
        </div>
      </main>
    </>
  );
}
