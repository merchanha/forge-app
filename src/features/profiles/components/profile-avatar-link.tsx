import Link from "next/link";

export function ProfileAvatarLink({
  displayName,
}: {
  displayName: string | null | undefined;
}) {
  const trimmed = displayName?.trim() ?? "";
  const initials =
    trimmed.length > 0
      ? trimmed
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? "")
          .join("")
      : "F";

  return (
    <Link
      href="/app/profile"
      aria-label="Open profile"
      className="border-border text-ink inline-flex size-12 shrink-0 items-center justify-center rounded-full border text-sm font-bold"
    >
      {initials}
    </Link>
  );
}
