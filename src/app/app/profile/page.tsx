import { Suspense } from "react";

import { LogoutButton } from "@/features/profiles/components/logout-button";
import { ProfileForm } from "@/features/profiles/components/profile-form";
import { getOwnProfile } from "@/features/profiles/queries";

async function ProfileContent() {
  const profile = await getOwnProfile();

  if (!profile) {
    return (
      <main className="flex flex-col gap-4">
        <h1 className="font-display text-4xl font-extrabold uppercase">
          Profile
        </h1>
        <p className="text-muted" role="alert">
          Profile not found. If you just signed up, refresh once. Otherwise
          check that the profiles migration was applied.
        </p>
        <LogoutButton />
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-extrabold uppercase">
          Profile
        </h1>
        <p className="text-muted">
          Basic training prefs. More onboarding fields come later.
        </p>
      </header>

      <ProfileForm
        displayName={profile.display_name}
        preferredUnits={profile.preferred_units}
      />

      <section className="border-border flex flex-col gap-3 border-t pt-6">
        <h2 className="font-display text-xl font-extrabold uppercase">
          Session
        </h2>
        <LogoutButton />
      </section>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={<p className="text-muted">Loading profile…</p>}
    >
      <ProfileContent />
    </Suspense>
  );
}
