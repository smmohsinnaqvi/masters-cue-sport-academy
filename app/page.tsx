import Link from "next/link";
import { Coffee, MapPin, Phone, Clock3, Trophy, ShieldCheck } from "lucide-react";

import heroImage from "@/assets/snooker-academy-hero.jpg";
import { Section } from "@/components/home/section";
import { Stat } from "@/components/home/stat";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ACADEMY,
  AMBIENCE,
  CAFE_MENU,
  FACILITIES,
  HOUSE_RULES,
  MOCK_TABLES,
  MOCK_TOURNAMENTS,
} from "@/constants/site-content";
import { formatPrice } from "@/lib/booking";

export default function HomePage() {
  const snooker = MOCK_TABLES.filter((t) => t.type === "SNOOKER").length;
  const pool = MOCK_TABLES.filter((t) => t.type === "POOL").length;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ACADEMY.mapQuery)}`;

  return (
    <main className="pb-20">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-border">
        <img
          src={heroImage.src}
          alt="Main arena with snooker tables under canopy lighting"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-[image:var(--gradient-hero)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <Badge variant="outline" className="min-h-8 border-felt/45 bg-felt/15 text-felt">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-neon" aria-hidden="true" />
            Live tables available now
          </Badge>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
            {ACADEMY.name}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            {ACADEMY.tagline}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild className="min-h-12 shadow-[var(--shadow-felt)]">
              <Link href="/booking">Book a table</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-12 border-border bg-surface/70">
              <Link href="/services">See facilities</Link>
            </Button>
          </div>
          <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Snooker tables" value={`${snooker} × 12ft`} />
            <Stat label="Pool tables" value={`${pool} × 9ft`} />
            <Stat label="Open" value="10 AM – 11 PM" />
            <Stat label="To book" value="Name + phone" />
          </dl>
        </div>
      </section>

      <Section title="The ambience" subtitle="What the room feels like when you walk in.">
        <div className="grid gap-4 sm:grid-cols-2">
          {AMBIENCE.map((item) => (
            <Card key={item.title} className="border-border bg-surface">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0 text-sm leading-6 text-muted-foreground">
                {item.body}
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Facilities" subtitle="Everything on the floor, in one place.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      </Section>

      {CAFE_MENU.length > 0 ? (
        <Section
          title="Cue & Cup Cafe"
          subtitle="Our in-house canteen — served to the arena rail between frames."
        >
          <Card className="border-border bg-surface">
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
              {CAFE_MENU.map((item) => (
                <div
                  key={item.name}
                  className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0"
                >
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <Coffee className="h-4 w-4 text-gold" aria-hidden="true" />
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
                  </div>
                  <span className="text-sm font-semibold text-felt">{formatPrice(item.price)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </Section>
      ) : null}

      {MOCK_TOURNAMENTS.length > 0 ? (
        <Section title="Tournaments & leagues" subtitle="Entry fees, prize pools and spots left.">
          <div className="grid gap-4 lg:grid-cols-3">
            {MOCK_TOURNAMENTS.map((t) => (
              <Card key={t.id} className="border-border bg-surface">
                <CardHeader className="p-5 pb-2">
                  <Badge variant="outline" className="mb-2 min-h-7 w-fit border-gold/40 text-gold">
                    <Trophy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    {t.gameType}
                  </Badge>
                  <CardTitle className="text-lg leading-snug">{t.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-5 pt-0 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4" aria-hidden="true" />
                    {t.date} · {t.time}
                  </p>
                  <p>
                    Entry {formatPrice(t.entryFee)} · Prize pool{" "}
                    <span className="text-felt">{formatPrice(t.prizePool)}</span>
                  </p>
                  <p className={t.status === "FILLING_FAST" ? "text-warning" : "text-foreground"}>
                    {t.spotsLeft} of {t.totalSpots} spots left
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="House rules" subtitle="Keeps the cloth fast and the arena calm.">
        <ul className="grid gap-3 sm:grid-cols-2">
          {HOUSE_RULES.map((rule) => (
            <li
              key={rule}
              className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground"
            >
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-felt" aria-hidden="true" />
              {rule}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Find us" subtitle="Drop in, or book ahead for peak evening hours.">
        <Card className="border-border bg-surface">
          <CardContent className="space-y-3 p-5 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-felt" aria-hidden="true" />
              {ACADEMY.address}
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-felt" aria-hidden="true" />
              {ACADEMY.phone}
            </p>
            <p className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-felt" aria-hidden="true" />
              {ACADEMY.hours}
            </p>
            {ACADEMY.isPlaceholderInfo ? (
              <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
                Address, phone and hours above are placeholders we wrote — send us the real details
                and they will be swapped in.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3 pt-1">
              <Button asChild className="min-h-12">
                <a href={mapsUrl} target="_blank" rel="noreferrer">
                  Get directions
                </a>
              </Button>
              <Button asChild variant="outline" className="min-h-12 border-border bg-surface/70">
                <Link href="/booking">Book a table</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Section>
    </main>
  );
}
