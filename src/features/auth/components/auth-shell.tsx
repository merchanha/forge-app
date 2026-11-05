import type { ReactNode } from "react";

type AuthShellProps = {
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-6 py-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="bg-accent text-ground font-display flex size-10 items-center justify-center rounded-md text-2xl font-extrabold"
          >
            F
          </div>
          <p className="font-display text-2xl font-extrabold tracking-wide uppercase">
            FORGE
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl leading-none font-extrabold tracking-wide uppercase">
            {title}
          </h1>
          <p className="text-muted text-base">{subtitle}</p>
        </div>
      </header>
      {children}
    </main>
  );
}
