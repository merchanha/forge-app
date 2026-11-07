import { Suspense } from "react";

import { LogoutButton } from "@/features/profiles/components/logout-button";
import { ProfileForm } from "@/features/profiles/components/profile-form";
import { getOwnProfile } from "@/features/profiles/queries";
import {
  experienceLevelLabels,
  trainingGoalLabels,
} from "@/features/profiles/validation";

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

  const summaryBits = [
    profile.experience_level
      ? experienceLevelLabels[profile.experience_level]
      : null,
    profile.goal ? trainingGoalLabels[profile.goal] : null,
  ].filter(Boolean);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-muted text-sm font-semibold uppercase">Profile</p>
        <div className="flex items-center gap-4">
          <div
            className="bg-raised border-border flex size-14 items-center justify-center rounded-full border font-display text-2xl font-extrabold uppercase"
            aria-hidden
          >
            {(profile.display_name.trim() || "A").slice(0, 1)}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-4xl font-extrabold tracking-wide uppercase">
              {profile.display_name.trim() || "Athlete"}
            </h1>
            {summaryBits.length > 0 ? (
              <p className="text-muted text-sm">
                {summaryBits.join(" · ")}
              </p>
            ) : (
              <p className="text-muted text-sm">
                Units, theme, and training prefs.
              </p>
            )}
          </div>
        </div>

        {(profile.primary_discipline ||
          profile.disciplines.length > 0 ||
          profile.days_per_week ||
          profile.target_event) && (
          <dl className="border-border bg-surface grid grid-cols-2 gap-3 rounded-lg border p-4 text-sm">
            {profile.primary_discipline ? (
              <div>
                <dt className="text-muted">Primary</dt>
                <dd className="font-semibold">{profile.primary_discipline}</dd>
              </div>
            ) : null}
            {profile.disciplines.length > 0 ? (
              <div>
                <dt className="text-muted">Also</dt>
                <dd className="font-semibold">
                  {profile.disciplines
                    .filter((item) => item !== profile.primary_discipline)
                    .join(", ") || "—"}
                </dd>
              </div>
            ) : null}
            {profile.days_per_week ? (
              <div>
                <dt className="text-muted">Days per week</dt>
                <dd className="font-semibold">{profile.days_per_week}</dd>
              </div>
            ) : null}
            {profile.target_event ? (
              <div>
                <dt className="text-muted">Target event</dt>
                <dd className="font-semibold">{profile.target_event}</dd>
              </div>
            ) : null}
          </dl>
        )}
      </header>

      <ProfileForm
        displayName={profile.display_name}
        preferredUnits={profile.preferred_units}
        theme={profile.theme}
        experienceLevel={profile.experience_level}
        disciplines={profile.disciplines}
        primaryDiscipline={profile.primary_discipline}
        goal={profile.goal}
        daysPerWeek={profile.days_per_week}
        targetEvent={profile.target_event}
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
    <Suspense fallback={<p className="text-muted">Loading profile…</p>}>
      <ProfileContent />
    </Suspense>
  );
}
