"use client";

import type React from "react";
import { useState } from "react";
import Image from "next/image";
import {
  Repeat2,
  Heart,
  Bookmark,
  Share,
  ExternalLink,
} from "lucide-react";
import { getPhaseById, getRoleTypeById } from "@/lib/phases";

interface CardProps {
  id?: number;
  user: string;
  title: string;
  description: string;
  text?: string | null;
  image?: string | null;
  picture?: string;
  selected?: boolean;
  reposted?: boolean;
  showActions?: boolean;
  weblink?: string;
  onClick: () => void;
  onUserTagClick: (username: string) => void;
  onCardTagClick: (cardId: number) => void;
  onUserClick?: (e: React.MouseEvent, item: any) => void;
  onLike?: (e: React.MouseEvent, item: any) => void;
  onRepost?: (e: React.MouseEvent, item: any) => void;
  onSave?: (e: React.MouseEvent, item: any) => void;
  onShare?: (e: React.MouseEvent, item: any) => void;
  isLiked?: boolean;
  isReposted?: boolean;
  isSaved?: boolean;
  cardData?: any;
  phaseId?: string;
  roleTypeId?: string[];
  phaseLabelOverride?: string;
  feed?: string;
}

// Hover stack: the card rises out of a pile toward the viewer. The deepest
// sheet stays where the resting shadow is (+2px) and each layer above it lifts
// further up-left, the card most of all (-8px). Offsets are from the wrapper;
// relative to the card the sheets sit at 4, 7 and 10px. Layers that travel
// further take longer, so the pile unfolds outward rather than sinking.
const CARD_LIFT = { px: -8, ms: 570 };
const STACK_SHEETS = [
  { at: -4, ms: 570, z: 3 },
  { at: -1, ms: 470, z: 2 },
  { at: 2, ms: 370, z: 1 },
];

