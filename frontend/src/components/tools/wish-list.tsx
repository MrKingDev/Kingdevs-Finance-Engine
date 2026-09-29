"use client";

import * as React from "react";
import {
  CalendarClock,
  Pencil,
  Plus,
  Star,
  Trash2,
  Trophy,
  WalletCards,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Separator } from "@/components/ui/separator";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Textarea } from "@/components/ui/textarea";

/* =========================================================
   TYPES
========================================================= */

type RatingKey =
  | "importance"
  | "value"
  | "frequency"
  | "quality"
  | "longevity"
  | "urgency";

type WishlistItem = {
  id: string;

  name: string;
  price: number;
  purpose: string;
  category: string;

  importance: number;
  value: number;
  frequency: number;
  quality: number;
  longevity: number;
  urgency: number;

  deadline: string;
  notes: string;
};

type RankedItem = WishlistItem & {
  score: number;
};

type ItemForm = {
  name: string;
  price: string;
  purpose: string;

  category: string;
  customCategory: string;

  importance: number;
  value: number;
  frequency: number;
  quality: number;
  longevity: number;
  urgency: number;

  deadline: string;
  notes: string;
};

/* =========================================================
   CATEGORY GROUPS
========================================================= */

const CATEGORY_GROUPS = {
  "TECH & GAMING": [
    "Technology",
    "Phone / Phone Accessories",
    "Laptop",
    "Tablet",
    "Headphones / Audio",
    "Smartwatch / Wearables",
    "Electronics",
    "PC Parts",
    "PC Accessories",
    "PC Upgrade",
    "Gaming Setup",
    "Gaming",
    "Video Games",
    "Console / Console Accessories",
    "Software",
    "Apps / Digital Purchases",
  ],

  CREATIVE: [
    "Photography",
    "Camera Gear",
    "Camera Lens",
    "Lighting Equipment",
    "Creative Equipment",
    "Art Supplies",
    "Drawing",
    "Music Equipment",
    "Content Creation",
    "Video Equipment",
  ],

  FASHION: [
    "Clothing",
    "Shoes",
    "Sneakers",
    "Accessories",
    "Jewelry",
    "Streetwear",
    "Fashion",
    "Fragrance / Cologne",
    "Hair / Grooming",
    "Personal Care",
  ],

  "SCHOOL & CAREER": [
    "School",
    "College",
    "Books",
    "School Supplies",
    "Work",
    "Career",
    "Certifications",
    "Courses",
    "Professional Equipment",
  ],

  "EVENTS & SOCIAL": [
    "Concert",
    "Festival",
    "Party",
    "Club / Nightlife",
    "Event",
    "Birthday",
    "Date",
    "Hangout",
    "Entertainment",
    "Movie / Theater",
    "Amusement Park",
    "Sports Event",
  ],

  TRAVEL: [
    "Trip",
    "Vacation",
    "Weekend Trip",
    "Flight",
    "Hotel",
    "Transportation",
    "Travel Gear",
    "Travel Activities",
  ],

  FOOD: ["Food", "Restaurant", "Takeout", "Snacks", "Groceries", "Drinks"],

  FITNESS: [
    "Gym",
    "Fitness",
    "Workout Equipment",
    "Sports",
    "Running",
    "Track & Field",
    "Calisthenics",
  ],

  "HOME / DORM": [
    "Bedroom",
    "Dorm",
    "Room Decoration",
    "Furniture",
    "Home",
    "Desk Setup",
    "Organization / Storage",
  ],

  MONEY: ["Savings", "Investment", "Debt Payment", "Emergency Fund"],

  SUBSCRIPTIONS: [
    "Subscription",
    "Streaming",
    "Gaming Subscription",
    "Cloud Storage",
    "Software Subscription",
  ],

  GIFTS: ["Gift", "Gift for Family", "Gift for Friend", "Gift for Partner"],

  OTHER: ["Hobby", "Collectible", "Impulse Want", "Other / Custom"],
} as const;

const allCategories: string[] = Object.values(CATEGORY_GROUPS).flatMap(
  (group) => [...group],
);

/* =========================================================
   RATINGS
========================================================= */

