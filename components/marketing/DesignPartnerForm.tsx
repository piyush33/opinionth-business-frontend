"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

const TEAM_SIZES = [
  { v: "<20", l: "Under 20" },
  { v: "20-50", l: "20–50" },
  { v: "51-200", l: "51–200" },
  { v: "200+", l: "200+" },
];
const TIME_ZONES = [
  { v: "1", l: "One" },
  { v: "2", l: "Two" },
  { v: "3+", l: "Three or more" },
];

const field =
  "w-full rounded-xl border border-[var(--mk-rule)] bg-white px-3.5 py-2.5 text-[15px] text-[var(--mk-ink)] placeholder:text-[#9a9db3] focus:border-[var(--mk-indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--mk-indigo-soft)]";
const label = "mb-1.5 block text-[13px] font-semibold text-[var(--mk-ink)]";

function Choice({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { v: string; l: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={name}>
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.v)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              on
                ? "border-[var(--mk-indigo)] bg-[var(--mk-indigo-soft)] text-[var(--mk-indigo-deep)]"
                : "border-[var(--mk-rule)] bg-white text-[var(--mk-ink-2)] hover:border-[var(--mk-indigo)]"
            }`}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

/** "Become a design partner": qualifies on team size and time zones, then saves the request. */
export default function DesignPartnerForm() {
  const [teamSize, setTeamSize] = useState("");
  const [timeZones, setTimeZones] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    if (!teamSize) return setError("Pick your team size.");
    if (!timeZones) return setError("Pick how many time zones your team spans.");
    setState("sending");
    try {
      const res = await fetch("/nest-api/public/design-partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          email: f.get("email"),
          company: f.get("company"),
          role: f.get("role"),
          decision: f.get("decision"),
          website: f.get("website"),
          teamSize,
          timeZones,
          source: "collabrr.io",
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(
          (Array.isArray(j?.message) ? j.message[0] : j?.message) ||
            "That didn't go through. Try again in a minute.",
        );
      }
      setState("sent");
    } catch (err: any) {
      setState("idle");
      setError(err?.message || "That didn't go through. Try again in a minute.");
    }
  };

  if (state === "sent") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-[var(--mk-rule)] bg-white p-6 sm:p-8" role="status">
        <CheckCircle2 className="h-8 w-8 text-[var(--mk-green)]" />
        <h3 className="mk-display text-2xl font-bold">Thanks. We&apos;ll be in touch.</h3>
        <p className="max-w-md text-[15px] leading-relaxed text-[var(--mk-ink-2)]">
          We&apos;ll email you to set up your first session: one live decision, run in Collabrr with your team.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-[var(--mk-rule)] bg-white p-5 shadow-[0_20px_50px_-30px_rgba(21,22,43,0.35)] sm:p-7" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="dp-name" className={label}>Name</label>
          <input id="dp-name" name="name" required autoComplete="name" className={field} />
        </div>
        <div>
          <label htmlFor="dp-email" className={label}>Work email</label>
          <input id="dp-email" name="email" type="email" required autoComplete="email" className={field} />
        </div>
        <div>
          <label htmlFor="dp-company" className={label}>Company</label>
          <input id="dp-company" name="company" required autoComplete="organization" className={field} />
        </div>
        <div>
          <label htmlFor="dp-role" className={label}>
            Role <span className="font-normal text-[var(--mk-ink-2)]">(optional)</span>
          </label>
          <input id="dp-role" name="role" autoComplete="organization-title" placeholder="e.g. Head of Product" className={field} />
        </div>
      </div>
      <div>
        <span className={label}>Team size</span>
        <Choice name="Team size" options={TEAM_SIZES} value={teamSize} onChange={setTeamSize} />
      </div>
      <div>
        <span className={label}>Time zones your team spans</span>
        <Choice name="Time zones" options={TIME_ZONES} value={timeZones} onChange={setTimeZones} />
      </div>
      <div>
        <label htmlFor="dp-decision" className={label}>
          One decision you&apos;d bring <span className="font-normal text-[var(--mk-ink-2)]">(optional)</span>
        </label>
        <textarea
          id="dp-decision"
          name="decision"
          rows={3}
          placeholder="e.g. Should we rebuild billing as an event-driven service?"
          className={`${field} resize-y`}
        />
      </div>
      {/* Honeypot: hidden from people, filled by bots */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="dp-website">Website</label>
        <input id="dp-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {error && <p className="text-sm font-medium text-[var(--mk-amber)]" role="alert">{error}</p>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="submit"
          disabled={state === "sending"}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--mk-indigo)] px-5 py-3 text-[15px] font-semibold text-white shadow-sm hover:bg-[var(--mk-indigo-deep)] disabled:opacity-70"
        >
          {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Request a design-partner spot
          {state === "sending" ? null : <ArrowRight className="h-4 w-4" />}
        </button>
        <span className="text-[13px] text-[var(--mk-ink-2)]">We only use this to contact you about Collabrr.</span>
      </div>
    </form>
  );
}
