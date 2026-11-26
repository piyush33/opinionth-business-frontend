// Product illustrations for the marketing site, drawn in HTML so they stay
// sharp and match the app's own cards (phase · role kicker, italic
// description, ruled footer, @id links).
// Styled as crisp windows: 1px ink outlines, hard shadows, pixel title bars.
import { ArrowDown } from "lucide-react";
import { PixelIcon } from "./Bitmap";

function Ref({ id }: { id: number }) {
  return <span className="font-semibold text-[var(--mk-indigo)]">@{id}</span>;
}

/** A window with a pixel title bar, the frame for every illustration. */
export function Window({
  title,
  children,
  className = "",
  dark = false,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div className={`mk-hard overflow-hidden rounded-[6px] ${dark ? "bg-[var(--mk-ink)]" : "bg-white"} ${className}`}>
      <div
        className={`flex items-center gap-2 border-b px-3 py-1.5 ${
          dark ? "border-white/15 text-white/70" : "border-[var(--mk-ink)] text-[var(--mk-ink)]"
        }`}
      >
        <span className="flex gap-1" aria-hidden>
          <span className={`h-2 w-2 ${dark ? "bg-white/70" : "bg-[var(--mk-ink)]"}`} />
          <span className={`h-2 w-2 ${dark ? "bg-white/40" : "bg-[var(--mk-ink)]/40"}`} />
          <span className={`h-2 w-2 ${dark ? "bg-white/20" : "bg-[var(--mk-ink)]/20"}`} />
        </span>
        <span className="mk-pixel truncate text-[10px]">{title}</span>
      </div>
      {children}
    </div>
  );
}

/** A card as it looks in the app: kicker (phase · roles), title, italic
 *  description, and a ruled footer with author and card number. */
export function MiniCard({
  author,
  initial,
  tint,
  phase,
  roles,
  children,
  title,
  no,
  className = "",
}: {
  author: string;
  initial: string;
  tint: string;
  phase: string;
  roles: string[];
  children?: React.ReactNode;
  title: string;
  no?: number;
  className?: string;
}) {
  return (
    <div className={`rounded-[5px] border border-[var(--mk-ink)] bg-white px-3.5 pb-3 pt-3.5 shadow-[2px_2px_0_var(--mk-ink)] ${className}`}>
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.09em]">
        <span className="text-[var(--mk-indigo)]">{phase}</span>
        {roles.map((r) => (
          <span key={r}>
            <span className="text-[var(--mk-ink-2)]"> · </span>
            <span className="text-[var(--mk-cyan)]">{r}</span>
          </span>
        ))}
      </p>
      <p className="mt-1.5 text-[13.5px] font-bold leading-snug tracking-[-0.03em] text-[var(--mk-ink)]">{title}</p>
      {children && <p className="mt-1.5 text-[12px] italic leading-snug text-[var(--mk-ink-2)]">{children}</p>}
      <div className="mt-3 flex items-center gap-1.5 border-t border-[var(--mk-rule)] pt-2 text-[11px] tracking-tight text-[var(--mk-ink-2)]">
        <span className={`grid h-4 w-4 place-items-center rounded-[2px] text-[8.5px] font-bold text-white ${tint}`}>{initial}</span>
        <span className="font-semibold text-[var(--mk-ink)]">@{author}</span>
        {no !== undefined && <span>· No. {no}</span>}
        <span className="ml-auto text-[var(--mk-ink)]" aria-hidden>↗</span>
      </div>
    </div>
  );
}

