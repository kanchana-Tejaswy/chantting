"use client";

import * as React from "react";
import { Check, Globe, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTranslation } from "@/lib/i18n/context";
import type { LanguageCode, LanguageDefinition } from "@/lib/i18n/languages";

export interface LanguageSelectorProps {
  className?: string;
  variant?: "pill" | "button" | "compact" | "card";
  onSelect?: (code: LanguageCode) => void;
}

export function LanguageSelector({
  className,
  variant = "pill",
  onSelect,
}: LanguageSelectorProps) {
  const { language, setLanguage, languages, langDef, t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  // Auto-focus search input when dialog opens
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

  // Close on Escape key or outside click
  React.useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const filteredLanguages = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return languages;
    return languages.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        l.script.toLowerCase().includes(q)
    );
  }, [languages, searchQuery]);

  const handleSelect = async (code: LanguageCode) => {
    await setLanguage(code);
    onSelect?.(code);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className={cn("relative inline-block", className)}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Select language (current: ${langDef.name})`}
        title={`Language: ${langDef.name} (${langDef.nativeName})`}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "group inline-flex items-center gap-2 rounded-full transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C79A3B] focus-visible:ring-offset-2",
          variant === "pill" &&
            "border border-[#E5BF73]/28 bg-[#1E150E]/60 px-3.5 py-1.5 text-xs font-medium text-[#FBF7EE] backdrop-blur-md hover:border-[#E5BF73]/55 hover:bg-[#1E150E]/85 shadow-sm",
          variant === "button" &&
            "size-9 shrink-0 sm:size-auto sm:min-h-9 justify-center border border-[#D8CCBC] bg-[#FAF7F2] p-0 sm:px-3 sm:py-1.5 text-xs font-medium text-[#1F1D1A] shadow-xs hover:border-[#C29438] hover:bg-[#F4EFE6]",
          variant === "compact" &&
            "p-1.5 text-[#E5BF73] hover:bg-[#1E150E]/50 rounded-full",
          variant === "card" &&
            "w-full justify-between rounded-xl border border-[#D8CCBC] bg-[#FAF7F2] p-3 text-left hover:border-[#C29438]"
        )}
      >
        <Globe
          className="size-4 sm:size-3.5 text-[#C79A3B] shrink-0 transition-transform duration-200 group-hover:rotate-12"
          strokeWidth={1.8}
          aria-hidden="true"
        />
        <span className="font-medium tracking-wide hidden sm:inline">
          {langDef.nativeName}
        </span>
        <span className="text-[11px] opacity-75 hidden md:inline">
          ({langDef.name})
        </span>
      </button>

      {/* Accessible Searchable Selection Dialog / Dropdown */}
      {isOpen && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-label={t("common.selectLanguage", "Select Language")}
          className="absolute end-0 top-full mt-2 z-50 w-72 max-w-[calc(100vw-1.5rem)] sm:w-80 md:w-96 rounded-2xl border border-[#E5BF73]/35 bg-[#1B120B]/95 p-3.5 text-[#FBF7EE] shadow-2xl backdrop-blur-xl ring-1 ring-black/40 animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            boxShadow:
              "0 20px 35px -8px rgba(0,0,0,0.65), 0 0 1px 1px rgba(229,191,115,0.25)",
          }}
        >
          {/* Header & Search Input */}
          <div className="mb-2.5 flex items-center justify-between border-b border-[#E5BF73]/20 pb-2.5">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-[#E5BF73]" aria-hidden="true" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#E5BF73]">
                {t("common.selectLanguage", "Select Language")} ({languages.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-[#DECDB1]/80 hover:bg-[#E5BF73]/15 hover:text-[#FBF7EE] transition-colors"
              aria-label={t("common.close", "Close")}
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative mb-2.5">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#DECDB1]/60"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("common.searchLanguage", "Search in English or native script...")}
              className="w-full rounded-xl border border-[#E5BF73]/25 bg-[#26190F]/80 py-1.5 pl-8 pr-3 text-xs text-[#FBF7EE] placeholder-[#DECDB1]/50 focus:border-[#E5BF73] focus:outline-none focus:ring-1 focus:ring-[#E5BF73]"
            />
          </div>

          {/* Language Options List */}
          <div
            className="max-h-72 overflow-y-auto space-y-1 pr-1 overscroll-contain"
            role="listbox"
            tabIndex={-1}
          >
            {filteredLanguages.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#DECDB1]/70">
                No matching languages found
              </div>
            ) : (
              filteredLanguages.map((item) => {
                const isSelected = item.code === language;
                return (
                  <button
                    key={item.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(item.code)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors",
                      isSelected
                        ? "bg-[#C79A3B]/25 text-[#FBF7EE] border border-[#C79A3B]/45 font-medium"
                        : "text-[#FBF7EE]/90 hover:bg-[#2F2014]/70 hover:text-[#FBF7EE]"
                    )}
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[13px] text-[#FBF7EE]">
                          {item.nativeName}
                        </span>
                        <span className="text-[11px] text-[#DECDB1]/70">
                          {item.name}
                        </span>
                        {item.dir === "rtl" && (
                          <span className="rounded bg-[#C79A3B]/20 px-1 py-0.2 text-[9px] font-semibold text-[#E5BF73] uppercase tracking-wider">
                            RTL
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#DECDB1]/55">
                        {item.script} · {item.code.toUpperCase()}
                        {item.needsReview && (
                          <span className="ml-1.5 text-[#E5BF73]/75 italic">
                            · Native review pending
                          </span>
                        )}
                      </span>
                    </div>

                    {isSelected && (
                      <Check
                        className="size-4 shrink-0 text-[#E5BF73]"
                        strokeWidth={2.2}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="mt-2.5 flex items-center justify-between border-t border-[#E5BF73]/15 pt-2 text-[10px] text-[#DECDB1]/65">
            <span>{languages.length} Sacred & Regional Languages</span>
            <span>SMARAN Multilingual</span>
          </div>
        </div>
      )}
    </div>
  );
}
