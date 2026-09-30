"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ExpenseKind = "expected" | "emergency" | "hold";

type ExpenseItem = {
  id: string;
  category: string;
  name: string;
  enabled: boolean;
  units: number;
  rate: number;
  splitBy: number;
  basis: string;
  actual: string;
  kind: ExpenseKind;
  group?: "ticket" | "travel" | "lodging";
};

type ExtraExpense = {
  id: string;
  name: string;
  budget: number;
  actual: string;
  notes: string;
};

const initialExpenses: ExpenseItem[] = [
  // =========================
  // CONCERT
  // =========================

  {
    id: "ga",
    category: "Concert",
    name: "GA+",
    enabled: false,
    units: 1,
    rate: 400,
    splitBy: 1,
    basis: "pass",
    actual: "",
    kind: "expected",
    group: "ticket",
  },
  {
    id: "vip",
    category: "Concert",
    name: "VIP",
    enabled: false,
    units: 1,
    rate: 600,
    splitBy: 1,
    basis: "pass",
    actual: "",
    kind: "expected",
    group: "ticket",
  },
  {
    id: "platinum",
    category: "Concert",
    name: "Platinum",
    enabled: true,
    units: 1,
    rate: 800,
    splitBy: 1,
    basis: "pass",
    actual: "",
    kind: "expected",
    group: "ticket",
  },

  // =========================
  // TRAVEL
  // =========================

  {
    id: "plane",
    category: "Travel",
    name: "Plane",
    enabled: true,
    units: 1,
    rate: 400,
    splitBy: 1,
    basis: "round trip",
    actual: "",
    kind: "expected",
    group: "travel",
  },
  {
    id: "train",
    category: "Travel",
    name: "Train",
    enabled: false,
    units: 1,
    rate: 150,
    splitBy: 1,
    basis: "round trip",
    actual: "",
    kind: "expected",
    group: "travel",
  },
  {
    id: "bus",
    category: "Travel",
    name: "Bus",
    enabled: false,
    units: 1,
    rate: 125,
    splitBy: 1,
    basis: "round trip",
    actual: "",
    kind: "expected",
    group: "travel",
  },
  {
    id: "gas",
    category: "Travel",
    name: "Gas for Driving",
    enabled: false,
    units: 1,
    rate: 120,
    splitBy: 5,
    basis: "round trip",
    actual: "",
    kind: "expected",
    group: "travel",
  },
  {
    id: "baggage",
    category: "Travel",
    name: "Baggage",
    enabled: true,
    units: 1,
    rate: 70,
    splitBy: 1,
    basis: "round trip",
    actual: "",
    kind: "expected",
  },
  {
    id: "transfer",
    category: "Travel",
    name: "Airport / Station Transfers",
    enabled: false,
    units: 2,
    rate: 30,
    splitBy: 1,
    basis: "ride",
    actual: "",
    kind: "expected",
  },

  // =========================
  // LOCAL TRANSPORT
  // =========================

  {
    id: "uber",
    category: "Local Transport",
    name: "Uber / Lyft",
    enabled: true,
    units: 4,
    rate: 25,
    splitBy: 1,
    basis: "ride",
    actual: "",
    kind: "expected",
  },
  {
    id: "transit",
    category: "Local Transport",
    name: "Public Transit",
    enabled: false,
    units: 4,
    rate: 10,
    splitBy: 1,
    basis: "day",
    actual: "",
    kind: "expected",
  },
  {
    id: "parking",
    category: "Local Transport",
    name: "Parking",
    enabled: false,
    units: 4,
    rate: 60,
    splitBy: 2,
    basis: "day",
    actual: "",
    kind: "expected",
  },

  // =========================
  // LODGING
  // =========================

  {
    id: "single-hotel",
    category: "Lodging",
    name: "Single Hotel Room",
    enabled: false,
    units: 4,
    rate: 225,
    splitBy: 2,
    basis: "night",
    actual: "",
    kind: "expected",
    group: "lodging",
  },
  {
    id: "airbnb",
    category: "Lodging",
    name: "Shared Rental / Airbnb",
    enabled: true,
    units: 1,
    rate: 1600,
    splitBy: 5,
    basis: "trip",
    actual: "",
    kind: "expected",
    group: "lodging",
  },
  {
    id: "shared-hotel",
    category: "Lodging",
    name: "Shared Hotel Room",
    enabled: false,
    units: 4,
    rate: 225,
    splitBy: 2,
    basis: "night",
    actual: "",
    kind: "expected",
    group: "lodging",
  },

  // =========================
  // FOOD
  // =========================

  {
    id: "festival-food",
    category: "Food",
    name: "Festival Food Vendors",
    enabled: true,
    units: 4,
    rate: 30,
    splitBy: 1,
    basis: "meal",
    actual: "",
    kind: "expected",
  },
  {
    id: "breakfast",
    category: "Food",
    name: "Breakfast",
    enabled: true,
    units: 4,
    rate: 25,
    splitBy: 1,
    basis: "day",
    actual: "",
    kind: "expected",
  },
  {
    id: "dinner",
    category: "Food",
    name: "Dinner",
    enabled: true,
    units: 4,
    rate: 25,
    splitBy: 1,
    basis: "day",
    actual: "",
    kind: "expected",
  },

  // =========================
  // NIGHTLIFE
  // =========================

  {
    id: "after-parties",
    category: "Nightlife",
    name: "After Parties",
    enabled: true,
    units: 4,
    rate: 60,
    splitBy: 1,
    basis: "party",
    actual: "",
    kind: "expected",
  },
  {
    id: "party-fees",
    category: "Nightlife",
    name: "Party Fees / Coat Check",
    enabled: false,
    units: 4,
    rate: 10,
    splitBy: 1,
    basis: "night",
    actual: "",
    kind: "expected",
  },

  // =========================
  // SHOPPING
  // =========================

  {
    id: "vendors",
    category: "Shopping",
    name: "Shopping Vendors",
    enabled: true,
    units: 2,
    rate: 200,
    splitBy: 1,
    basis: "item",
    actual: "",
    kind: "expected",
  },
  {
    id: "merch",
    category: "Shopping",
    name: "Extra Merchandise",
    enabled: true,
    units: 1,
    rate: 50,
    splitBy: 1,
    basis: "allowance",
    actual: "",
    kind: "expected",
  },

  // =========================
  // EMERGENCY
  // =========================

  {
    id: "surge",
    category: "Emergency",
    name: "Higher Uber Prices",
    enabled: true,
    units: 1,
    rate: 75,
    splitBy: 1,
    basis: "reserve",
    actual: "",
    kind: "emergency",
  },
  {
    id: "replacement",
    category: "Emergency",
    name: "Replacement Items",
    enabled: true,
    units: 1,
    rate: 50,
    splitBy: 1,
    basis: "reserve",
    actual: "",
    kind: "emergency",
  },
  {
    id: "unexpected-food",
    category: "Emergency",
    name: "Unexpected Food",
    enabled: true,
    units: 1,
    rate: 50,
    splitBy: 1,
    basis: "reserve",
    actual: "",
    kind: "emergency",
  },
  {
    id: "ticket-changes",
    category: "Emergency",
    name: "Ticket Changes",
    enabled: true,
    units: 1,
    rate: 150,
    splitBy: 1,
    basis: "reserve",
    actual: "",
    kind: "emergency",
  },

  // =========================
  // HOLD BUFFER
  // =========================

  {
    id: "hotel-hold",
    category: "Hold Buffer",
    name: "Hotel Incidentals",
    enabled: true,
    units: 1,
    rate: 200,
    splitBy: 1,
    basis: "hold",
    actual: "",
    kind: "hold",
  },
];

