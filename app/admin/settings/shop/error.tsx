"use client";

import { PageError } from "@/components/layout/page-state";

export default function ShopSettingsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PageError reset={reset} />;
}
