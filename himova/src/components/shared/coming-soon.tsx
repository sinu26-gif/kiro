import Link from "next/link";
import { Construction } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Generic "coming soon" placeholder for routes referenced in navigation
 * but not yet implemented. Keeps the nav from 404-ing and gives a clear
 * signal that the feature is on the roadmap.
 */
export function ComingSoon({
  title,
  description,
  milestone,
  backHref = "/",
  backLabel = "Back",
}: {
  title: string;
  description?: string;
  milestone?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex min-h-[55vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border-2 border-dashed bg-card/60 shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Construction className="h-6 w-6" aria-hidden />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
          {milestone ? (
            <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
              {milestone}
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild variant="outline">
            <Link href={backHref}>{backLabel}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
