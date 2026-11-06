import type { TextareaHTMLAttributes } from "react";

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  id: string;
};

export function TextArea({
  label,
  id,
  className = "",
  ...props
}: TextAreaProps) {
  return (
    <label className="flex flex-col gap-2" htmlFor={id}>
      <span className="text-muted text-sm font-semibold">{label}</span>
      <textarea
        id={id}
        className={`border-border bg-raised text-ink placeholder:text-muted min-h-24 rounded-md border px-4 py-3 text-base outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forge-accent)] ${className}`}
        {...props}
      />
    </label>
  );
}
