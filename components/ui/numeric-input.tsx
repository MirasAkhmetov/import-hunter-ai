"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { parseNumericInput } from "@/lib/parseLocalizedPrice";

interface NumericInputProps
  extends Omit<
    React.ComponentProps<typeof Input>,
    "value" | "onChange" | "type"
  > {
  value: number;
  onChange: (value: number) => void;
  allowEmpty?: boolean;
}

const DECIMAL_PATTERN = /^-?[\d.,\s]*$/;

export function NumericInput({
  value,
  onChange,
  allowEmpty = false,
  onFocus,
  onBlur,
  ...props
}: NumericInputProps) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(String(value));
    }
  }, [value, focused]);

  const commitText = (raw: string) => {
    if (raw === "" || raw === "." || raw === "-") {
      const fallback = allowEmpty ? 0 : value;
      onChange(fallback);
      setText(String(fallback));
      return fallback;
    }

    const parsed = parseNumericInput(raw);
    if (parsed != null) {
      onChange(parsed);
      setText(String(parsed));
      return parsed;
    }

    setText(String(value));
    return value;
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={text}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        commitText(text);
        onBlur?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw !== "" && !DECIMAL_PATTERN.test(raw)) return;

        setText(raw);

        if (raw === "" || raw === "." || raw === "-") {
          if (allowEmpty) return;
          return;
        }

        const parsed = parseNumericInput(raw);
        if (parsed != null) {
          onChange(parsed);
        }
      }}
    />
  );
}
