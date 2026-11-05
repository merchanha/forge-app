import type { InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
};

export function TextField({
  label,
  id,
  className = "",
  ...props
}: TextFieldProps) {
  return (
    <label className="flex flex-col gap-2" htmlFor={id}>
      <span className="text-muted text-sm font-semibold">{label}</span>
      <input
        id={id}
        className={`border-border bg-raised text-ink placeholder:text-muted min-h-12 rounded-md border px-4 text-base outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forge-accent)] ${className}`}
        {...props}
      />
    </label>
  );
}
