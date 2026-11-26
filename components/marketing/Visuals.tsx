// Product-style illustrations for the marketing site, drawn in HTML so they
// stay sharp and match the app's own cards (phase chip, role chips, @id links).
import { Sparkles, Tag, GitBranch, CornerDownRight, ArrowRight, ArrowDown } from "lucide-react";

const phaseChip =
  "inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-200";
const roleChip =
  "inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-sky-200";

function Ref({ id }: { id: number }) {
  return <span className="font-medium text-purple-600">@{id}</span>;
}

export function MiniCard({
  author,
  initial,
  tint,
  phase,
  roles,
  children,
  title,
  className = "",
  flag,
}: {
  author: string;
  initial: string;
  tint: string;
  phase: string;
  roles: string[];
  children?: React.ReactNode;
  title: string;
  className?: string;
  flag?: { text: string; tone: "amber" | "green" };
}) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-3.5 shadow-[0_12px_30px_-18px_rgba(21,22,43,0.35)] ${className}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold text-white ${tint}`}>{initial}</span>
        <span className="text-[12px] font-semibold text-gray-900">@{author}</span>
        {flag && (
          <span
            className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              flag.tone === "amber"
                ? "bg-[var(--mk-amber-soft)] text-[var(--mk-amber)]"
                : "bg-[var(--mk-green-soft)] text-[var(--mk-green)]"
            }`}
          >
            {flag.text}
          </span>
        )}
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        <span className={phaseChip}>
          <GitBranch className="h-3 w-3" />
          {phase}
        </span>
        {roles.map((r) => (
          <span key={r} className={roleChip}>
            <Tag className="h-3 w-3" />
            {r}
          </span>
        ))}
      </div>
      {children && <p className="mb-1.5 text-[12.5px] leading-snug text-gray-700">{children}</p>}
      <p className="text-[13.5px] font-bold leading-snug text-gray-900">{title}</p>
    </div>
  );
}

