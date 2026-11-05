import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <AuthShell
      title={
        <>
          Build your
          <br />
          training.
        </>
      }
      subtitle="Track your progress. Become stronger."
    >
      <RegisterForm />
    </AuthShell>
  );
}
