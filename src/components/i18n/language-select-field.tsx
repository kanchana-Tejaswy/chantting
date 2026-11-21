"use client";

import * as React from "react";
import { Check, ChevronDown, Globe, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  SUPPORTED_LANGUAGES,
  getLanguageDefinition,
  type LanguageCode,
  type LanguageDefinition,
} from "@/lib/i18n/languages";

export interface LanguageSelectFieldProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: LanguageCode) => void;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
}

export function LanguageSelectField({
  id = "acc-lang",
  name = "preferredLanguage",
  value,
  onChange,
  disabled = false,
  className,
  hasError = false,
}: LanguageSelectFieldProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const triggerButtonRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const selectedLangDef = React.useMemo<LanguageDefinition>(() => {
    return getLanguageDefinition(value);
  }, [value]);

  const filteredLanguages = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return SUPPORTED_LANGUAGES;
    return SUPPORTED_LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        l.script.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Focus search input when popover opens
  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Handle click outside and Escape key
  React.useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerButtonRef.current?.focus();
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (code: LanguageCode) => {
    onChange(code);
    setIsOpen(false);
    triggerButtonRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full", className)}
      suppressHydrationWarning
    >
      {/* Hidden input for standard form submission compatibility */}
      <input type="hidden" name={name} value={value} />

      {/* Styled Trigger Control */}
      <button
        ref={triggerButtonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-popup`}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        suppressHydrationWarning
        className={cn(
          "flex w-full min-h-11 items-center justify-between rounded-[10px] border bg-paper px-3.5 py-2 text-left text-sm transition-[border-color,box-shadow,background-color] duration-150 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-antique focus-visible:border-gold-border",
          hasError
            ? "border-kumkum focus-visible:ring-kumkum"
            : isOpen
              ? "border-gold-antique ring-2 ring-gold-antique/25 shadow-sacred-sm"
              : "border-sandalwood-strong hover:border-ink-muted",
          disabled && "cursor-not-allowed opacity-55"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-gold-wash border border-gold-border/40 text-gold-ink">
            <Globe className="size-3.5" aria-hidden="true" />
          </span>
          <div className="flex items-baseline gap-2 truncate">
            <span className="font-semibold text-ink text-sm">
              {selectedLangDef.nativeName}
            </span>
            <span className="text-xs text-ink-muted">
              ({selectedLangDef.name})
            </span>
            <span className="hidden sm:inline-block rounded bg-linen px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
              {selectedLangDef.script}
            </span>
          </div>
        </div>

        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-ink-muted transition-transform duration-200",
            isOpen && "rotate-180 text-gold-ink"
          )}
          aria-hidden="true"
        />
      </button>

      {/* Elegant Dropdown Popover */}
      {isOpen && (
        <div
          id={`${id}-popup`}
          role="listbox"
          aria-label="Select preferred language"
          className="absolute z-50 left-0 right-0 top-full mt-1.5 rounded-xl border border-sandalwood-strong/80 bg-paper/98 p-2 text-ink shadow-[0_16px_36px_-10px_rgba(26,19,21,0.22)] backdrop-blur-xl ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {/* Quick Search Input */}
          <div className="relative mb-2 px-1 pt-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in English or native script..."
              className="w-full rounded-lg border border-sandalwood-border bg-linen/50 py-1.5 pl-8 pr-7 text-xs text-ink placeholder:text-ink-muted focus:border-gold-antique focus:bg-paper focus:outline-none focus:ring-1 focus:ring-gold-antique"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-ink-muted hover:text-ink"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Language Options List */}
          <div
            ref={listRef}
            className="max-h-72 overflow-y-auto space-y-1 overscroll-contain pr-1"
          >
            {filteredLanguages.length === 0 ? (
              <div className="py-6 text-center text-xs text-ink-muted">
                No matching languages found
              </div>
            ) : (
              filteredLanguages.map((item) => {
                const isSelected = item.code === value;
                return (
                  <button
                    key={item.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(item.code)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors duration-100",
                      isSelected
                        ? "bg-gold-wash border border-gold-border/50 text-ink shadow-2xs"
                        : "text-ink hover:bg-linen"
                    )}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-ink">
                          {item.nativeName}
                        </span>
                        <span className="text-xs text-ink-muted">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-ink-muted/80">
                        {item.script} · {item.code.toUpperCase()}
                        {item.needsReview && (
                          <span className="ml-1 text-gold-ink/85 italic">
                            · Review pending
                          </span>
                        )}
                      </span>
                    </div>

                    {isSelected && (
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gold-antique text-ink-on-dark shadow-xs">
                        <Check className="size-3" strokeWidth={2.5} aria-hidden="true" />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Clean Footer Counter */}
          <div className="mt-2 flex items-center justify-between border-t border-sandalwood-border/70 px-2 pt-1.5 text-[10px] text-ink-muted">
            <span>20 Languages (19 Indian + English)</span>
            <span className="font-medium text-gold-ink">SMARAN</span>
          </div>
        </div>
      )}
    </div>
  );
}
