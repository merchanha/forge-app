import { Suspense } from "react";

import { AiCoachChat } from "@/features/ai-coach/components/ai-coach-chat";
import { getOwnProfile } from "@/features/profiles/queries";

function AiCoachFallback() {
  return (
    <div className="border-border bg-surface text-muted flex min-h-[70dvh] items-center justify-center rounded-[28px] border text-sm lg:min-h-[640px]">
      Loading AI Coach…
    </div>
  );
}

async function AiCoachContent() {
  let displayName: string | null = null;
  let subtitle = "Training assistant";

  try {
    const profile = await getOwnProfile();
    displayName = profile?.display_name ?? null;
    const bits = [
      profile?.primary_discipline ?? profile?.disciplines?.[0] ?? null,
      profile?.experience_level ?? null,
    ].filter(Boolean);
    if (bits.length) {
      subtitle = bits
        .map((bit) => bit!.charAt(0).toUpperCase() + bit!.slice(1))
        .join(" · ");
    }
  } catch {
    // Keep defaults when profile prefs are unavailable.
  }

  return <AiCoachChat displayName={displayName} subtitle={subtitle} />;
}

export default function AiCoachPage() {
  return (
    <Suspense fallback={<AiCoachFallback />}>
      <AiCoachContent />
    </Suspense>
  );
}
