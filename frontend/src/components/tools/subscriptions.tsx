"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";

import {
  CalendarDays,
  CreditCard,
  DollarSign,
  ImageIcon,
  Plus,
  RefreshCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { DatePickerInput } from "@/components/ui/date-picker";

// --------------------------------------------------
// Types
// --------------------------------------------------

type BillingCycle = "Monthly" | "Annual";

type SubscriptionStatus = "Paid" | "Overdue" | "Upcoming";

type Subscription = {
  id: number;
  name: string;
  icon: string | null;
  billingCycle: BillingCycle;
  cost: number;
  dueDate: string;
  nextRenewal: string;
  paymentMethod: string;
  status: SubscriptionStatus;
};

// --------------------------------------------------
// Starting Data
// --------------------------------------------------

const initialSubscriptions: Subscription[] = [
  {
    id: 1,
    name: "Dashlane",
    icon: null,
    billingCycle: "Annual",
    cost: 59.99,
    dueDate: "2026-07-19",
    nextRenewal: "2027-07-19",
    paymentMethod: "CashApp",
    status: "Overdue",
  },
  {
    id: 2,
    name: "Google",
    icon: null,
    billingCycle: "Monthly",
    cost: 9.99,
    dueDate: "2026-09-14",
    nextRenewal: "2026-10-14",
    paymentMethod: "Discover",
    status: "Overdue",
  },
  {
    id: 3,
    name: "ChatGPT",
    icon: null,
    billingCycle: "Monthly",
    cost: 22,
    dueDate: "2026-09-13",
    nextRenewal: "2026-10-13",
    paymentMethod: "BofA",
    status: "Overdue",
  },
  {
    id: 4,
    name: "Transit",
    icon: null,
    billingCycle: "Annual",
    cost: 25,
    dueDate: "2027-01-13",
    nextRenewal: "2028-01-13",
    paymentMethod: "CashApp",
    status: "Paid",
  },
  {
    id: 5,
    name: "Claude",
    icon: null,
    billingCycle: "Monthly",
    cost: 22,
    dueDate: "2026-09-26",
    nextRenewal: "2026-10-26",
    paymentMethod: "BofA",
    status: "Upcoming",
  },
];

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatDate = (date: string) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
};

const getYearlyCost = (cost: number, billingCycle: BillingCycle) => {
  if (billingCycle === "Monthly") {
    return cost * 12;
  }

  return cost;
};

// --------------------------------------------------
// Component
// --------------------------------------------------