const categoryOrder = [
  "Concert",
  "Travel",
  "Local Transport",
  "Lodging",
  "Food",
  "Nightlife",
  "Shopping",
  "Emergency",
  "Hold Buffer",
];

const checklistItems = [
  {
    id: "confirm-event",
    when: "First",
    action: "Confirm event city and dates",
    details: "Confirm the official event details before booking anything.",
  },
  {
    id: "travel-dates",
    when: "Before Booking",
    action: "Choose departure and return dates",
    details: "Leave enough time for all planned events and parties.",
  },
  {
    id: "compare-travel",
    when: "Before Booking",
    action: "Compare plane, train, bus, and driving",
    details: "Compare the complete round-trip price including extra fees.",
  },
  {
    id: "ticket",
    when: "Before Booking",
    action: "Confirm event ticket",
    details: "Review fees, refund rules, and ticket restrictions.",
  },
  {
    id: "lodging",
    when: "Before Booking",
    action: "Choose lodging and roommates",
    details: "Check taxes, cleaning fees, deposits, and incidental holds.",
  },
  {
    id: "transport",
    when: "Before Trip",
    action: "Confirm local transportation",
    details: "Plan late-night transportation and pickup locations.",
  },
  {
    id: "emergency",
    when: "Before Trip",
    action: "Set aside emergency reserve",
    details: "Keep emergency money separate from normal spending.",
  },
  {
    id: "review",
    when: "After Trip",
    action: "Review final spending",
    details:
      "Check actual expenses and confirm refundable holds were released.",
  },
];

