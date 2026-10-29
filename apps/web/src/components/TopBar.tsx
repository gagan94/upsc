"use client";

import { forwardRef } from "react";
import type { UserView } from "@/lib/types";
import { Icon } from "./Icon";
import { UserMenu } from "./UserMenu";

interface Props {
  user: UserView;
  navOpen: boolean;
  onToggleNav: () => void;
  onAskAi: () => void;
}

export const TopBar = forwardRef<HTMLButtonElement, Props>(function TopBar(
  { user, navOpen, onToggleNav, onAskAi },
  askRef,
) {
  return (
    <header className="flex h-20 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 md:px-6">
      <button
        type="button"
        aria-label={navOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={navOpen}
        aria-controls="app-sidebar"
        onClick={onToggleNav}
        className="rounded-control border border-border p-2 text-text md:hidden"
      >
        <Icon name="menu" />
      </button>
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-primary">AI UPSC</span>
        <span className="hidden rounded-full border border-border bg-bg px-3 py-1 text-[11px] text-muted lg:inline">
          Demo · UPSC preparation
        </span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <label className="hidden items-center gap-2 rounded-control border border-border bg-bg px-3 py-2 text-sm text-muted md:flex md:w-64 lg:w-80">
          <Icon name="search" size={16} />
          <input
            type="search"
            readOnly
            placeholder="Search topics, news, notes"
            aria-label="Search"
            className="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-muted"
          />
          <kbd className="text-[11px]">⌘ K</kbd>
        </label>
        <button
          ref={askRef}
          type="button"
          onClick={onAskAi}
          className="rounded-control bg-primary px-4 py-2 text-sm font-semibold text-primary-text"
        >
          Ask AI
        </button>
        <button
          type="button"
          aria-label="Notifications, 3 unread"
          className="relative rounded-control border border-border p-2 text-text"
        >
          <Icon name="bell" />
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-primary-text">
            3
          </span>
        </button>
        <UserMenu user={user} />
      </div>
    </header>
  );
});