const RATING_INFO: Record<
  RatingKey,
  {
    label: string;
    description: string;
    low: string;
    high: string;
  }
> = {
  importance: {
    label: "Importance",
    description:
      "How important is this compared with everything else on your list?",
    low: "Barely care",
    high: "Very important",
  },

  value: {
    label: "Value for Money",
    description: "Is the product or experience worth the price?",
    low: "Bad value",
    high: "Amazing value",
  },

  frequency: {
    label: "Use / Benefit",
    description: "How often will you use it, or how much benefit will you get?",
    low: "Very little",
    high: "A lot",
  },

  quality: {
    label: "Quality",
    description: "How good do you expect the product or experience to be?",
    low: "Poor",
    high: "Excellent",
  },

  longevity: {
    label: "Longevity / Memory",
    description:
      "How long will the value last or how memorable will the experience be?",
    low: "Temporary",
    high: "Long lasting",
  },

  urgency: {
    label: "Urgency",
    description: "How soon does this need to happen?",
    low: "Can wait",
    high: "Need it now",
  },
};

const RATING_KEYS: RatingKey[] = [
  "importance",
  "value",
  "frequency",
  "quality",
  "longevity",
  "urgency",
];

/* =========================================================
   DEFAULT FORM
========================================================= */

const createDefaultForm = (): ItemForm => ({
  name: "",
  price: "",
  purpose: "",

  category: "Technology",
  customCategory: "",

  importance: 5,
  value: 5,
  frequency: 5,
  quality: 5,
  longevity: 5,
  urgency: 5,

  deadline: "",
  notes: "",
});

/* =========================================================
   MONEY
========================================================= */

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

/* =========================================================
   DEADLINES
========================================================= */

const parseLocalDate = (value: string) => {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
};

const todayAtMidnight = () => {
  const today = new Date();

  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
};

const daysUntilDeadline = (deadline: string) => {
  const date = parseLocalDate(deadline);

  if (!date) {
    return null;
  }

  const difference = date.getTime() - todayAtMidnight().getTime();

  return Math.round(difference / (1000 * 60 * 60 * 24));
};

const deadlineScore = (deadline: string) => {
  const days = daysUntilDeadline(deadline);

  if (days === null) return 0;

  if (days < 0) return -10;

  if (days <= 7) return 10;

  if (days <= 14) return 8;

  if (days <= 30) return 6;

  if (days <= 60) return 4;

  if (days <= 90) return 2;

  return 1;
};

const deadlineStatus = (deadline: string) => {
  const days = daysUntilDeadline(deadline);

  if (days === null) {
    return "No deadline";
  }

  if (days < 0) {
    const amount = Math.abs(days);

    return `Expired ${amount} day${amount === 1 ? "" : "s"} ago`;
  }

  if (days === 0) {
    return "Due today";
  }

  if (days === 1) {
    return "1 day left";
  }

  return `${days} days left`;
};

/* =========================================================
   SCORING
========================================================= */

/*
 * Importance      22%
 * Value           18%
 * Frequency       13%
 * Longevity       13%
 * Urgency         10%
 * Quality         10%
 * Affordability    5%
 * Deadline         9%
 */

const calculateScore = (item: WishlistItem, budget: number) => {
  let affordability = 5;

  if (budget <= 0) {
    affordability = 5;
  } else if (item.price <= budget * 0.2) {
    affordability = 10;
  } else if (item.price <= budget * 0.4) {
    affordability = 9;
  } else if (item.price <= budget * 0.6) {
    affordability = 8;
  } else if (item.price <= budget * 0.8) {
    affordability = 7;
  } else if (item.price <= budget) {
    affordability = 6;
  } else if (item.price <= budget * 1.1) {
    affordability = 3;
  } else {
    affordability = 0;
  }

  const deadlineValue = deadlineScore(item.deadline);

  let score =
    item.importance * 2.2 +
    item.value * 1.8 +
    item.frequency * 1.3 +
    item.longevity * 1.3 +
    item.urgency * 1 +
    item.quality * 1 +
    affordability * 0.5 +
    deadlineValue * 0.9;

  /*
   * Over-budget penalties
   */
  if (budget > 0) {
    if (item.price > budget * 1.5) {
      score -= 15;
    } else if (item.price > budget * 1.25) {
      score -= 12;
    } else if (item.price > budget) {
      score -= 8;
    }
  }

  /*
   * Extra penalty for expired deadline
   */
  const days = daysUntilDeadline(item.deadline);

  if (days !== null && days < 0) {
    score -= 10;
  }

  const finalScore = Math.max(0, Math.min(100, score));

  return Math.round(finalScore * 10) / 10;
};