export default function TripBudget() {
  const [tripDays, setTripDays] = React.useState(4);
  const [hotelNights, setHotelNights] = React.useState(4);

  const [origin, setOrigin] = React.useState("Albany");
  const [destination, setDestination] = React.useState("Washington, DC");

  const [savedSoFar, setSavedSoFar] = React.useState(0);

  const [expenses, setExpenses] =
    React.useState<ExpenseItem[]>(initialExpenses);

  const [extras, setExtras] = React.useState<ExtraExpense[]>([
    {
      id: "documents",
      name: "Travel Documents",
      budget: 0,
      actual: "",
      notes: "Only if needed",
    },
    {
      id: "insurance",
      name: "Travel Insurance",
      budget: 0,
      actual: "",
      notes: "Optional",
    },
    {
      id: "phone",
      name: "Phone / Roaming",
      budget: 0,
      actual: "",
      notes: "If needed",
    },
  ]);

  const [checklist, setChecklist] = React.useState<Record<string, boolean>>({});

  // ========================================
  // HELPERS
  // ========================================

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  const calculateBudget = (item: ExpenseItem) => {
    if (!item.enabled) return 0;

    const splitBy = Math.max(item.splitBy, 1);

    return (item.units * item.rate) / splitBy;
  };

  const parseActual = (actual: string) => {
    return Math.max(Number(actual) || 0, 0);
  };

  // ========================================
  // UPDATE EXPENSE
  // ========================================

  const updateExpense = (
    id: string,
    key: keyof ExpenseItem,
    value: string | number | boolean,
  ) => {
    setExpenses((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    );
  };

  // ========================================
  // ENABLE / DISABLE
  // ========================================

  const toggleExpense = (expense: ExpenseItem, selected: boolean) => {
    setExpenses((current) =>
      current.map((item) => {
        // Exclusive selections:
        // ticket / travel / lodging
        if (expense.group && selected) {
          if (item.group === expense.group) {
            return {
              ...item,
              enabled: item.id === expense.id,
            };
          }
        }

        if (item.id === expense.id) {
          return {
            ...item,
            enabled: selected,
          };
        }

        return item;
      }),
    );
  };

  // ========================================
  // AUTO UPDATE DAYS / NIGHTS
  // ========================================

  React.useEffect(() => {
    setExpenses((current) =>
      current.map((item) => {
        if (
          [
            "transit",
            "parking",
            "festival-food",
            "breakfast",
            "dinner",
            "party-fees",
          ].includes(item.id)
        ) {
          return {
            ...item,
            units: tripDays,
          };
        }

        if (["single-hotel", "shared-hotel"].includes(item.id)) {
          return {
            ...item,
            units: hotelNights,
          };
        }

        return item;
      }),
    );
  }, [tripDays, hotelNights]);

  // ========================================
  // TOTALS
  // ========================================

  const expectedSpending = expenses
    .filter((item) => item.kind === "expected")
    .reduce((total, item) => total + calculateBudget(item), 0);

  const emergencyReserve = expenses
    .filter((item) => item.kind === "emergency")
    .reduce((total, item) => total + calculateBudget(item), 0);

  const holdBuffer = expenses
    .filter((item) => item.kind === "hold")
    .reduce((total, item) => total + calculateBudget(item), 0);

  const extraBudget = extras.reduce((total, item) => total + item.budget, 0);

  const extraActual = extras.reduce(
    (total, item) => total + parseActual(item.actual),
    0,
  );

  const totalFundsToPrepare =
    expectedSpending + emergencyReserve + holdBuffer + extraBudget;

  const actualSpending =
    expenses
      .filter((item) => item.kind !== "hold")
      .reduce((total, item) => total + parseActual(item.actual), 0) +
    extraActual;

  const stillToSave = Math.max(totalFundsToPrepare - savedSoFar, 0);

  // ========================================
  // CATEGORY TOTALS
  // ========================================

  const getCategoryTotal = (category: string) =>
    expenses
      .filter((item) => item.category === category && item.enabled)
      .reduce((total, item) => total + calculateBudget(item), 0);

  // ========================================
  // EXTRAS
  // ========================================

  const addExtra = () => {
    setExtras((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "",
        budget: 0,
        actual: "",
        notes: "",
      },
    ]);
  };

  const updateExtra = (
    id: string,
    key: keyof ExtraExpense,
    value: string | number,
  ) => {
    setExtras((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    );
  };

  const removeExtra = (id: string) => {
    setExtras((current) => current.filter((item) => item.id !== id));
  };

  return (
    <div className="w-full space-y-6">
      {/* =====================================
          HEADER
      ===================================== */}

      <div>
        <h1 className="text-2xl font-bold">Trip Budget Planner</h1>

        <p className="text-muted-foreground">
          Plan your trip, prepare emergency money, split shared costs, and track
          actual spending.
        </p>
      </div>

      {/* =====================================
          TRIP DETAILS
      ===================================== */}

      <Card>
        <CardHeader>
          <CardTitle>Trip Details</CardTitle>

          <CardDescription>
            Basic information used throughout your budget.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="origin">Origin</Label>

            <Input
              id="origin"
              value={origin}
              onChange={(event) => setOrigin(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination">Destination</Label>

            <Input
              id="destination"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="days">Trip Days</Label>

            <Input
              id="days"
              type="number"
              min="1"
              value={tripDays}
              onChange={(event) =>
                setTripDays(Math.max(1, Number(event.target.value) || 1))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nights">Hotel Nights</Label>

            <Input
              id="nights"
              type="number"
              min="0"
              value={hotelNights}
              onChange={(event) =>
                setHotelNights(Math.max(0, Number(event.target.value) || 0))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* =====================================
          TABS
      ===================================== */}

      <Tabs defaultSelectedKey="budget" className="w-full">
        <TabsList>
          <TabsTrigger id="budget">Budget</TabsTrigger>

          <TabsTrigger id="checklist">Trip Checklist</TabsTrigger>
        </TabsList>

        {/* =====================================
            BUDGET
        ===================================== */}

        <TabsContent id="budget" className="mt-6 space-y-6">
          {/* =====================================
              SUMMARY
          ===================================== */}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard
              label="Expected Spending"
              value={formatCurrency(expectedSpending + extraBudget)}
              description="Normal trip expenses"
            />

            <SummaryCard
              label="Emergency Reserve"
              value={formatCurrency(emergencyReserve)}
              description="Money reserved for emergencies"
            />

            <SummaryCard
              label="Refundable Hold Buffer"
              value={formatCurrency(holdBuffer)}
              description="Available money for temporary holds"
            />

            <SummaryCard
              label="Total Funds to Prepare"
              value={formatCurrency(totalFundsToPrepare)}
              description="Spending + emergency + holds"
            />

            <SummaryCard
              label="Actual Spending"
              value={formatCurrency(actualSpending)}
              description="Actual costs entered so far"
            />

            <SummaryCard
              label="Still to Save"
              value={formatCurrency(stillToSave)}
              description={`Saved: ${formatCurrency(savedSoFar)}`}
            />
          </div>

          {/* =====================================
              SAVED
          ===================================== */}

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="saved">Saved So Far</Label>

                <div className="relative max-w-sm">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>

                  <Input
                    id="saved"
                    type="number"
                    min="0"
                    step="0.01"
                    className="pl-7"
                    value={savedSoFar || ""}
                    placeholder="0.00"
                    onChange={(event) =>
                      setSavedSoFar(
                        Math.max(0, Number(event.target.value) || 0),
                      )
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* =====================================
              EXPENSE CATEGORIES
          ===================================== */}

          {categoryOrder.map((category) => {
            const categoryItems = expenses.filter(
              (item) => item.category === category,
            );

            if (!categoryItems.length) {
              return null;
            }

            const isExclusive = categoryItems.some((item) => item.group);

            return (
              <Card key={category}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <CardTitle>{category}</CardTitle>

                      <CardDescription>
                        {isExclusive
                          ? "Choose one main option."
                          : category === "Emergency"
                            ? "Reserved money — not expected spending."
                            : category === "Hold Buffer"
                              ? "Temporary holds that may be refunded."
                              : "Enable the expenses you expect to use."}
                      </CardDescription>
                    </div>

                    <p className="text-lg font-semibold">
                      {formatCurrency(getCategoryTotal(category))}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {categoryItems.map((item) => {
                    const budget = calculateBudget(item);
                    const actual = parseActual(item.actual);
                    const difference = budget - actual;

                    return (
                      <div key={item.id} className="rounded-lg border p-4">
                        {/* TOP ROW */}

                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium">{item.name}</p>

                            <p className="text-sm text-muted-foreground">
                              {item.basis}
                            </p>
                          </div>

                          <Switch
                            isSelected={item.enabled}
                            onChange={(selected) =>
                              toggleExpense(item, selected)
                            }
                          />
                        </div>

                        {/* EXPENSE CONTROLS */}

                        {item.enabled && (
                          <>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                              {/* UNITS */}

                              <div className="space-y-2">
                                <Label>Units</Label>

                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={item.units}
                                  onChange={(event) =>
                                    updateExpense(
                                      item.id,
                                      "units",
                                      Math.max(
                                        0,
                                        Number(event.target.value) || 0,
                                      ),
                                    )
                                  }
                                />
                              </div>

                              {/* RATE */}

                              <div className="space-y-2">
                                <Label>Rate</Label>

                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    $
                                  </span>

                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="pl-7"
                                    value={item.rate}
                                    onChange={(event) =>
                                      updateExpense(
                                        item.id,
                                        "rate",
                                        Math.max(
                                          0,
                                          Number(event.target.value) || 0,
                                        ),
                                      )
                                    }
                                  />
                                </div>
                              </div>

                              {/* SPLIT BY */}

                              <div className="space-y-2">
                                <Label>Split By</Label>

                                <Input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={item.splitBy}
                                  onChange={(event) =>
                                    updateExpense(
                                      item.id,
                                      "splitBy",
                                      Math.max(
                                        1,
                                        Number(event.target.value) || 1,
                                      ),
                                    )
                                  }
                                />
                              </div>

                              {/* YOUR BUDGET */}

                              <div className="space-y-2">
                                <Label>Your Budget</Label>

                                <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 font-medium">
                                  {formatCurrency(budget)}
                                </div>
                              </div>

                              {/* ACTUAL */}

                              {item.kind !== "hold" && (
                                <div className="space-y-2">
                                  <Label>Actual</Label>

                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                      $
                                    </span>

                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className="pl-7"
                                      placeholder="0.00"
                                      value={item.actual}
                                      onChange={(event) =>
                                        updateExpense(
                                          item.id,
                                          "actual",
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* OVER / UNDER BUDGET */}

                            {item.actual !== "" && item.kind !== "hold" && (
                              <div className="mt-3 flex justify-end">
                                <p
                                  className={`text-sm ${
                                    difference >= 0
                                      ? "text-muted-foreground"
                                      : "text-destructive"
                                  }`}
                                >
                                  {difference >= 0
                                    ? `${formatCurrency(
                                        difference,
                                      )} under budget`
                                    : `${formatCurrency(
                                        Math.abs(difference),
                                      )} over budget`}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}

          {/* =====================================
              EXTRA COSTS
          ===================================== */}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Extra Costs</CardTitle>

                  <CardDescription>
                    Add anything that does not fit into the main categories.
                  </CardDescription>
                </div>

                <Button variant="outline" size="sm" onClick={addExtra}>
                  <Plus className="mr-2 size-4" />
                  Add
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {extras.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_140px_140px_1.5fr_auto]"
                >
                  {/* ITEM */}

                  <div className="space-y-2">
                    <Label>Item</Label>

                    <Input
                      placeholder="Travel Insurance"
                      value={item.name}
                      onChange={(event) =>
                        updateExtra(item.id, "name", event.target.value)
                      }
                    />
                  </div>

                  {/* BUDGET */}

                  <div className="space-y-2">
                    <Label>Budget</Label>

                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>

                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="pl-7"
                        value={item.budget || ""}
                        placeholder="0.00"
                        onChange={(event) =>
                          updateExtra(
                            item.id,
                            "budget",
                            Math.max(0, Number(event.target.value) || 0),
                          )
                        }
                      />
                    </div>
                  </div>

                  {/* ACTUAL */}

                  <div className="space-y-2">
                    <Label>Actual</Label>

                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>

                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="pl-7"
                        value={item.actual}
                        placeholder="0.00"
                        onChange={(event) =>
                          updateExtra(item.id, "actual", event.target.value)
                        }
                      />
                    </div>
                  </div>

                  {/* NOTES */}

                  <div className="space-y-2">
                    <Label>Notes</Label>

                    <Input
                      placeholder="Optional"
                      value={item.notes}
                      onChange={(event) =>
                        updateExtra(item.id, "notes", event.target.value)
                      }
                    />
                  </div>

                  {/* DELETE */}

                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExtra(item.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* =====================================
              BUDGET BREAKDOWN
          ===================================== */}

          <Card>
            <CardHeader>
              <CardTitle>Budget Breakdown</CardTitle>

              <CardDescription>
                Where your planned trip money is going.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {categoryOrder.map((category) => {
                const total = getCategoryTotal(category);

                if (total === 0) {
                  return null;
                }

                return (
                  <div
                    key={category}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-muted-foreground">{category}</span>

                    <span className="font-medium">{formatCurrency(total)}</span>
                  </div>
                );
              })}

              {extraBudget > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Extra Costs</span>

                  <span className="font-medium">
                    {formatCurrency(extraBudget)}
                  </span>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between gap-4">
                <span className="font-semibold">Total Funds to Prepare</span>

                <span className="text-xl font-bold">
                  {formatCurrency(totalFundsToPrepare)}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =====================================
            TRIP CHECKLIST
        ===================================== */}

        <TabsContent id="checklist" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Trip Plan & Booking Checklist</CardTitle>

              <CardDescription>
                {origin} → {destination}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {checklistItems.map((item) => {
                const completed = checklist[item.id] ?? false;

                return (
                  <div
                    key={item.id}
                    className="flex gap-4 rounded-lg border p-4"
                  >
                    <Checkbox
                      checked={completed}
                      onCheckedChange={(checked) =>
                        setChecklist((current) => ({
                          ...current,
                          [item.id]: checked === true,
                        }))
                      }
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p
                          className={`font-medium ${
                            completed
                              ? "text-muted-foreground line-through"
                              : ""
                          }`}
                        >
                          {item.action}
                        </p>

                        <span className="text-xs text-muted-foreground">
                          {item.when}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.details}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ========================================
// SUMMARY CARD
// ========================================

type SummaryCardProps = {
  label: string;
  value: string;
  description?: string;
};

function SummaryCard({ label, value, description }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>

        <p className="mt-1 text-2xl font-bold">{value}</p>

        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
