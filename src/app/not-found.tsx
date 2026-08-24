import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <div className="rounded-3xl border border-border bg-card p-8 sm:p-12 shadow-2xl max-w-md space-y-5">
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Compass className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-foreground">404 — Page Not Found</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The page, lesson, or resource you are searching for does not exist or has been moved.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
