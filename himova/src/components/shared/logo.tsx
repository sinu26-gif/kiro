import { cn } from "@/lib/utils";

/**
 * Himova wordmark used in the public header and emails.
 * The icon is the same gradient H from public/icon.svg.
 */
export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeMap = {
    sm: "h-7",
    md: "h-9",
    lg: "h-11",
  } as const;

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          sizeMap[size],
          "aspect-square rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700 text-white",
        )}
        aria-hidden
      >
        <svg
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full p-1"
        >
          <path
            d="M9 8h2.5v6h9V8H23v16h-2.5v-7.5h-9V24H9V8z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span
        className={cn(
          "font-semibold tracking-tight text-foreground",
          size === "sm" && "text-base",
          size === "md" && "text-lg",
          size === "lg" && "text-2xl",
        )}
      >
        Himova
      </span>
    </div>
  );
}
