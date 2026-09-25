"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Settings2, ShieldCheck, Users } from "lucide-react";

import { RoleGate } from "@/components/auth/role-gate";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminPage() {
  return (
    <RoleGate role="admin">
      <>
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Admin</p>
              <h1 className="mt-2 text-3xl font-bold">Academy dashboard</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                A clear view of operations and configuration.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/supervisor">
                Open supervisor view <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Summary icon={BarChart3} label="Today revenue" value="—" />
            <Summary icon={Users} label="Active sessions" value="—" />
            <Summary icon={ShieldCheck} label="Pending checks" value="—" />
            <Summary icon={Settings2} label="Configuration" value="Ready" />
          </div>
          <Card className="mt-8 border-border bg-surface">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold">Start with settings</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Create tournaments, maintain cafeteria items, and update table hourly rates from
                separate settings tabs. Nothing is pre-filled.
              </p>
              <Button asChild className="mt-5">
                <Link href="/admin/settings">Open settings</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </>
    </RoleGate>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
}) {
  return (
    <Card className="border-border bg-surface">
      <CardContent className="p-5">
        <Icon className="h-4 w-4 text-felt" />
        <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
