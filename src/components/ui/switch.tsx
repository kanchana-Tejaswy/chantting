"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/cn";

export interface SwitchFieldProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function SwitchField({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
}: SwitchFieldProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-[12px] border border-sandalwood-border bg-paper px-4 py-3",
        className
      )}
    >
      <div className="flex flex-col gap-0.5">
        <label
          htmlFor={id}
          className="cursor-pointer text-sm font-medium text-ink"
        >
          {label}
        </label>
        {description && (
          <p id={`${id}-desc`} className="text-xs leading-relaxed text-ink-muted">
            {description}
          </p>
        )}
      </div>

      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={description ? `${id}-desc` : undefined}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-transparent p-0.5",
          "transition-colors duration-150 ease-out",
          "data-[state=checked]:bg-peacock-green data-[state=unchecked]:bg-sandalwood-strong/70",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            "pointer-events-none block size-6 rounded-full bg-paper shadow-sacred-sm",
            "transition-transform duration-150 ease-out",
            "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
          )}
        />
      </SwitchPrimitive.Root>
    </div>
  );
}

