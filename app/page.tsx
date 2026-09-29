import Link from "next/link";
import { MapPin, Phone, Clock3, ShoppingCart, Trophy } from "lucide-react";

import heroImage from "@/assets/mcsa-hero.png";
import { Section } from "@/components/home/section";
import { Stat } from "@/components/home/stat";
import { LiveAvailabilityIndicator } from "@/components/home/live-availability-indicator";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACADEMY, AMBIENCE, FACILITIES } from "@/constants/site-content";
import { formatPrice } from "@/lib/booking";
import { getPublicAcademyContent } from "@/lib/public-content";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { tournaments } = await getPublicAcademyContent();
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ACADEMY.mapQuery)}`;

  return (
    <main className="pb-20">
      <SiteHeader />

      <section className="overflow-hidden border-b border-border">
        <div className="relative">
          <img
            src={heroImage.src}
            alt=""
            aria-hidden="true"
            className="block h-[min(74vw,300px)] w-full object-cover object-center sm:h-[min(48vw,560px)]"
          />
          <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
            <LiveAvailabilityIndicator />
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          {/* <h1 className="max-w-3xl text-2xl font-semibold leading-snug sm:text-4xl">
            {ACADEMY.tagline}
          </h1> */}
          <div className="space-y-3">
            <div className="grid max-w-lg grid-cols-2 gap-3">
              <Stat label="Open" value="10 AM – 11 PM" />
              <Stat label="To book" value="Name + phone" />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="min-h-12 w-full sm:w-auto">
                <Link href="/booking">Book a table</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="min-h-12 w-full gap-2.5 border-felt/30 bg-felt/10 font-semibold text-foreground hover:border-felt/50 hover:bg-felt/15 sm:w-auto [&_svg]:size-5"
              >
                <Link href="/shop">
                  <ShoppingCart aria-hidden="true" />
                  Shop
                </Link>
              </Button>
            </div>
          </div>
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

      {tournaments.length > 0 ? (
        <Section title="Upcoming events" subtitle="What’s coming up at the academy.">
          <div className="grid gap-4 lg:grid-cols-3">
            {tournaments.map((t) => (
              <Card key={t.id} className="border-border bg-surface">
                <CardHeader className="p-5 pb-2">
                  <Badge variant="outline" className="mb-2 min-h-7 w-fit border-gold/40 text-gold">
                    <Trophy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    Academy event
                  </Badge>
                  <CardTitle className="text-lg leading-snug">{t.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-5 pt-0 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4" aria-hidden="true" />
                    {t.date.toISOString().slice(0, 10)}
                  </p>
                  <p>
                    Entry {formatPrice(t.entryFee)} · Prize pool{" "}
                    <span className="text-felt">{formatPrice(t.prizePool)}</span>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      ) : null}

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
            {ACADEMY.isPhonePlaceholder ? (
              <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
                The phone number is a placeholder. Please confirm it before publishing contact
                details.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3 pt-1">
              <Button asChild className="min-h-12">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Get directions to Masters Cue Sport Academy"
                >
                  Get directions
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Section>
    </main>
  );
}
