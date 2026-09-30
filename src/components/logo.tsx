import Link from "next/link";
import { Ghost } from "lucide-react";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight">
      <Ghost className="size-5" />
      Ghost PM
    </Link>
  );
}
