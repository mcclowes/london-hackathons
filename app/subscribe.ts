"use server";

import { mailConfig } from "@/lib/resend";

export type SubscribeState = { ok: boolean; message: string } | null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribe(_prev: SubscribeState, form: FormData): Promise<SubscribeState> {
  // Bots fill every field; people never see this one.
  if (form.get("website")) return { ok: true, message: "You're on the list." };

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, message: "That doesn't look like an email address." };

  const mail = mailConfig();
  if (!mail) return { ok: false, message: "Signups aren't open yet." };

  const { error } = await mail.resend.contacts.create({ email, segments: [{ id: mail.segmentId }] });
  if (error && !/already exists/i.test(error.message)) {
    console.error("Resend signup failed", error);
    return { ok: false, message: "Couldn't sign you up. Try again later." };
  }
  return { ok: true, message: "You're on the list. First roundup lands Monday." };
}
