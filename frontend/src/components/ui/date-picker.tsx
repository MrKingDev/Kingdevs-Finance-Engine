"use client";

import * as React from "react";

import {
  fromDate,
  getLocalTimeZone,
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
}

function formatDate(date: Date | undefined) {
  if (!date) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
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
}: DatePickerInputProps) {
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

    return formatDate(initialDate.toDate(getLocalTimeZone()));
  });

  // Keep picker synced with parent form value
  React.useEffect(() => {
    const newDate = getCalendarDate(value);

    setDate(newDate);

    if (newDate) {
      setMonth(newDate);

      setInputValue(formatDate(newDate.toDate(getLocalTimeZone())));
    } else {
      setInputValue("");
    }
  }, [value]);

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;

    setInputValue(newValue);

    const parsedDate = new Date(newValue);

    if (!isValidDate(parsedDate)) {
      return;
    }

    const calendarDate = toCalendarDate(
      fromDate(parsedDate, getLocalTimeZone()),
    );

    setDate(calendarDate);
    setMonth(calendarDate);

    onChange?.(calendarDate.toString());
  };

  return (
    <div id={id} className={cn("relative", className)}>
      <InputGroup>
        <InputGroupInput
          id={id ? `${id}-input` : undefined}
          value={inputValue}
          placeholder={placeholder}
          onChange={handleTextChange}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
            }
          }}
        />

        <InputGroupAddon align="inline-end">
          <PopoverTrigger isOpen={open} onOpenChange={setOpen}>
            <InputGroupButton
              id={id ? `${id}-date-picker` : undefined}
              variant="ghost"
              size="icon-xs"
              aria-label="Select date"
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
                    formatDate(selectedDate.toDate(getLocalTimeZone())),
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