/** Hero: one live space, joined hours late from another time zone. */
export function HeroSpace() {
  return (
    <div className="relative">
      <div className="rounded-[28px] border border-[var(--mk-rule)] bg-white/80 p-4 shadow-[0_40px_80px_-50px_rgba(63,64,201,0.55)] backdrop-blur sm:p-5">
        {/* Space header */}
        <div className="mb-4 flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--mk-ink-2)]">
              Engineering · Space
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="mk-display bg-gradient-to-r from-[var(--mk-indigo)] to-[var(--mk-cyan)] bg-clip-text text-lg font-bold text-transparent sm:text-xl">
                Billing Architecture Rethink
              </span>
              <Sparkles className="h-4 w-4 text-[var(--mk-indigo)]" aria-label="Topic emerged from the cards" />
            </div>
            <p className="mt-0.5 text-[12.5px] text-[var(--mk-ink-2)]">Should we rebuild billing as an event-driven service?</p>
          </div>
          <div className="flex -space-x-2" aria-label="Participants in three time zones">
            {[
              ["L", "bg-[var(--mk-indigo)]", "Berlin"],
              ["M", "bg-[var(--mk-cyan)]", "Austin"],
              ["W", "bg-[#e0779b]", "Singapore"],
            ].map(([i, c, city]) => (
              <span key={city} title={city} className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold text-white ring-2 ring-white ${c}`}>
                {i}
              </span>
            ))}
          </div>
        </div>

        {/* Where it stands: the space summary */}
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-[var(--mk-cyan-soft)] px-3 py-2 text-[12px] leading-snug text-[#0b5f72]">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="font-semibold">Where it stands: </span>
            two options on the table, ordering of provider retries contested, migration timing still a risk.
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-3">
            <MiniCard author="lena" initial="L" tint="bg-[var(--mk-indigo)]" phase="Hypothesis / Options" roles={["Claim"]} title="Event-driven billing lets us add usage pricing without touching invoicing.">
              We believe moving to events decouples metering from invoices; we&apos;ll know if a new plan ships in under a sprint.
            </MiniCard>
            <MiniCard author="marcus" initial="M" tint="bg-[var(--mk-cyan)]" phase="Hypothesis / Options" roles={["Counter-claim"]} title="Ordering isn't guaranteed by our payment provider." className="sm:ml-4">
              <Ref id={142} /> assumes events arrive in order. Retries from the provider arrive out of order today.
            </MiniCard>
          </div>
          <div className="grid gap-3">
            <MiniCard author="wei" initial="W" tint="bg-[#e0779b]" phase="Discovery / Brainstorm" roles={["Evidence"]} title="3 of the last 5 billing incidents were sync timeouts." />
            <MiniCard
              author="lena"
              initial="L"
              tint="bg-[var(--mk-indigo)]"
              phase="Specs / Solutioning"
              roles={["Risk"]}
              title="The migration window overlaps quarter-end close."
            />
            <div className="rounded-2xl border border-dashed border-[var(--mk-indigo)]/50 bg-[var(--mk-indigo-soft)]/60 p-3.5">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--mk-indigo-deep)]">
                <Sparkles className="h-3.5 w-3.5" /> Suggested next card · Mitigation
              </div>
              <p className="text-[12.5px] leading-snug text-[var(--mk-ink)]">
                Cut over after close: run both pipelines in shadow mode for two weeks, addressing <Ref id={157} />.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Today: two layers, with complex discussion squeezed into the meeting. Proposed: three. */
export function LayersDiagram() {
  const box = "rounded-2xl border px-4 py-4 text-center";
  return (
    <div className="grid gap-6">
      <div>
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--mk-ink-2)]">Today: two layers</div>
        <div className="grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1.6fr]">
          <div className={`${box} border-[var(--mk-rule)] bg-white`}>
            <div className="font-semibold">Chat</div>
            <div className="text-[13px] text-[var(--mk-ink-2)]">Linear and ephemeral</div>
          </div>
          <div className="hidden items-center text-[var(--mk-ink-2)] sm:flex">⇄</div>
          <div className={`${box} border-[var(--mk-rule)] bg-white`}>
            <div className="font-semibold">Meetings</div>
            <div className="mb-3 text-[13px] text-[var(--mk-ink-2)]">Compressed, context lost</div>
            <div className="rounded-xl border border-[var(--mk-amber)]/40 bg-[var(--mk-amber-soft)] px-3 py-2.5">
              <div className="text-[14px] font-semibold text-[var(--mk-amber)]">Complex discussion</div>
              <div className="text-[12.5px] text-[var(--mk-amber)]">Squeezed into one hour</div>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-dashed border-[var(--mk-rule)]" />
      <div>
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--mk-ink-2)]">With Collabrr: three layers</div>
        <div className="grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1.6fr_auto_1fr]">
          <div className={`${box} border-[var(--mk-rule)] bg-white`}>
            <div className="font-semibold">Signal</div>
            <div className="text-[13px] text-[var(--mk-ink-2)]">Chat for quick updates</div>
          </div>
          <div className="hidden items-center text-[var(--mk-ink-2)] sm:flex">⇄</div>
          <div className={`${box} border-[var(--mk-indigo)] bg-[var(--mk-indigo-soft)]`}>
            <div className="font-semibold text-[var(--mk-indigo-deep)]">Reasoning · Collabrr</div>
            <div className="text-[13px] text-[var(--mk-indigo-deep)]">Complex discussion, async and persistent</div>
          </div>
          <div className="hidden items-center text-[var(--mk-ink-2)] sm:flex">⇄</div>
          <div className={`${box} border-[var(--mk-rule)] bg-white`}>
            <div className="font-semibold">Convergence</div>
            <div className="text-[13px] text-[var(--mk-ink-2)]">Short meetings, only when needed</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Checkout redesign: async contributions, one disagreement, a 15-minute call, a decision. */
export function DecisionFlow() {
  const step = "rounded-2xl border border-[var(--mk-rule)] bg-white p-4";
  return (
    <div className="grid gap-2.5">
      <div className={step}>
        <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--mk-green)]">
          Asynchronous · 4 days
        </div>
        <div className="font-semibold">Proposal: simplify address selection to reduce checkout abandonment</div>
        <ul className="mt-3 grid gap-1.5 text-[13.5px]">
          {[
            ["Product", "Customer friction evidence", "bg-emerald-100 text-emerald-800"],
            ["Design", "Alternative interaction", "bg-sky-100 text-sky-800"],
            ["Engineering", "Technical constraint", "bg-orange-100 text-orange-800"],
            ["Business", "Commercial consideration", "bg-violet-100 text-violet-800"],
          ].map(([team, what, c]) => (
            <li key={team} className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${c}`}>{team}</span>
              <span className="text-[var(--mk-ink-2)]">{what}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-[var(--mk-amber)]/30 bg-[var(--mk-amber-soft)] p-4">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--mk-amber)]">Unresolved disagreement</div>
        <p className="text-[14px] text-[#6b3a0b]">
          Everyone agrees address entry needs work. They disagree on removing manual entry versus redesigning the flow.
        </p>
      </div>
      <div className="flex items-center justify-center gap-1.5 text-[12px] text-[var(--mk-ink-2)]">
        <ArrowDown className="h-3.5 w-3.5" /> Only this goes to a call
      </div>
      <div className={step}>
        <div className="font-semibold">A focused 15-minute meeting</div>
        <p className="text-[13.5px] text-[var(--mk-ink-2)]">
          Resolve the one disagreement, instead of spending 45 minutes rebuilding the whole discussion.
        </p>
      </div>
      <div className="flex items-center justify-center text-[var(--mk-ink-2)]">
        <ArrowDown className="h-3.5 w-3.5" />
      </div>
      <div className="rounded-2xl border border-[var(--mk-green)]/25 bg-[var(--mk-green-soft)] p-4">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--mk-green)]">Decision</div>
        <p className="text-[14px] text-[#174c32]">
          The chosen approach, the rationale with its evidence, and the hand-off to execution, all linked back to the cards that shaped it.
        </p>
      </div>
    </div>
  );
}