/* =========================================================
   RANKING
========================================================= */

const rankItems = (items: WishlistItem[], budget: number): RankedItem[] => {
  return items
    .map((item) => ({
      ...item,
      score: calculateScore(item, budget),
    }))
    .sort((a, b) => {
      /*
       * Score
       */
      if (a.score !== b.score) {
        return b.score - a.score;
      }

      /*
       * Deadline
       */
      const aDays = daysUntilDeadline(a.deadline);
      const bDays = daysUntilDeadline(b.deadline);

      const aDeadline = aDays === null ? 999999 : aDays < 0 ? 999998 : aDays;

      const bDeadline = bDays === null ? 999999 : bDays < 0 ? 999998 : bDays;

      if (aDeadline !== bDeadline) {
        return aDeadline - bDeadline;
      }

      /*
       * Importance
       */
      if (a.importance !== b.importance) {
        return b.importance - a.importance;
      }

      /*
       * Urgency
       */
      if (a.urgency !== b.urgency) {
        return b.urgency - a.urgency;
      }

      /*
       * Value
       */
      if (a.value !== b.value) {
        return b.value - a.value;
      }

      /*
       * Price
       */
      return a.price - b.price;
    });
};

/* =========================================================
   PRIORITY LABEL
========================================================= */

const getPriority = (index: number, total: number) => {
  const rank = index + 1;

  if (rank === 1) {
    return "Buy First";
  }

  if (rank <= 3) {
    return "High Priority";
  }

  if (rank <= Math.max(4, Math.floor(total / 2))) {
    return "Medium Priority";
  }

  return "Buy Later";
};

/* =========================================================
   RATING FIELD
========================================================= */

type RatingFieldProps = {
  ratingKey: RatingKey;
  value: number;
  onChange: (value: number) => void;
};

