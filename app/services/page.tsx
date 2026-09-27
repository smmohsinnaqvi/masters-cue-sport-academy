import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FACILITIES } from "@/data/academy";
import { formatPrice } from "@/lib/booking";
import { getPublicAcademyContent } from "@/lib/public-content";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const { tables, cafeteriaItems } = await getPublicAcademyContent();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold sm:text-4xl">Services & facilities</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Tables, cafe and academy facilities, with current rates.
        </p>

        <h2 className="mt-12 text-2xl font-bold">Tables & hourly rates</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tables.map((table) => (
            <Card key={table.id} className="border-border bg-surface">
              <CardHeader className="p-5 pb-2">
                <Badge variant="outline" className="mb-2 w-fit border-felt/40 text-felt">
                  {table.type === "SNOOKER" ? "Snooker" : "Pool"}
                </Badge>
                <CardTitle className="text-base leading-snug">{table.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0 text-sm text-muted-foreground">
                <p className="mt-3 text-base font-semibold text-felt">
                  {formatPrice(table.hourlyRate)}/hr
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {cafeteriaItems.length > 0 ? (
          <>
            <h2 className="mt-14 text-2xl font-bold">Cue & Cup Cafe menu</h2>
            <Card className="mt-5 border-border bg-surface">
              <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
                {cafeteriaItems.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      {item.note ? (
                        <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
                      ) : null}
                    </div>
                    <span className="text-sm font-semibold text-felt">
                      {formatPrice(item.price)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        ) : null}

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
