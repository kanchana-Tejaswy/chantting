"use client";

import * as React from "react";
import { updatePasswordAction, type AuthActionState } from "@/app/auth/actions";
import { LotusEmblem } from "@/components/sacred/ornaments";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField, PasswordInput } from "@/components/ui/input";

const INITIAL_STATE: AuthActionState = {};

export function ResetPasswordForm({ email }: { email?: string | null }) {
  const [state, action, pending] = React.useActionState(
    updatePasswordAction,
    INITIAL_STATE
  );

  return (
    <div className="mx-auto max-w-md px-5 py-10 sm:py-16">
      <Card surface="elevated">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-[10px] bg-krishna-midnight text-gold-antique">
              <LotusEmblem size={20} />
            </span>
            <div>
              <CardTitle className="font-display text-2xl">
                Choose a new password
              </CardTitle>
              <CardDescription>
                {email
                  ? `Updating password for ${email}`
                  : "Set a strong password for your account."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form action={action} className="space-y-4">
            {state.error && (
              <div
                role="alert"
                className="rounded-[10px] border border-kumkum/30 bg-kumkum-wash px-3.5 py-2.5 text-xs leading-relaxed text-kumkum"
              >
                {state.error}
              </div>
            )}

            <FormField
              id="new-password"
              label="New password"
              hint="Minimum 8 characters."
              required
            >
              <PasswordInput
                id="new-password"
                name="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
              />
            </FormField>

            <FormField
              id="confirm-password"
              label="Confirm new password"
              required
            >
              <PasswordInput
                id="confirm-password"
                name="confirmPassword"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
              />
            </FormField>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={pending}
              className="w-full"
            >
              Save new password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

