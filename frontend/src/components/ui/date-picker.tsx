"use client";

import * as React from "react";
import { useRegionalFormat } from "@/components/preferences/preferencesProvider";
import { parseRegionalDate } from "@/lib/regional-format";

import {
  fromDate,
  parseDate,
  toCalendarDate,
  type CalendarDate,
} from "@internationalized/date";

import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { Calendar } from "@/components/ui/calendar";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

import { Popover, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerInputProps {
  className?: string;
  id?: string;

  // YYYY-MM-DD
  value?: string;

  onChange?: (value: string) => void;

  placeholder?: string;
  disabled?: boolean;
  monthOnly?: boolean;
  minValue?: string;
  maxValue?: string;
}

function isValidDate(date: Date | undefined) {
  if (!date) {
    return false;
  }

  return !Number.isNaN(date.getTime());
}

function getCalendarDate(value?: string): CalendarDate | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return parseDate(value);
  } catch {
    return undefined;
  }
}

export function DatePickerInput({
  className,
  id,
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  monthOnly = false,
  minValue,
  maxValue,
}: DatePickerInputProps) {
  const { formatDate: displayDate, locale, today } = useRegionalFormat();
  const formatDate = React.useCallback((date: CalendarDate, onlyMonth: boolean) => displayDate(date.toString(), {
    ...(onlyMonth ? {} : { day: "2-digit" }), month: "2-digit", year: "numeric",
  }), [displayDate]);
  const [open, setOpen] = React.useState(false);

  const initialDate = getCalendarDate(value);

  const [date, setDate] = React.useState<CalendarDate | undefined>(initialDate);

  const [month, setMonth] = React.useState<CalendarDate | undefined>(
    initialDate,
  );

  const [inputValue, setInputValue] = React.useState(() => {
    if (!initialDate) {
      return "";
    }

    return formatDate(initialDate, monthOnly);
  });

  // Keep picker synced with parent form value
  React.useEffect(() => {
    const newDate = getCalendarDate(value);

    setDate(newDate);

    if (newDate) {
      setMonth(newDate);

      setInputValue(formatDate(newDate, monthOnly));
    } else {
      setInputValue("");
    }
  }, [value, monthOnly, formatDate]);

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;

    setInputValue(newValue);

    if (!newValue.trim()) {
      setDate(undefined); onChange?.(""); return;
    }
    let calendarDate = getCalendarDate(parseRegionalDate(newValue, locale, monthOnly));
    // Keep accepting the previously supported English month names.
    if (!calendarDate && /[a-z]/i.test(newValue)) {
      const parsedDate = new Date(`${newValue} UTC`);
      if (isValidDate(parsedDate)) calendarDate = toCalendarDate(fromDate(parsedDate, "UTC"));
    }
    if (!calendarDate) return;

    if ((minValue && calendarDate.toString() < minValue) || (maxValue && calendarDate.toString() > maxValue)) return;
    setDate(calendarDate);
    setMonth(calendarDate);

    onChange?.(calendarDate.toString());
  };

  return (
    <div id={id} className={cn("relative", className)}>
      <InputGroup>
        <InputGroupInput
          id={id ? `${id}-input` : undefined}
          disabled={disabled}
          value={inputValue}
          placeholder={placeholder}
          onChange={handleTextChange}
          onKeyDown={(event) => {
            if (!disabled && event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
            }
          }}
        />

        <InputGroupAddon align="inline-end">
          <PopoverTrigger isOpen={open} onOpenChange={(nextOpen) => { if (!disabled) setOpen(nextOpen); }}>
            <InputGroupButton
              id={id ? `${id}-date-picker` : undefined}
              variant="ghost"
              size="icon-xs"
              isDisabled={disabled}
              aria-label={monthOnly ? "Select financial month" : "Select date"}
            >
              <CalendarIcon />

              <span className="sr-only">Select date</span>
            </InputGroupButton>

            <Popover
              className="w-auto overflow-hidden p-0"
              placement="bottom end"
              crossOffset={-8}
              offset={10}
            >
              <Calendar
                defaultFocusedValue={getCalendarDate(today())}
                isDisabled={disabled}
                minValue={getCalendarDate(minValue)}
                maxValue={getCalendarDate(maxValue)}
                value={date}
                focusedValue={month}
                onFocusChange={(newMonth) => setMonth(newMonth)}
                onChange={(selectedDate) => {
                  if (!selectedDate) {
                    setDate(undefined);
                    setInputValue("");

                    onChange?.("");

                    setOpen(false);

                    return;
                  }

                  setDate(selectedDate);
                  setMonth(selectedDate);

                  setInputValue(
                    formatDate(selectedDate, monthOnly),
                  );

                  // Gives parent YYYY-MM-DD
                  onChange?.(selectedDate.toString());

                  setOpen(false);
                }}
              />
            </Popover>
          </PopoverTrigger>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
