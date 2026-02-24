"use client";

import React, { forwardRef, useId, useState } from "react";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Error message shown below the input; also switches border to danger colour */
  error?: string;
  /** Icon node rendered on the left (e.g. a Lucide icon at 16px) */
  icon?: React.ReactNode;
  /** Element rendered on the right (e.g. "₹" currency symbol, clear button) */
  rightElement?: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      icon,
      rightElement,
      className = "",
      id,
      onFocus,
      onBlur,
      disabled,
      ...rest
    },
    ref,
  ) => {
    // Auto-generate a stable id for label–input association when none is given.
    const autoId = useId();
    const inputId = id ?? autoId;

    const [focused, setFocused] = useState(false);
    const hasError = Boolean(error);

    // ── Wrapper border + shadow ─────────────────────────────────────────────
    // Three-tier priority: focused > error > default.
    // Computed here so the exact design-token values (CSS vars) are used;
    // the arbitrary rgba() focus ring can't be expressed in Tailwind classes
    // without an unsafe hack, so inline style is the right tool.
    const wrapperStyle: React.CSSProperties = {
      transition: "border-color 150ms ease, box-shadow 150ms ease",
      ...(focused
        ? {
            borderColor: "var(--border-input-focus)", // deep gold #8A7340
            boxShadow: "0 0 0 3px rgba(138, 115, 64, 0.15)",
          }
        : hasError
          ? {
              borderColor: "var(--color-danger)", // muted brick #B85C5C
            }
          : {
              borderColor: "var(--border-input)", // soft linen #C5C0B8
            }),
    };

    return (
      <div className="flex flex-col gap-1">
        {/* ── Label ──────────────────────────────────────────────────────── */}
        {label && (
          <label
            htmlFor={inputId}
            className="font-body text-sm leading-none text-ink-secondary select-none"
          >
            {label}
          </label>
        )}

        {/* ── Input wrapper ───────────────────────────────────────────────── */}
        {/* The wrapper div shows the border/focus ring; the inner <input> is borderless */}
        <div
          style={wrapperStyle}
          className={[
            "flex items-center gap-2",
            "bg-stone-input",           // var(--bg-input) slightly lighter parchment
            "border",                   // thickness set; colour from wrapperStyle above
            "rounded-sm",              // var(--radius-sm) = 6px (overridden in @theme)
            "px-4 py-3",               // 16px / 12px — comfortable touch target
            // Disabled: dim the whole wrapper, not just the input
            disabled && "opacity-50 cursor-not-allowed",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {/* Left icon ────────────────────────────────────────────────────── */}
          {icon && (
            <span className="shrink-0 text-ink-secondary leading-none" aria-hidden="true">
              {icon}
            </span>
          )}

          {/* Input field ──────────────────────────────────────────────────── */}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            // `outline-none` removes the native focus ring — we replace it on
            // the wrapper above. `min-w-0` prevents flex overflow on long values.
            className={[
              "flex-1 min-w-0",
              "bg-transparent outline-none",
              "font-body text-base leading-none text-ink-primary",
              "placeholder:text-ink-tertiary",
              "disabled:cursor-not-allowed",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? `${inputId}-error` : undefined}
            {...rest}
          />

          {/* Right element ─────────────────────────────────────────────────── */}
          {rightElement && (
            <span className="shrink-0 text-ink-secondary leading-none">
              {rightElement}
            </span>
          )}
        </div>

        {/* ── Error message ──────────────────────────────────────────────── */}
        {hasError && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="font-body text-sm leading-none text-danger"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
