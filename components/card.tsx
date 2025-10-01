"use client";

import type React from "react";
import { useState } from "react";
import Image from "next/image";
import { Repeat2, Heart, Bookmark, Share, ExternalLink } from "lucide-react";

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
}

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
        matches.filter((m) => !/^@\d+$/.test(m)).map((m) => m.slice(1))
      ),
    ];
    const cards = [
      ...new Set(
        matches
          .filter((m) => /^@\d+$/.test(m))
          .map((m) => Number.parseInt(m.slice(1)))
      ),
    ];
    return { users, cards };
  }

  const refs = extractReferences(`${title} ${description} ${text}`);

  function parseAndRenderText(
    text: string,
    onUserClick: (username: string) => void,
    onCardClick: (id: number) => void
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
              className="text-purple-600 hover:underline cursor-pointer"
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
              className="text-blue-600 hover:underline cursor-pointer"
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

  return (
    <div
      className="relative group cursor-pointer mb-2 max-w-full"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Fourth layer (deepest shadow) */}
      <div
        className={`absolute inset-0 bg-white rounded-2xl border border-gray-400/60 shadow-sm transition-all duration-500 ease-out ${
          isHovered && !showActions
            ? "translate-x-1 translate-y-[5px] opacity-100"
            : "translate-x-0 translate-y-0 opacity-0"
        }`}
        style={{ zIndex: 1 }}
      ></div>

      {/* Third layer */}
      <div
        className={`absolute inset-0 bg-white rounded-2xl border border-gray-400/60 shadow-md transition-all duration-400 ease-out ${
          isHovered && !showActions
            ? "translate-x-0.5 translate-y-[1px] opacity-100"
            : "translate-x-0 translate-y-0 opacity-0"
        }`}
        style={{ zIndex: 2 }}
      ></div>

      {/* Second layer */}
      <div
        className={`absolute inset-0 bg-white rounded-2xl border border-gray-400/60 shadow-lg transition-all duration-300 ease-out ${
          isHovered && !showActions
            ? "translate-x-0 translate-y-[-3px] opacity-105"
            : "translate-x-0 translate-y-0 opacity-0"
        }`}
        style={{ zIndex: 3 }}
      ></div>

      {/* Main card */}
      <div
        className={`relative bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 ease-out hover:shadow-2xl  ${
          selected
            ? "ring-2 ring-purple-500 shadow-xl shadow-purple-100/50"
            : ""
        } ${
          isHovered && !showActions
            ? "shadow-2xl border-gray-300 -translate-y-1"
            : ""
        }`}
        style={{ zIndex: 10 }}
        id={`card-${cardData?.id}`}
      >
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-200/50 to-blue-200/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        {/* Card Header */}
        <div className="relative flex items-center justify-between p-3 sm:p-4 pb-2">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            {picture ? (
              <div className="relative flex-shrink-0">
                <Image
                  src={picture || "/placeholder.svg?height=40&width=40"}
                  alt={`${user}'s profile`}
                  width={40}
                  height={40}
                  className="w-10 h-10 sm:w-8 sm:h-8 rounded-full ring-2 ring-gray-100"
                />
              </div>
            ) : (
              <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-base sm:text-sm">
                  {user?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center space-x-2 min-w-0">
                <button
                  onClick={handleUserClick}
                  className="font-semibold text-gray-900 text-sm sm:text-sm hover:text-purple-600 transition-colors truncate"
                  title={`@${user}`}
                >
                  @{user}
                </button>
                {reposted && (
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <Repeat2 className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-green-600 font-medium hidden sm:inline">
                      reposted
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {weblink && (
            <div className="flex-shrink-0 ml-2">
              <a
                href={weblink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 sm:w-8 sm:h-8 bg-white/95 backdrop-blur-sm text-purple-600 hover:text-white hover:bg-purple-600 rounded-full transition-all duration-200 shadow-lg border border-purple-200 hover:border-purple-600 flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
                title="Open external link"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>

        {/* Card Body */}
        <div className="relative px-3 sm:px-4 pb-2">
          {text && (
            <p
              className="text-gray-800 text-sm sm:text-sm leading-relaxed mb-3 overflow-hidden text-ellipsis break-words"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 12,
                WebkitBoxOrient: "vertical",
              }}
            >
              {parseAndRenderText(text, onUserTagClick, onCardTagClick)}
            </p>
          )}

          {image && (
            <div className="relative rounded-xl overflow-hidden mb-3 w-full aspect-[4/3]">
              <Image
                src={dehtml(image)!}
                alt="Post image"
                referrerPolicy="no-referrer"
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover"
              />
            </div>
          )}
        </div>

        {/* Card Footer */}
        <div className="relative p-3 sm:p-4 pt-2">
          <h3 className="font-bold text-gray-900 text-lg sm:text-lg mb-2 leading-tight">
            {parseAndRenderText(title, onUserTagClick, onCardTagClick)}
          </h3>
          <p className="text-gray-600 text-sm sm:text-sm leading-relaxed mb-3">
            {parseAndRenderText(description, onUserTagClick, onCardTagClick)}
          </p>

          {/* Action Buttons - Only show if showActions is true */}
          {showActions && (
            <div className="border-t border-gray-100 pt-4 mt-3">
              <div className="flex items-center justify-start space-x-1 sm:space-x-3 mb-3">
                <button
                  onClick={(e) => onLike && cardData && onLike(e, cardData)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all duration-200 flex items-center justify-center ${
                    isLiked
                      ? "bg-red-500 text-white shadow-lg"
                      : "bg-white text-gray-600 hover:bg-red-50 hover:text-red-500 border border-gray-200 hover:border-red-200"
                  }`}
                >
                  <Heart
                    className={`w-3 h-3 sm:w-5 sm:h-5 ${
                      isLiked ? "fill-current" : ""
                    }`}
                  />
                </button>

                <button
                  onClick={(e) => onRepost && cardData && onRepost(e, cardData)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all duration-200 flex items-center justify-center ${
                    isReposted
                      ? "bg-green-500 text-white shadow-lg"
                      : "bg-white text-gray-600 hover:bg-green-50 hover:text-green-500 border border-gray-200 hover:border-green-200"
                  }`}
                >
                  <Repeat2 className="w-3 h-3 sm:w-5 sm:h-5" />
                </button>

                <button
                  onClick={(e) => onSave && cardData && onSave(e, cardData)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all duration-200 flex items-center justify-center ${
                    isSaved
                      ? "bg-blue-500 text-white shadow-lg"
                      : "bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-500 border border-gray-200 hover:border-blue-200"
                  }`}
                >
                  <Bookmark
                    className={`w-3 h-3 sm:w-5 sm:h-5 ${
                      isSaved ? "fill-current" : ""
                    }`}
                  />
                </button>

                <button
                  onClick={(e) => onShare && cardData && onShare(e, cardData)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-500 border border-gray-200 hover:border-purple-200 transition-all duration-200 flex items-center justify-center"
                >
                  <Share className="w-3 h-3 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Card ID - Bottom Right */}
              <div className="absolute bottom-[65px] right-3 sm:bottom-2 sm:right-2 z-20">
                <button
                  className="px-3 py-1.5 sm:px-2 sm:py-1 bg-gray-100/95 backdrop-blur-sm text-gray-700 hover:bg-purple-100 hover:text-purple-700 rounded-full text-[8px] sm:text-xs font-mono transition-all duration-200 border border-gray-200 hover:border-purple-300 shadow-sm"
                  title={`Tag this card with @${cardData?.id}`}
                >
                  #{cardData?.id}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