function RatingField({ ratingKey, value, onChange }: RatingFieldProps) {
  const info = RATING_INFO[ratingKey];

  return (
    <div className="rounded-lg border p-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_100px] sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Label htmlFor={`rating-${ratingKey}`}>{info.label}</Label>

            <Badge variant="secondary">{value}/10</Badge>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {info.description}
          </p>

          <p className="mt-2 text-xs text-muted-foreground">
            1 = {info.low} · 10 = {info.high}
          </p>
        </div>

        <Input
          id={`rating-${ratingKey}`}
          type="number"
          min={1}
          max={10}
          value={value}
          onChange={(event) => {
            const nextValue = Math.max(
              1,
              Math.min(10, Number(event.target.value) || 1),
            );

            onChange(nextValue);
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function WishList() {
  const [items, setItems] = React.useState<WishlistItem[]>([]);
  const [budget, setBudget] = React.useState(0);

  const [loaded, setLoaded] = React.useState(false);

  const [showEditor, setShowEditor] = React.useState(false);

  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<ItemForm>(createDefaultForm());

  const [formError, setFormError] = React.useState("");

  /* =======================================================
     LOAD LOCAL STORAGE
  ======================================================= */

  React.useEffect(() => {
    try {
      const storedItems = localStorage.getItem("what-to-buy-items");

      const storedBudget = localStorage.getItem("what-to-buy-budget");

      if (storedItems) {
        setItems(JSON.parse(storedItems));
      }

      if (storedBudget) {
        setBudget(Number(storedBudget) || 0);
      }
    } catch (error) {
      console.error("Could not load wishlist:", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  /* =======================================================
     SAVE ITEMS
  ======================================================= */

  React.useEffect(() => {
    if (!loaded) return;

    localStorage.setItem("what-to-buy-items", JSON.stringify(items));
  }, [items, loaded]);

  /* =======================================================
     SAVE BUDGET
  ======================================================= */

  React.useEffect(() => {
    if (!loaded) return;

    localStorage.setItem("what-to-buy-budget", String(budget));
  }, [budget, loaded]);

  /* =======================================================
     RANKINGS
  ======================================================= */

  const rankedItems = React.useMemo(
    () => rankItems(items, budget),
    [items, budget],
  );

  /* =======================================================
     DEADLINES
  ======================================================= */

  const deadlineItems = React.useMemo(() => {
    return [...rankedItems]
      .filter((item) => item.deadline)
      .sort((a, b) => {
        const aDays = daysUntilDeadline(a.deadline);
        const bDays = daysUntilDeadline(b.deadline);

        /*
         * Expired deadlines go after active deadlines.
         */
        if (aDays !== null && aDays < 0 && (bDays === null || bDays >= 0)) {
          return 1;
        }

        if (bDays !== null && bDays < 0 && (aDays === null || aDays >= 0)) {
          return -1;
        }

        return (aDays ?? 999999) - (bDays ?? 999999);
      });
  }, [rankedItems]);

  /* =======================================================
     BUDGET PLAN
  ======================================================= */

  const budgetPlan = React.useMemo(() => {
    let remaining = budget;

    const buyNow: RankedItem[] = [];
    const wait: RankedItem[] = [];

    rankedItems.forEach((item) => {
      if (item.price <= remaining) {
        buyNow.push(item);

        remaining -= item.price;
      } else {
        wait.push(item);
      }
    });

    return {
      buyNow,
      wait,
      remaining,
      spent: budget - remaining,
    };
  }, [budget, rankedItems]);

  /* =======================================================
     FORM
  ======================================================= */

  const updateForm = <K extends keyof ItemForm>(key: K, value: ItemForm[K]) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const openAddForm = () => {
    setEditingItemId(null);
    setForm(createDefaultForm());
    setFormError("");
    setShowEditor(true);
  };

  const openEditForm = (item: WishlistItem) => {
    const knownCategory = allCategories.includes(item.category);

    setEditingItemId(item.id);

    setForm({
      name: item.name,
      price: String(item.price),
      purpose: item.purpose,

      category: knownCategory ? item.category : "Other / Custom",

      customCategory: knownCategory ? "" : item.category,

      importance: item.importance,
      value: item.value,
      frequency: item.frequency,
      quality: item.quality,
      longevity: item.longevity,
      urgency: item.urgency,

      deadline: item.deadline,
      notes: item.notes,
    });

    setFormError("");
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingItemId(null);
    setForm(createDefaultForm());
    setFormError("");
  };

  const saveItem = () => {
    const name = form.name.trim();
    const price = Number(form.price);

    const category =
      form.category === "Other / Custom"
        ? form.customCategory.trim()
        : form.category;

    if (!name) {
      setFormError("Enter an item or experience name.");

      return;
    }

    if (Number.isNaN(price) || price < 0) {
      setFormError("Enter a valid price.");

      return;
    }

    if (!category) {
      setFormError("Choose or enter a category.");

      return;
    }

    const newItem: WishlistItem = {
      id: editingItemId ?? crypto.randomUUID(),

      name,
      price,
      purpose: form.purpose.trim(),
      category,

      importance: form.importance,
      value: form.value,
      frequency: form.frequency,
      quality: form.quality,
      longevity: form.longevity,
      urgency: form.urgency,

      deadline: form.deadline,
      notes: form.notes.trim(),
    };

    if (editingItemId) {
      setItems((current) =>
        current.map((item) => (item.id === editingItemId ? newItem : item)),
      );
    } else {
      setItems((current) => [...current, newItem]);
    }

    closeEditor();
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="w-full space-y-6">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold">What Should I Buy First?</h2>

          <p className="text-muted-foreground">
            Rank your wishlist based on budget, importance, value, usefulness,
            quality, longevity, urgency, and deadlines.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onPress={openAddForm}>
            <Plus data-icon="inline-start" className="size-4" />
            Add Item
          </Button>

          <Button
            variant="outline"
            isDisabled={items.length === 0}
            onPress={() => setItems([])}
          >
            <Trash2 data-icon="inline-start" className="size-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* =================================================
          ITEM EDITOR
      ================================================= */}

      {showEditor && (
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>
                  {editingItemId
                    ? "Edit Wishlist Item"
                    : "Add Something to Your Wishlist"}
                </CardTitle>

                <CardDescription>
                  Rate the item from 1–10 so the tool can calculate its shopping
                  priority.
                </CardDescription>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onPress={closeEditor}
                aria-label="Close editor"
              >
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Basic info */}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="item-name">Item / Experience</Label>

                <Input
                  id="item-name"
                  placeholder="New headphones"
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-price">Estimated Price</Label>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>

                  <Input
                    id="item-price"
                    type="number"
                    min="0"
                    step="0.01"
                    className="pl-7"
                    placeholder="100.00"
                    value={form.price}
                    onChange={(event) =>
                      updateForm("price", event.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Purpose */}

            <div className="space-y-2">
              <Label htmlFor="item-purpose">
                What is it for / why do you want it?
              </Label>

              <Textarea
                id="item-purpose"
                placeholder="Explain why you want or need this..."
                value={form.purpose}
                onChange={(event) => updateForm("purpose", event.target.value)}
              />
            </div>

            {/* Category / Deadline */}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>

                <Select
                  selectedKey={form.category}
                  onSelectionChange={(key) =>
                    updateForm("category", String(key))
                  }
                  placeholder="Select category"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent className="max-h-80">
                    {Object.entries(CATEGORY_GROUPS).map(([group, options]) => (
                      <SelectGroup key={group}>
                        <SelectLabel>{group}</SelectLabel>

                        {options.map((option) => (
                          <SelectItem key={option} id={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>

                <Input
                  id="deadline"
                  type="date"
                  value={form.deadline}
                  onChange={(event) =>
                    updateForm("deadline", event.target.value)
                  }
                />

                <p className="text-xs text-muted-foreground">
                  Optional. Useful for concerts, trips, sales, school purchases,
                  events, or anything that can expire.
                </p>
              </div>

              {form.category === "Other / Custom" && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="custom-category">Custom Category</Label>

                  <Input
                    id="custom-category"
                    placeholder="Enter your category"
                    value={form.customCategory}
                    onChange={(event) =>
                      updateForm("customCategory", event.target.value)
                    }
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* Ratings */}

            <div>
              <h3 className="font-semibold">Rate This Item</h3>

              <p className="text-sm text-muted-foreground">
                Each rating is from 1 to 10.
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {RATING_KEYS.map((key) => (
                <RatingField
                  key={key}
                  ratingKey={key}
                  value={form[key]}
                  onChange={(value) => updateForm(key, value)}
                />
              ))}
            </div>

            {/* Notes */}

            <div className="space-y-2">
              <Label htmlFor="item-notes">Extra Notes</Label>

              <Textarea
                id="item-notes"
                placeholder="Optional notes..."
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
              />
            </div>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onPress={closeEditor}>
                Cancel
              </Button>

              <Button onPress={saveItem}>
                {editingItemId ? "Save Changes" : "Add to Wishlist"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* =================================================
          OVERVIEW
      ================================================= */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Budget */}

        <Card>
          <CardHeader>
            <CardDescription>Shopping Budget</CardDescription>

            <CardTitle className="flex items-center gap-2">
              <WalletCards className="size-5" />

              {formatCurrency(budget)}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <Label htmlFor="shopping-budget">Change Budget</Label>

            <div className="relative mt-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>

              <Input
                id="shopping-budget"
                type="number"
                min="0"
                step="0.01"
                className="pl-7"
                placeholder="500.00"
                value={budget === 0 ? "" : String(budget)}
                onChange={(event) =>
                  setBudget(Math.max(0, Number(event.target.value) || 0))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Wishlist */}

        <Card>
          <CardHeader>
            <CardDescription>Wishlist Items</CardDescription>

            <CardTitle className="text-2xl">{items.length}</CardTitle>
          </CardHeader>
        </Card>

        {/* Deadline */}

        <Card>
          <CardHeader>
            <CardDescription>Deadlines</CardDescription>

            <CardTitle className="flex items-center gap-2 text-2xl">
              <CalendarClock className="size-5" />

              {deadlineItems.length}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Top priority */}

        <Card>
          <CardHeader>
            <CardDescription>Buy First</CardDescription>

            <CardTitle className="flex items-start gap-2">
              <Trophy className="mt-1 size-5 shrink-0" />

              <span className="truncate">
                {rankedItems[0]?.name ?? "No items yet"}
              </span>
            </CardTitle>
          </CardHeader>

          {rankedItems[0] && (
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Price</span>

                <span>{formatCurrency(rankedItems[0].price)}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Score</span>

                <span>{rankedItems[0].score}/100</span>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* =================================================
          TABS
      ================================================= */}

      <Tabs defaultSelectedKey="priority" className="w-full">
        <TabsList
          variant="line"
          className="w-full justify-start overflow-x-auto"
        >
          <TabsTrigger id="priority">Buy Order</TabsTrigger>

          <TabsTrigger id="budget">Budget Plan</TabsTrigger>

          <TabsTrigger id="deadlines">Deadlines</TabsTrigger>

          <TabsTrigger id="comparison">Comparison</TabsTrigger>
        </TabsList>

        {/* =============================================
            BUY ORDER
        ============================================= */}

        <TabsContent id="priority" className="mt-6">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Shopping Priority</CardTitle>

              <CardDescription>
                Ranked from what you should buy first to what you should buy
                later.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {rankedItems.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
                  <Star className="mb-4 size-10 text-muted-foreground" />

                  <h3 className="font-semibold">Your wishlist is empty</h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Add something to see your priority ranking.
                  </p>

                  <Button className="mt-4" onPress={openAddForm}>
                    <Plus data-icon="inline-start" className="size-4" />
                    Add Item
                  </Button>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>

                        <TableHead>Item</TableHead>

                        <TableHead>Category</TableHead>

                        <TableHead>Price</TableHead>

                        <TableHead>Deadline</TableHead>

                        <TableHead>Importance</TableHead>

                        <TableHead>Value</TableHead>

                        <TableHead>Urgency</TableHead>

                        <TableHead>Score</TableHead>

                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {rankedItems.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {index === 0 && <Star className="size-4" />}

                              <span className="font-semibold">
                                #{index + 1}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div>
                              <p className="font-medium">{item.name}</p>

                              <Badge variant="outline" className="mt-1">
                                {getPriority(index, rankedItems.length)}
                              </Badge>
                            </div>
                          </TableCell>

                          <TableCell>{item.category}</TableCell>

                          <TableCell>
                            <span
                              className={
                                budget > 0 && item.price > budget
                                  ? "text-destructive"
                                  : ""
                              }
                            >
                              {formatCurrency(item.price)}
                            </span>
                          </TableCell>

                          <TableCell>
                            {item.deadline ? (
                              <div>
                                <p>{item.deadline}</p>

                                <p className="text-xs text-muted-foreground">
                                  {deadlineStatus(item.deadline)}
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell>{item.importance}/10</TableCell>

                          <TableCell>{item.value}/10</TableCell>

                          <TableCell>{item.urgency}/10</TableCell>

                          <TableCell>
                            <div className="min-w-28 space-y-1">
                              <div className="flex justify-between text-xs">
                                <span>{item.score}</span>

                                <span>/100</span>
                              </div>

                              <Progress
                                aria-label={`${item.name} score`}
                                value={item.score}
                              />
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Edit ${item.name}`}
                                onPress={() => openEditForm(item)}
                              >
                                <Pencil className="size-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Delete ${item.name}`}
                                onPress={() => removeItem(item.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* =============================================
            BUDGET PLAN
        ============================================= */}

        <TabsContent id="budget" className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Starting Budget</CardDescription>

                <CardTitle>{formatCurrency(budget)}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Planned Spending</CardDescription>

                <CardTitle>{formatCurrency(budgetPlan.spent)}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Money Remaining</CardDescription>

                <CardTitle>{formatCurrency(budgetPlan.remaining)}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {/* Buy now */}

            <Card>
              <CardHeader>
                <CardTitle>Buy With Current Budget</CardTitle>

                <CardDescription>
                  Higher-priority items that fit into your available budget.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {budgetPlan.buyNow.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    None of your items currently fit within your budget.
                  </p>
                ) : (
                  budgetPlan.buyNow.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 rounded-lg border p-4"
                    >
                      <div>
                        <p className="font-medium">
                          {index + 1}. {item.name}
                        </p>

                        <p className="text-sm text-muted-foreground">
                          Score: {item.score}/100
                        </p>

                        {item.deadline && (
                          <p className="text-xs text-muted-foreground">
                            {deadlineStatus(item.deadline)}
                          </p>
                        )}
                      </div>

                      <span className="font-semibold">
                        {formatCurrency(item.price)}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Wait */}

            <Card>
              <CardHeader>
                <CardTitle>Wait / Save for Later</CardTitle>

                <CardDescription>
                  Items that do not fit after higher-ranked purchases.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {budgetPlan.wait.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Everything currently fits within the budget.
                  </p>
                ) : (
                  budgetPlan.wait.map((item) => {
                    const shortage = Math.max(
                      0,
                      item.price - budgetPlan.remaining,
                    );

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4 rounded-lg border p-4"
                      >
                        <div>
                          <p className="font-medium">{item.name}</p>

                          <p className="text-sm text-muted-foreground">
                            Need {formatCurrency(shortage)} more
                          </p>
                        </div>

                        <span className="font-semibold">
                          {formatCurrency(item.price)}
                        </span>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* =============================================
            DEADLINES
        ============================================= */}

        <TabsContent id="deadlines" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Deadlines</CardTitle>

              <CardDescription>
                Purchases or experiences that may become unavailable if you
                wait.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {deadlineItems.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  None of your wishlist items have deadlines.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>

                        <TableHead>Deadline</TableHead>

                        <TableHead>Time Left</TableHead>

                        <TableHead>Price</TableHead>

                        <TableHead>Score</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {deadlineItems.map((item) => {
                        const days = daysUntilDeadline(item.deadline);

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.name}
                            </TableCell>

                            <TableCell>{item.deadline}</TableCell>

                            <TableCell>
                              <Badge
                                variant={
                                  days !== null && days <= 7
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {deadlineStatus(item.deadline)}
                              </Badge>
                            </TableCell>

                            <TableCell>{formatCurrency(item.price)}</TableCell>

                            <TableCell>
                              {item.score}
                              /100
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* =============================================
            COMPARISON
        ============================================= */}

        <TabsContent id="comparison" className="mt-6">
          {rankedItems.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Add wishlist items to compare them.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {rankedItems.map((item, index) => (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardDescription>
                          #{index + 1} • {item.category}
                        </CardDescription>

                        <CardTitle>{item.name}</CardTitle>
                      </div>

                      <Badge>{item.score}/100</Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Price</p>

                        <p className="font-medium">
                          {formatCurrency(item.price)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Deadline
                        </p>

                        <p className="font-medium">
                          {item.deadline
                            ? `${item.deadline} — ${deadlineStatus(
                                item.deadline,
                              )}`
                            : "None"}
                        </p>
                      </div>
                    </div>

                    {item.purpose && (
                      <div>
                        <p className="text-xs text-muted-foreground">Purpose</p>

                        <p className="mt-1 text-sm">{item.purpose}</p>
                      </div>
                    )}

                    <Separator />

                    <div className="space-y-4">
                      {RATING_KEYS.map((key) => (
                        <div key={key} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{RATING_INFO[key].label}</span>

                            <span className="font-medium">
                              {item[key]}
                              /10
                            </span>
                          </div>

                          <Progress
                            aria-label={`${item.name} ${RATING_INFO[key].label}`}
                            value={item[key] * 10}
                          />
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between font-medium">
                        <span>Overall Score</span>

                        <span>{item.score}/100</span>
                      </div>

                      <Progress
                        aria-label={`${item.name} overall score`}
                        value={item.score}
                      />
                    </div>

                    {item.notes && (
                      <>
                        <Separator />

                        <div>
                          <p className="text-xs text-muted-foreground">Notes</p>

                          <p className="mt-1 text-sm">{item.notes}</p>
                        </div>
                      </>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onPress={() => openEditForm(item)}
                      >
                        <Pencil data-icon="inline-start" className="size-4" />
                        Edit
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => removeItem(item.id)}
                      >
                        <Trash2 data-icon="inline-start" className="size-4" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