export default function SubscriptionTracker() {
  const [subscriptions, setSubscriptions] =
    useState<Subscription[]>(initialSubscriptions);

  const [dialogOpen, setDialogOpen] = useState(false);

  const [iconError, setIconError] = useState("");

  const iconInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",

    icon: null as string | null,

    billingCycle: "Monthly" as BillingCycle,

    cost: "",
    dueDate: "",
    nextRenewal: "",
    paymentMethod: "",
  });

  // --------------------------------------------------
  // Calculations
  // --------------------------------------------------

  const yearlyTotal = useMemo(() => {
    return subscriptions.reduce((total, subscription) => {
      return (
        total + getYearlyCost(subscription.cost, subscription.billingCycle)
      );
    }, 0);
  }, [subscriptions]);

  const monthlyAverage = yearlyTotal / 12;

  const overduePayments = subscriptions.filter(
    (subscription) => subscription.status === "Overdue",
  ).length;

  const upcomingPayments = subscriptions.filter(
    (subscription) => subscription.status === "Upcoming",
  ).length;

  // --------------------------------------------------
  // Icon Upload
  // --------------------------------------------------

  const handleIconUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIconError("");

    // Only allow images
    if (!file.type.startsWith("image/")) {
      setIconError("Please upload an image file.");

      return;
    }

    // Maximum 2 MB
    const maxSize = 2 * 1024 * 1024;

    if (file.size > maxSize) {
      setIconError("Icon must be smaller than 2 MB.");

      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((current) => ({
          ...current,
          icon: reader.result as string,
        }));
      }
    };

    reader.readAsDataURL(file);
  };

  const removeIcon = () => {
    setForm((current) => ({
      ...current,
      icon: null,
    }));

    setIconError("");

    if (iconInputRef.current) {
      iconInputRef.current.value = "";
    }
  };

  // --------------------------------------------------
  // Status
  // --------------------------------------------------

  const getStatus = (status: SubscriptionStatus) => {
    if (status === "Paid") {
      return (
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-emerald-500" />

          <span className="font-medium text-emerald-500">Paid</span>
        </div>
      );
    }

    if (status === "Overdue") {
      return (
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-red-500" />

          <span className="font-medium text-red-500">Overdue</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <span className="size-2.5 rounded-sm bg-yellow-500" />

        <span className="font-medium text-yellow-500">Upcoming</span>
      </div>
    );
  };

  // --------------------------------------------------
  // Add Subscription
  // --------------------------------------------------

  const handleAddSubscription = () => {
    if (!form.name.trim() || !form.cost || !form.dueDate || !form.nextRenewal) {
      return;
    }

    const cost = Number(form.cost);

    if (Number.isNaN(cost) || cost <= 0) {
      return;
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(`${form.dueDate}T00:00:00`);

    const status: SubscriptionStatus = dueDate < today ? "Overdue" : "Upcoming";

    const newSubscription: Subscription = {
      id: Date.now(),

      name: form.name.trim(),

      icon: form.icon,

      billingCycle: form.billingCycle,

      cost,

      dueDate: form.dueDate,

      nextRenewal: form.nextRenewal,

      paymentMethod: form.paymentMethod.trim() || "Not Set",

      status,
    };

    setSubscriptions((current) => [...current, newSubscription]);

    setForm({
      name: "",
      icon: null,
      billingCycle: "Monthly",
      cost: "",
      dueDate: "",
      nextRenewal: "",
      paymentMethod: "",
    });

    setIconError("");

    if (iconInputRef.current) {
      iconInputRef.current.value = "";
    }

    setDialogOpen(false);
  };

  // --------------------------------------------------
  // Delete
  // --------------------------------------------------

  const handleDelete = (id: number) => {
    setSubscriptions((current) =>
      current.filter((subscription) => subscription.id !== id),
    );
  };

  // --------------------------------------------------
  // Mark Paid
  // --------------------------------------------------

  const markAsPaid = (id: number) => {
    setSubscriptions((current) =>
      current.map((subscription) => {
        if (subscription.id !== id) {
          return subscription;
        }

        return {
          ...subscription,
          status: "Paid" as const,
        };
      }),
    );
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Subscriptions
          </h1>

          <p className="text-sm text-muted-foreground">
            Track your subscriptions and recurring expenses.
          </p>
        </div>

        {/* Add Subscription Dialog */}

        <DialogTrigger isOpen={dialogOpen} onOpenChange={setDialogOpen}>
          <Button>
            <Plus data-icon="inline-start" className="size-4" />
            Add Subscription
          </Button>

          <Dialog className="sm:max-w-[540px]">
            <DialogHeader>
              <DialogTitle>Add Subscription</DialogTitle>

              <DialogDescription>
                Add a recurring subscription to your tracker.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 py-4">
              {/* -------------------------------- */}
              {/* Icon Upload */}
              {/* -------------------------------- */}

              <div className="grid gap-2">
                <Label>Subscription Icon</Label>

                <div className="flex items-center gap-4">
                  {/* Preview */}

                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                    {form.icon ? (
                      <img
                        src={form.icon}
                        alt="Subscription icon preview"
                        className="size-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="size-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* Actions */}

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={iconInputRef}
                      id="subscription-icon"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={handleIconUpload}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      onPress={() => iconInputRef.current?.click()}
                    >
                      <Upload className="size-4" />

                      {form.icon ? "Change Icon" : "Upload Icon"}
                    </Button>

                    {form.icon && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove icon"
                        onPress={removeIcon}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WEBP or SVG. Maximum 2 MB.
                </p>

                {iconError && (
                  <p className="text-xs text-destructive">{iconError}</p>
                )}
              </div>

              {/* -------------------------------- */}
              {/* Name */}
              {/* -------------------------------- */}

              <div className="grid gap-2">
                <Label htmlFor="subscription-name">Name</Label>

                <Input
                  id="subscription-name"
                  placeholder="Netflix"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,

                      name: event.target.value,
                    }))
                  }
                />
              </div>

              {/* -------------------------------- */}
              {/* Billing / Cost */}
              {/* -------------------------------- */}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Billing Cycle</Label>

                  <Select
                    selectedKey={form.billingCycle}
                    onSelectionChange={(key) =>
                      setForm((current) => ({
                        ...current,

                        billingCycle: String(key) as BillingCycle,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem id="Monthly">Monthly</SelectItem>

                      <SelectItem id="Annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="subscription-cost">Cost</Label>

                  <Input
                    id="subscription-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="9.99"
                    value={form.cost}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,

                        cost: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {/* -------------------------------- */}
              {/* Dates */}
              {/* -------------------------------- */}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="subscription-due">Due Date</Label>

                  <DatePickerInput
                    id="subscription-due"
                    value={form.dueDate}
                    placeholder="Select due date"
                    onChange={(date) =>
                      setForm((current) => ({
                        ...current,

                        dueDate: date,
                      }))
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="subscription-renewal">Renewal Date</Label>

                  <DatePickerInput
                    id="subscription-renewal"
                    value={form.nextRenewal}
                    placeholder="Select renewal date"
                    onChange={(date) =>
                      setForm((current) => ({
                        ...current,

                        nextRenewal: date,
                      }))
                    }
                  />
                </div>
              </div>

              {/* -------------------------------- */}
              {/* Payment */}
              {/* -------------------------------- */}

              <div className="grid gap-2">
                <Label htmlFor="payment-method">Payment Method</Label>

                <Input
                  id="payment-method"
                  placeholder="Discover"
                  value={form.paymentMethod}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,

                      paymentMethod: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onPress={() => setDialogOpen(false)}>
                Cancel
              </Button>

              <Button onPress={handleAddSubscription}>Add Subscription</Button>
            </DialogFooter>
          </Dialog>
        </DialogTrigger>
      </div>

      {/* -------------------------------- */}
      {/* Stats */}
      {/* -------------------------------- */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>

            <RefreshCcw className="size-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">{subscriptions.length}</div>

            <p className="text-xs text-muted-foreground">
              Recurring subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Average
            </CardTitle>

            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(monthlyAverage)}
            </div>

            <p className="text-xs text-muted-foreground">
              Average monthly cost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yearly Cost</CardTitle>

            <CalendarDays className="size-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(yearlyTotal)}
            </div>

            <p className="text-xs text-muted-foreground">
              Estimated yearly cost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Needs Attention
            </CardTitle>

            <CreditCard className="size-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">{overduePayments}</div>

            <p className="text-xs text-muted-foreground">
              {upcomingPayments} upcoming
            </p>
          </CardContent>
        </Card>
      </div>

      {/* -------------------------------- */}
      {/* Subscription Table */}
      {/* -------------------------------- */}

      <Card>
        <CardHeader>
          <CardTitle>Subscription Tracker</CardTitle>

          <CardDescription>
            Manage recurring subscriptions and renewal dates.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="border-y bg-muted/30">
                <tr className="text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Name</th>

                  <th className="px-4 py-3 font-medium">Billing</th>

                  <th className="px-4 py-3 font-medium">Cost</th>

                  <th className="px-4 py-3 font-medium">Due</th>

                  <th className="px-4 py-3 font-medium">Yearly Cost</th>

                  <th className="px-4 py-3 font-medium">Next Renewal</th>

                  <th className="px-4 py-3 font-medium">Pay</th>

                  <th className="px-4 py-3 font-medium">Card / Payment</th>

                  <th className="w-[60px] px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {subscriptions.map((subscription) => {
                  const yearlyCost = getYearlyCost(
                    subscription.cost,
                    subscription.billingCycle,
                  );

                  return (
                    <tr
                      key={subscription.id}
                      className="border-b transition-colors hover:bg-muted/30"
                    >
                      {/* Name + Icon */}

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                            {subscription.icon ? (
                              <img
                                src={subscription.icon}
                                alt={`${subscription.name} icon`}
                                className="size-full object-cover"
                              />
                            ) : (
                              <span className="font-semibold">
                                {subscription.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>

                          <span className="font-medium">
                            {subscription.name}
                          </span>
                        </div>
                      </td>

                      {/* Billing */}

                      <td className="px-4 py-3">
                        <Badge variant="secondary">
                          {subscription.billingCycle}
                        </Badge>
                      </td>

                      {/* Cost */}

                      <td className="px-4 py-3 font-medium">
                        {formatCurrency(subscription.cost)}
                      </td>

                      {/* Due */}

                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {getStatus(subscription.status)}

                          <div className="text-xs text-muted-foreground">
                            {formatDate(subscription.dueDate)}
                          </div>
                        </div>
                      </td>

                      {/* Yearly */}

                      <td className="px-4 py-3 font-medium">
                        {formatCurrency(yearlyCost)}
                      </td>

                      {/* Renewal */}

                      <td className="px-4 py-3">
                        {formatDate(subscription.nextRenewal)}
                      </td>

                      {/* Pay */}

                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          isDisabled={subscription.status === "Paid"}
                          onPress={() => markAsPaid(subscription.id)}
                        >
                          {subscription.status === "Paid" ? "Paid" : "Pay"}
                        </Button>
                      </td>

                      {/* Payment */}

                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-normal">
                          {subscription.paymentMethod}
                        </Badge>
                      </td>

                      {/* Delete */}

                      <td className="px-4 py-3">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Delete ${subscription.name}`}
                          onPress={() => handleDelete(subscription.id)}
                        >
                          <Trash2 className="size-4 text-muted-foreground" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Empty State */}

            {subscriptions.length === 0 && (
              <div className="flex min-h-40 items-center justify-center">
                <div className="text-center">
                  <p className="font-medium">No subscriptions</p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Add your first subscription to start tracking recurring
                    expenses.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