/** Hero: one live space, as a crisp window. */
export function HeroSpace() {
  return (
    <Window title="space://billing-architecture-rethink">
      <div className="p-4">
        <div className="mb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="mk-pixel text-[10px] text-[var(--mk-ink-2)]">Engineering · Space</div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[18px] font-bold tracking-[-0.03em] text-[var(--mk-indigo)]">Billing Architecture Rethink</span>
              <PixelIcon name="spark" color="var(--mk-indigo)" className="h-3.5 w-3.5" />
            </div>
            <p className="mt-0.5 text-[12.5px] text-[var(--mk-ink-2)]">Should we rebuild billing as an event-driven service?</p>
          </div>
          <div className="flex gap-1" aria-label="Participants in Berlin, Austin and Singapore">
            {[
              ["L", "bg-[var(--mk-indigo)]", "Berlin"],
              ["M", "bg-[var(--mk-cyan)]", "Austin"],
              ["W", "bg-[#d8628a]", "Singapore"],
            ].map(([i, c, city]) => (
              <span key={city} title={city} className={`grid h-6 w-6 place-items-center border border-[var(--mk-ink)] text-[10px] font-bold text-white ${c}`}>
                {i}
              </span>
            ))}
          </div>
        </div>

        {/* The scale of it: a discussion that has run for days, across phases */}
        <dl className="mb-3 grid grid-cols-4 border-l border-t border-[var(--mk-ink)]">
          {[
            ["64", "cards"],
            ["5", "phases"],
            ["3", "time zones"],
            ["11", "days open"],
          ].map(([n, l]) => (
            <div key={l} className="border-b border-r border-[var(--mk-ink)] px-2.5 py-1.5">
              <dd className="text-[15px] font-bold tabular-nums leading-none tracking-[-0.03em] text-[var(--mk-ink)]">{n}</dd>
              <dt className="mt-1 text-[9px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-ink-2)]">{l}</dt>
            </div>
          ))}
        </dl>

        <div className="mb-3 flex items-start gap-2 border border-dashed border-[var(--mk-cyan)] bg-[var(--mk-cyan-soft)] px-2.5 py-2 text-[12px] leading-snug text-[#08596c]">
          <PixelIcon name="spark" color="#08596c" className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            <b>Where it stands:</b> two options on the table, provider retry ordering contested, migration timing still a risk.
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid content-start gap-3">
            <MiniCard author="lena" initial="L" tint="bg-[var(--mk-indigo)]" phase="Hypothesis" roles={["Claim"]} no={142} title="Event-driven billing lets us add usage pricing without touching invoicing.">
              We believe events decouple metering from invoices; we&apos;ll know if a new plan ships in under a sprint.
            </MiniCard>
            <MiniCard author="marcus" initial="M" tint="bg-[var(--mk-cyan)]" phase="Hypothesis" roles={["Counter-claim"]} no={151} title="Ordering isn't guaranteed by our payment provider.">
              <Ref id={142} /> assumes events arrive in order. Provider retries arrive out of order today.
            </MiniCard>
          </div>
          <div className="grid content-start gap-3">
            <MiniCard author="wei" initial="W" tint="bg-[#d8628a]" phase="Discovery" roles={["Evidence"]} no={148} title="3 of the last 5 billing incidents were sync timeouts." />
            <MiniCard author="lena" initial="L" tint="bg-[var(--mk-indigo)]" phase="Specs" roles={["Risk"]} no={157} title="The migration window overlaps quarter-end close." />
            <div className="rounded-[5px] border border-dashed border-[var(--mk-indigo)] bg-[var(--mk-indigo-soft)] p-3">
              <div className="mk-pixel mb-1.5 flex items-center gap-1.5 text-[10px] text-[var(--mk-indigo-deep)]">
                <PixelIcon name="spark" color="var(--mk-indigo-deep)" className="h-3 w-3" /> Suggested · Mitigation
              </div>
              <p className="text-[12.5px] leading-snug text-[var(--mk-ink)]">
                Cut over after close: run both pipelines in shadow mode for two weeks, addressing <Ref id={157} />.
              </p>
            </div>
          </div>
        </div>

        {/* Only a slice is on screen: the rest of the space sits beneath */}
        <div className="relative mb-2 mt-4">
          <div aria-hidden className="absolute inset-x-3 -bottom-[7px] h-3 rounded-b-[5px] border border-t-0 border-[var(--mk-ink)] bg-white" />
          <div aria-hidden className="absolute inset-x-1.5 -bottom-[4px] h-3 rounded-b-[5px] border border-t-0 border-[var(--mk-ink)] bg-white" />
          <div className="relative flex items-center gap-2 rounded-[5px] border border-[var(--mk-ink)] bg-white px-3 py-2 text-[12px] tracking-tight">
            <span className="font-semibold text-[var(--mk-ink)]">+ 60 more cards</span>
            <span className="text-[var(--mk-ink-2)]">across Seed, Discovery, Hypothesis, Specs and Decision</span>
          </div>
        </div>
      </div>
    </Window>
  );
}