export default function Card({
  user,
  title,
  description,
  text,
  image,
  picture,
  selected = false,
  reposted = false,
  showActions = false,
  weblink,
  onClick,
  onUserTagClick,
  onCardTagClick,
  onUserClick,
  onLike,
  onRepost,
  onSave,
  onShare,
  isLiked = false,
  isReposted = false,
  isSaved = false,
  cardData,
  phaseId,
  roleTypeId,
  phaseLabelOverride,
  feed,
}: CardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showReferences, setShowReferences] = useState(false);

  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("More options clicked");
  };

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUserClick && cardData) {
      onUserClick(e, cardData);
    }
  };

  const dehtml = (s?: string | null) => s?.replaceAll("&amp;", "&") ?? null;

  function extractReferences(text: string | undefined | null) {
    const regex = /@(\w+)/g;
    const matches = text?.match(regex) || [];
    const users = [
      ...new Set(
        matches.filter((m) => !/^@\d+$/.test(m)).map((m) => m.slice(1)),
      ),
    ];
    const cards = [
      ...new Set(
        matches
          .filter((m) => /^@\d+$/.test(m))
          .map((m) => Number.parseInt(m.slice(1))),
      ),
    ];
    return { users, cards };
  }

  const refs = extractReferences(`${title} ${description} ${text}`);

  function parseAndRenderText(
    text: string,
    onUserClick: (username: string) => void,
    onCardClick: (id: number) => void,
  ) {
    const regex = /(@\w+)/g;
    const parts = text?.split(regex);

    return parts?.map((part, i) => {
      if (part.startsWith("@")) {
        if (/^@\d+$/.test(part)) {
          const cardId = Number.parseInt(part.slice(1));
          return (
            <span
              key={i}
              className="font-semibold text-[var(--mk-indigo)] hover:underline cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onCardClick(cardId);
              }}
            >
              {part}
            </span>
          );
        } else {
          const username = part.slice(1);
          return (
            <span
              key={i}
              className="font-medium text-[var(--mk-cyan-deep,#08596c)] hover:underline cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onUserClick(username);
              }}
            >
              {part}
            </span>
          );
        }
      } else {
        return <span key={i}>{part}</span>;
      }
    });
  }

  const phaseMeta = getPhaseById(phaseId);
  const toTitleCase = (s: string) =>
    s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const roleIds = Array.isArray(roleTypeId)
    ? roleTypeId
    : roleTypeId
      ? [roleTypeId]
      : [];

  const roleMetas = roleIds
    .filter((id): id is string => !!id && typeof id === "string")
    .map(
      (id) =>
        getRoleTypeById(id) ?? { id, name: toTitleCase(id), description: "" },
    );

  // Bitmap theme: same anatomy as the landing page's essay cards. A white
  // sheet on a 2px printed shadow; a kicker line (phase in indigo, roles in
  // cyan); the title; the text; a hairline footer. Hover lifts it to 6px.
  const kicker = [
    feed === "explore" && phaseMeta
      ? { key: "phase", label: phaseLabelOverride ?? phaseMeta.name, title: `${phaseMeta.name}: ${phaseMeta.description}`, color: "var(--mk-indigo)" }
      : null,
    ...roleMetas.map((m) => ({ key: m.id, label: m.name, title: m.description ? `${m.name}: ${m.description}` : m.name, color: "var(--mk-cyan)" })),
  ].filter(Boolean) as { key: string; label: string; title: string; color: string }[];

  const actionBtn = (on: boolean) =>
    `grid h-9 w-9 place-items-center rounded-[4px] border border-[var(--mk-ink)] transition-colors ${
      on ? "bg-[var(--mk-ink)] text-white" : "bg-white text-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)]"
    }`;

  return (
    <div
      className="group relative mb-2 max-w-full cursor-pointer"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!selected && !showActions &&
        STACK_SHEETS.map((sh) => (
          <div
            key={sh.at}
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[5px] border border-[var(--mk-paper)] bg-[var(--mk-ink)] ease-out motion-reduce:transition-none"
            style={{
              zIndex: sh.z,
              transitionProperty: "transform, opacity",
              transitionDuration: `${sh.ms}ms`,
              transform: isHovered ? `translate(${sh.at}px, ${sh.at}px)` : "translate(0, 0)",
              opacity: isHovered ? 1 : 0,
            }}
          />
        ))}
      <div
        id={`card-${cardData?.id}`}
        className={`relative z-[4] flex flex-col overflow-hidden rounded-[5px] border bg-white transition-[transform,box-shadow] ease-out motion-reduce:transition-none ${
          selected
            ? "border-[var(--mk-indigo)] shadow-[4px_4px_0_var(--mk-indigo)] -translate-x-0.5 -translate-y-0.5"
            : `border-[var(--mk-ink)] ${
                isHovered && !showActions
                  ? "shadow-[0_0_0_var(--mk-ink)]"
                  : "shadow-[2px_2px_0_var(--mk-ink)]"
              }`
        }`}
        style={{
          transitionDuration: `${CARD_LIFT.ms}ms`,
          ...(!selected && isHovered && !showActions
            ? { transform: `translate(${CARD_LIFT.px}px, ${CARD_LIFT.px}px)` }
            : {}),
        }}
      >
        <div className="px-4 pb-4 pt-4 sm:px-5 sm:pt-5">
          {(kicker.length > 0 || weblink) && (
            <div className="mb-3 flex items-start gap-3">
              <div className="min-w-0 flex-1 text-[10.5px] font-semibold uppercase leading-[1.5] tracking-[0.1em] sm:text-[11px]">
                {kicker.map((k, i) => (
                  <span key={k.key} title={k.title}>
                    {i > 0 && <span className="text-[var(--mk-rule)]"> · </span>}
                    <span style={{ color: k.color }}>{k.label}</span>
                  </span>
                ))}
              </div>
              {weblink && (
                <a
                  href={weblink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Open external link"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-white text-[var(--mk-ink)] transition-colors hover:bg-[var(--mk-ink)] hover:text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}

          <h3
            className={`text-[1.05rem] font-bold leading-[1.22] tracking-[-0.03em] transition-colors sm:text-[1.14rem] ${
              isHovered || selected ? "text-[var(--mk-indigo)]" : "text-[var(--mk-ink)]"
            }`}
          >
            {parseAndRenderText(title, onUserTagClick, onCardTagClick)}
          </h3>

          {description && (
            <p className="mt-2 text-[13.5px] italic leading-[1.5] tracking-[-0.01em] text-[var(--mk-ink-2)] sm:text-[14px]">
              {parseAndRenderText(description, onUserTagClick, onCardTagClick)}
            </p>
          )}

          {text && (
            <p
              className="mt-2.5 overflow-hidden text-ellipsis break-words text-[13.5px] leading-[1.6] tracking-[-0.01em] text-[var(--mk-ink)] sm:text-[14px]"
              style={{ display: "-webkit-box", WebkitLineClamp: 36, WebkitBoxOrient: "vertical" }}
            >
              {parseAndRenderText(text, onUserTagClick, onCardTagClick)}
            </p>
          )}

          {image && (
            <div className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-[4px] border border-[var(--mk-ink)]">
              <Image
                src={dehtml(image)! || "/placeholder.svg"}
                alt="Post image"
                referrerPolicy="no-referrer"
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover"
              />
            </div>
          )}

          {/* Footer: who, and the card's number */}
          <div className="mt-4 flex items-center gap-2 border-t border-[var(--mk-rule)] pt-3 text-[12.5px] tracking-tight text-[var(--mk-ink-2)] sm:text-[13px]">
            {picture ? (
              <Image
                src={picture}
                alt=""
                width={20}
                height={20}
                className="h-5 w-5 shrink-0 rounded-[3px] border border-[var(--mk-ink)] object-cover"
              />
            ) : (
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[3px] bg-[var(--mk-indigo)] text-[10px] font-bold text-white">
                {user?.charAt(0).toUpperCase()}
              </span>
            )}
            <button
              onClick={handleUserClick}
              className="truncate font-semibold text-[var(--mk-ink)] hover:text-[var(--mk-indigo)]"
              title={`@${user}`}
            >
              @{user}
            </button>
            {reposted && (
              <span className="inline-flex shrink-0 items-center gap-1 text-[var(--mk-green)]">
                <Repeat2 className="h-3 w-3" />
                <span className="hidden sm:inline">reposted</span>
              </span>
            )}
            {cardData?.id != null && <span className="shrink-0 tabular-nums">· No. {cardData.id}</span>}
            <span
              aria-hidden
              className={`ml-auto shrink-0 transition-colors ${isHovered || selected ? "text-[var(--mk-indigo)]" : ""}`}
            >
              ↗
            </span>
          </div>

          {/* Actions (space page) */}
          {showActions && (
            <div className="mt-3 flex items-center gap-2 border-t border-dashed border-[var(--mk-rule)] pt-3">
              <button onClick={(e) => { e.stopPropagation(); if (onLike && cardData) onLike(e, cardData); }} className={actionBtn(isLiked)} aria-label="Like" aria-pressed={isLiked}>
                <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); if (onRepost && cardData) onRepost(e, cardData); }} className={actionBtn(isReposted)} aria-label="Repost" aria-pressed={isReposted}>
                <Repeat2 className="h-4 w-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); if (onSave && cardData) onSave(e, cardData); }} className={actionBtn(isSaved)} aria-label="Save" aria-pressed={isSaved}>
                <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); if (onShare && cardData) onShare(e, cardData); }} className={actionBtn(false)} aria-label="Share">
                <Share className="h-4 w-4" />
              </button>
              {cardData?.id != null && (
                <span
                  className="ml-auto rounded-[3px] border border-[var(--mk-ink)] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--mk-ink)]"
                  title={`Link this card with @${cardData.id}`}
                >
                  @{cardData.id}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
