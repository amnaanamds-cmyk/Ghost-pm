import { cn } from "@/lib/utils";

export function Avatar({
  person,
  className,
}: {
  person: { name?: string | null; image?: string | null; githubLogin?: string | null };
  className?: string;
}) {
  const label = person.name || person.githubLogin || "?";
  if (person.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={person.image} alt={label} title={label} className={cn("size-6 rounded-full", className)} />;
  }
  return (
    <span
      title={label}
      className={cn(
        "bg-muted text-muted-foreground inline-flex size-6 items-center justify-center rounded-full text-[10px] font-medium",
        className
      )}
    >
      {label.slice(0, 2).toUpperCase()}
    </span>
  );
}
