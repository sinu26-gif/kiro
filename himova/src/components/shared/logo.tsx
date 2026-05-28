import { cn } from "@/lib/utils";

/**
 * Himova wordmark used across the public header, login card, and emails.
 * The mark is a gradient "H" tile beside the word "Himova" in a slightly
 * tighter, brand-tinted typographic treatment.
 */
export function Logo({
  className,
  size = "md",
  monochrome = false,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  monochrome?: boolean;
}) {
  const tile =
    size === "sm" ? "h-7 w-7 rounded-lg" : size === "lg" ? "h-11 w-11 rounded-xl" : "h-9 w-9 rounded-lg";

  const word =
    size === "sm"
      ? "text-base"
      : size === "lg"
        ? "text-2xl sm:text-[28px]"
        : "text-lg";

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          tile,
          "relative flex items-center justify-center text-white shadow-soft",
          monochrome
            ? "bg-foreground"
            : "bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-700"
        )}
        aria-hidden
      >
        <svg
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
          className="h-[55%] w-[55%]"
        >
          <path
            d="M9 8h2.5v6h9V8H23v16h-2.5v-7.5h-9V24H9V8z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span
        className={cn(
          word,
          "font-semibold tracking-tight",
          monochrome ? "text-foreground" : "text-foreground"
        )}
      >
        Himova
      </span>
    </div>
  );
}