/** Two AI modes: human + AI and AI + human. */
export function ModesDiagram() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-[var(--mk-rule)] bg-white p-4">
        <div className="mb-3 text-[13px] font-semibold text-[var(--mk-cyan)]">Human + AI</div>
        <div className="rounded-xl border border-[var(--mk-indigo)]/40 bg-[var(--mk-indigo-soft)] px-3 py-2 text-[12.5px] text-[var(--mk-indigo-deep)]">
          AI enriches: summary · topic · gaps
        </div>
        <div className="mt-1.5 rounded-xl border border-[var(--mk-cyan)]/40 bg-[var(--mk-cyan-soft)] px-3 py-5 text-[12.5px] text-[#0b5f72]">
          Base: the cards your team wrote
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--mk-rule)] bg-white p-4">
        <div className="mb-3 text-[13px] font-semibold text-[var(--mk-indigo)]">AI + human</div>
        <div className="rounded-xl border border-[var(--mk-cyan)]/40 bg-[var(--mk-cyan-soft)] px-3 py-5 text-[12.5px] text-[#0b5f72]">
          People enrich: edit · argue · post · build on it
        </div>
        <div className="mt-1.5 rounded-xl border border-dashed border-[var(--mk-indigo)]/60 bg-[var(--mk-indigo-soft)] px-3 py-2 text-[12.5px] text-[var(--mk-indigo-deep)]">
          Base: an AI draft card or opening card
        </div>
      </div>
      <p className="flex items-start gap-2 text-[13px] text-[var(--mk-ink-2)] sm:col-span-2">
        <CornerDownRight className="mt-0.5 h-4 w-4 shrink-0" />
        Either side can lay the base and either can enrich it. What people post becomes what the AI reads next.
      </p>
    </div>
  );
}

export { ArrowRight };
