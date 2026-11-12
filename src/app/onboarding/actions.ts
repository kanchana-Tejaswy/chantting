"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/auth/validation";
import { getLocalDateString } from "@/lib/sadhana/stats";

export interface OnboardingActionState {
  error?: string;
  completed?: boolean;
  summary?: {
    displayName: string;
    timezone: string;
    dailyRoundTarget: number;
    carryForwardPolicy: string;
  };
}

export async function completeOnboardingAction(
  _prevState: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const parsed = onboardingSchema.safeParse({
    displayName: formData.get("displayName"),
    timezone: formData.get("timezone"),
    dailyRoundTarget: formData.get("dailyRoundTarget"),
    carryForwardPolicy: formData.get("carryForwardPolicy"),
    maxCarryCap: formData.get("maxCarryCap")?.toString() ?? "",
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Please review your daily commitment preferences.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Authentication required. Please sign in again." };
  }

  const [profileUpdate, prefUpdate] = await Promise.all([
    supabase
      .from("profiles")
      .update({
        display_name: parsed.data.displayName,
        timezone: parsed.data.timezone,
      })
      .eq("id", user.id),
    supabase
      .from("user_preferences")
      .update({
        daily_round_target: parsed.data.dailyRoundTarget,
        carry_forward_policy: parsed.data.carryForwardPolicy,
        custom_carry_rule: parsed.data.customCarryRule,
      })
      .eq("user_id", user.id),
  ]);

  if (profileUpdate.error || prefUpdate.error) {
    return {
      error:
        profileUpdate.error?.message ??
        prefUpdate.error?.message ??
        "Could not save your preferences.",
    };
  }

  const todayDate = getLocalDateString(parsed.data.timezone);
  const { error: ensureError } = await supabase.rpc(
    "ensure_my_daily_sadhana",
    {
      p_target_date: todayDate,
    }
  );

  if (ensureError) {
    return { error: ensureError.message };
  }

  revalidatePath("/sadhana");
  revalidatePath("/onboarding");

  return {
    completed: true,
    summary: {
      displayName: parsed.data.displayName,
      timezone: parsed.data.timezone,
      dailyRoundTarget: parsed.data.dailyRoundTarget,
      carryForwardPolicy: parsed.data.carryForwardPolicy,
    },
  };
}

