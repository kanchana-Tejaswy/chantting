"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { buttonStyles } from "./button";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  title: string;
  description?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className="fixed inset-0 z-40 bg-krishna-midnight/60 backdrop-blur-[2px] transition-opacity duration-200"
      />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2",
          "rounded-[16px] border border-sandalwood-border bg-ivory p-6 text-ink shadow-sacred-lg",
          "focus-visible:outline-none",
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <DialogPrimitive.Title className="font-serif text-xl font-semibold text-ink text-balance">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="text-sm leading-relaxed text-ink-muted text-pretty">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            aria-label="Close dialog"
            className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[10px] text-ink-muted hover:bg-linen hover:text-ink transition-colors duration-150"
          >
            <X className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </DialogPrimitive.Close>
        </div>

        <div className="mt-4">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export function AlertDialogContent({
  className,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  children,
}: {
  className?: string;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-40 bg-krishna-midnight/65 backdrop-blur-[2px]" />
      <AlertDialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
          "rounded-[16px] border border-sandalwood-border bg-ivory p-6 text-ink shadow-sacred-lg",
          className
        )}
      >
        <AlertDialogPrimitive.Title className="font-serif text-xl font-semibold text-ink text-balance">
          {title}
        </AlertDialogPrimitive.Title>
        <AlertDialogPrimitive.Description className="mt-2 text-sm leading-relaxed text-ink-muted text-pretty">
          {description}
        </AlertDialogPrimitive.Description>

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <AlertDialogPrimitive.Cancel
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            {cancelLabel}
          </AlertDialogPrimitive.Cancel>
          <AlertDialogPrimitive.Action
            onClick={onConfirm}
            className={buttonStyles({
              variant: destructive ? "destructive" : "primary",
              size: "md",
            })}
          >
            {confirmLabel}
          </AlertDialogPrimitive.Action>
        </div>
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  );
}