/** Today: two layers, with complex discussion squeezed into the meeting. Proposed: three. */
export function LayersDiagram() {
  const box = "border border-[var(--mk-ink)] bg-white px-3 py-3 text-center";
  const arrow = "hidden items-center justify-center text-[var(--mk-ink-2)] sm:flex mk-pixel text-[11px]";
  return (
    <div className="grid gap-5">
      <div>
        <div className="mk-pixel mb-2 text-[10px] text-[var(--mk-ink-2)]">Today: two layers</div>
        <div className="grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1.6fr]">
          <div className={box}>
            <div className="font-semibold tracking-tight">Chat</div>
            <div className="text-[12.5px] text-[var(--mk-ink-2)]">Linear and ephemeral</div>
          </div>
          <div className={arrow}>&lt;&gt;</div>
          <div className={box}>
            <div className="font-semibold tracking-tight">Meetings</div>
            <div className="mb-2.5 text-[12.5px] text-[var(--mk-ink-2)]">Compressed, context lost</div>
            <div className="border border-[var(--mk-amber)] bg-[var(--mk-amber-soft)] px-3 py-2">
              <div className="text-[13.5px] font-semibold text-[var(--mk-amber)]">Complex discussion</div>
              <div className="text-[12px] text-[var(--mk-amber)]">Squeezed into one hour</div>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-dashed border-[var(--mk-ink)]/30" />
      <div>
        <div className="mk-pixel mb-2 text-[10px] text-[var(--mk-ink-2)]">With Collabrr: three layers</div>
        <div className="grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1.5fr_auto_1fr]">
          <div className={box}>
            <div className="font-semibold tracking-tight">Signal</div>
            <div className="text-[12.5px] text-[var(--mk-ink-2)]">Chat for quick updates</div>
          </div>
          <div className={arrow}>&lt;&gt;</div>
          <div className="mk-hard-sm bg-[var(--mk-indigo)] px-3 py-3 text-center text-white">
            <div className="font-semibold tracking-tight">Reasoning</div>
            <div className="text-[12.5px] text-white/85">Collabrr: async, persistent</div>
          </div>
          <div className={arrow}>&lt;&gt;</div>
          <div className={box}>
            <div className="font-semibold tracking-tight">Convergence</div>
            <div className="text-[12.5px] text-[var(--mk-ink-2)]">Short calls, when needed</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Checkout redesign: async contributions, one disagreement, a 15-minute call, a decision. */
export function DecisionFlow() {
  return (
    <Window title="space://checkout-redesign">
      <div className="grid gap-2.5 p-4">
        <div className="border border-[var(--mk-ink)] p-3.5">
          <div className="mk-pixel mb-1 text-[10px] text-[var(--mk-green)]">Async · 4 days</div>
          <div className="font-semibold tracking-tight">Simplify address selection to reduce checkout abandonment</div>
          <ul className="mt-2.5 grid gap-1.5 text-[13px]">
            {[
              ["Product", "Customer friction evidence", "border-emerald-400 bg-emerald-50 text-emerald-800"],
              ["Design", "Alternative interaction", "border-sky-400 bg-sky-50 text-sky-800"],
              ["Engineering", "Technical constraint", "border-orange-400 bg-orange-50 text-orange-800"],
              ["Business", "Commercial consideration", "border-violet-400 bg-violet-50 text-violet-800"],
            ].map(([team, what, c]) => (
              <li key={team} className="flex items-center gap-2">
                <span className={`w-[86px] shrink-0 border px-1.5 py-px text-center text-[11px] font-semibold ${c}`}>{team}</span>
                <span className="text-[var(--mk-ink-2)]">{what}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border border-[var(--mk-amber)] bg-[var(--mk-amber-soft)] p-3.5">
          <div className="mk-pixel mb-1 text-[10px] text-[var(--mk-amber)]">Unresolved disagreement</div>
          <p className="text-[13.5px] text-[#663509]">
            Everyone agrees address entry needs work. They disagree on removing manual entry versus redesigning the flow.
          </p>
        </div>
        <div className="mk-pixel flex items-center justify-center gap-1.5 text-[10px] text-[var(--mk-ink-2)]">
          <ArrowDown className="h-3 w-3" /> Only this goes to a call
        </div>
        <div className="border border-[var(--mk-ink)] p-3.5">
          <div className="font-semibold tracking-tight">A focused 15-minute meeting</div>
          <p className="text-[13px] text-[var(--mk-ink-2)]">Resolve the one disagreement, not 45 minutes rebuilding the whole discussion.</p>
        </div>
        <div className="flex justify-center text-[var(--mk-ink-2)]">
          <ArrowDown className="h-3 w-3" />
        </div>
        <div className="border border-[var(--mk-green)] bg-[var(--mk-green-soft)] p-3.5">
          <div className="mk-pixel mb-1 text-[10px] text-[var(--mk-green)]">Decision</div>
          <p className="text-[13.5px] text-[#134a2e]">
            The chosen approach, the rationale with its evidence, and the hand-off to execution, linked to the cards that shaped it.
          </p>
        </div>
      </div>
    </Window>
  );
}

/** Two AI modes: human + AI and AI + human. */
export function ModesDiagram() {
  const human = "border border-[var(--mk-cyan)] bg-[var(--mk-cyan-soft)] px-3 py-4 text-[13px] text-[#08596c]";
  const ai = "border border-[var(--mk-indigo)] bg-[var(--mk-indigo-soft)] px-3 py-2 text-[13px] text-[var(--mk-indigo-deep)]";
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="border border-[var(--mk-ink)] bg-white p-4">
        <div className="mb-3 text-[14px] font-semibold tracking-tight text-[#08596c]">Human + AI</div>
        <div className={ai}>AI enriches: summary · topic · gaps</div>
        <div className={`${human} mt-1.5`}>Base: the cards your team wrote</div>
      </div>
      <div className="border border-[var(--mk-ink)] bg-white p-4">
        <div className="mb-3 text-[14px] font-semibold tracking-tight text-[var(--mk-indigo-deep)]">AI + human</div>
        <div className={human}>People enrich: edit · argue · post · build on it</div>
        <div className={`${ai} mt-1.5 border-dashed`}>Base: an AI draft or opening card</div>
      </div>
      <p className="text-[13px] text-[var(--mk-ink-2)] sm:col-span-2">
        Either side can lay the base and either can enrich it. What people post becomes what the AI reads next.
      </p>
    </div>
  );
}
