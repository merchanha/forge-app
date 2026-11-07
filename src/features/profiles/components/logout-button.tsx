"use client";

import { useState } from "react";

import { logoutAction } from "@/features/auth/actions";

export function LogoutButton() {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="border-border text-ink min-h-12 w-full rounded-md border px-4 font-semibold"
      >
        Log out
      </button>

      {confirmOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Dismiss logout confirmation"
            onClick={() => setConfirmOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            className="border-border bg-surface relative z-10 flex w-full max-w-md flex-col gap-4 rounded-t-xl border p-5 sm:rounded-xl"
          >
            <h2
              id="logout-confirm-title"
              className="font-display text-2xl font-extrabold uppercase"
            >
              Log out?
            </h2>
            <p className="text-muted text-sm">
              Your routines and history stay on your account.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <form action={logoutAction} className="flex-1">
                <button
                  type="submit"
                  className="bg-accent text-ground min-h-12 w-full rounded-md px-4 font-semibold"
                >
                  Log out
                </button>
              </form>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="border-border text-ink min-h-12 flex-1 rounded-md border px-4 font-semibold"
              >
                Stay
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
