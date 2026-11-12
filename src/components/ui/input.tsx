"use client";

import * as React from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

export interface FormFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Accessible field wrapper associating visible label, helper text, and inline errors.
 */
export function FormField({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className="text-sm font-medium text-ink"
      >
        {label}
        {required && (
          <span className="ml-1 text-kumkum" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs leading-relaxed text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs font-medium leading-relaxed text-kumkum"
        >
          {error}
        </p>
      )}
    </div>
  );
}

const baseInputStyles =
  "w-full min-h-11 rounded-[10px] border bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/65 transition-[border-color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-antique disabled:cursor-not-allowed disabled:opacity-55";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      aria-invalid={hasError || undefined}
      className={cn(
        baseInputStyles,
        hasError
          ? "border-kumkum focus-visible:ring-kumkum"
          : "border-sandalwood-strong hover:border-ink-muted",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, hasError, rows = 3, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={hasError || undefined}
      className={cn(
        baseInputStyles,
        "min-h-24 resize-y leading-relaxed",
        hasError
          ? "border-kumkum focus-visible:ring-kumkum"
          : "border-sandalwood-strong hover:border-ink-muted",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, hasError, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={hasError || undefined}
        className={cn(
          baseInputStyles,
          "appearance-none pr-10 cursor-pointer",
          hasError
            ? "border-kumkum focus-visible:ring-kumkum"
            : "border-sandalwood-strong hover:border-ink-muted",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted"
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </div>
  )
);
Select.displayName = "Select";

export type PasswordInputProps = Omit<InputProps, "type">;

/**
 * Accessible password input with an explicit show/hide eye toggle button.
 */
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(({ className, hasError, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <input
        ref={ref}
        type={visible ? "text" : "password"}
        aria-invalid={hasError || undefined}
        className={cn(
          baseInputStyles,
          "pr-12",
          hasError
            ? "border-kumkum focus-visible:ring-kumkum"
            : "border-sandalwood-strong hover:border-ink-muted",
          className
        )}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-1.5 inline-flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[8px] text-ink-muted transition-colors hover:bg-linen hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-antique"
      >
        {visible ? (
          <EyeOff className="size-4" strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <Eye className="size-4" strokeWidth={1.75} aria-hidden="true" />
        )}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

