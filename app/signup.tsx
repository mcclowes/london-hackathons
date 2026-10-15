"use client";

import { useActionState } from "react";
import styles from "./page.module.scss";
import { subscribe } from "./subscribe";

export function Signup() {
  const [state, action, pending] = useActionState(subscribe, null);

  return (
    <form className={styles.signup} action={action}>
      <div className={styles.signupRow}>
        <input name="email" aria-label="Email address" type="email" required placeholder="you@example.com" autoComplete="email" />
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden hidden />
        <button type="submit" disabled={pending}>
          {pending ? "…" : "Sign up"}
        </button>
      </div>
      <p className={styles.small} role="status">
        {state?.message ?? "Every Monday: this week's hackathons and what's coming up. Unsubscribe any time."}
      </p>
    </form>
  );
}
