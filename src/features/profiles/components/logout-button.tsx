import { logoutAction } from "@/features/auth/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="border-border text-ink min-h-12 w-full rounded-md border px-4 font-semibold"
      >
        Log out
      </button>
    </form>
  );
}
