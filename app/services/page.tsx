import Link from "next/link";
import { Check } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACADEMY, FACILITIES } from "@/data/academy";
import { formatPrice } from "@/lib/booking";
import { CAFE_MENU, MOCK_COACHING, MOCK_TABLES } from "@/data/mock-data";

export default function ServicesPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold sm:text-4xl">Services & facilities</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Tables, coaching, cafe and pro shop — everything the academy offers, with rates.
        </p>

        <h2 className="mt-12 text-2xl font-bold">Tables & hourly rates</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MOCK_TABLES.map((table) => (
            <Card key={table.id} className="border-border bg-surface">
              <CardHeader className="p-5 pb-2">
                <Badge variant="outline" className="mb-2 w-fit border-felt/40 text-felt">
                  {table.type === "SNOOKER" ? "Snooker" : "Pool"} · {table.size}
                </Badge>
                <CardTitle className="text-base leading-snug">{table.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0 text-sm text-muted-foreground">
                <p>{table.brand}</p>
                <p className="mt-1">{table.clothType}</p>
                <p className="mt-3 text-base font-semibold text-felt">
                  {formatPrice(table.hourlyRate)}/hr
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 className="mt-14 text-2xl font-bold">Coaching programmes</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {MOCK_COACHING.map((pkg) => (
            <Card key={pkg.id} className="border-border bg-surface">
              <CardHeader className="p-5 pb-2">
                <Badge variant="outline" className="mb-2 w-fit border-gold/40 text-gold">
                  {pkg.level}
                </Badge>
                <CardTitle className="text-lg leading-snug">{pkg.title}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{pkg.duration}</p>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <p className="text-xl font-bold text-felt">{formatPrice(pkg.price)}</p>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-felt" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-5 min-h-12 w-full">
                  <Link href="/booking">Book a coaching table</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 className="mt-14 text-2xl font-bold">Cue & Cup Cafe menu</h2>
        <Card className="mt-5 border-border bg-surface">
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            {CAFE_MENU.map((item) => (
              <div key={item.name} className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
                </div>
                <span className="text-sm font-semibold text-felt">{formatPrice(item.price)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <h2 className="mt-14 text-2xl font-bold">On-site services</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FACILITIES.map((item) => (
            <Card key={item.title} className="border-border bg-surface">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0 text-sm leading-6 text-muted-foreground">
                {item.body}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
