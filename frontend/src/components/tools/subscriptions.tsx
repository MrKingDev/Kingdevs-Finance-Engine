"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Archive, CalendarDays, CreditCard, DollarSign, History, Pencil, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import CategorySelect from "@/components/categories/categorySelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerInput } from "@/components/ui/date-picker";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_URL, apiError, notifyFinanceChanged } from "@/lib/finance-api";
import { useSubscriptions } from "@/lib/use-subscriptions";
import type { SubscriptionPayment, SubscriptionResponse } from "@/types/api";

type SubscriptionForm = {
  name: string;
  amount: string;
  billing_cycle: "monthly" | "annual";
  next_due_date: string;
  category: string | null;
  payment_method_label: string;
  icon: string | null;
};

const emptyForm: SubscriptionForm = {
  name: "", amount: "", billing_cycle: "monthly", next_due_date: "",
  category: null, payment_method_label: "", icon: null,
};
const currency = (value: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
}).format(new Date(value + "T00:00:00Z"));
const statusLabels = { overdue: "Overdue", due_today: "Due today", upcoming: "Upcoming", archived: "Archived" };

async function request(path: string, method: string, body?: unknown) {
  const response = await fetch(API_URL + "/subscriptions" + path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(await apiError(response, "Unable to save this change."));
  return response.status === 204 ? null : response.json();
}

export default function SubscriptionTracker() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const { data, loading, error, refresh } = useSubscriptions(includeArchived);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionResponse | null>(null);
  const [form, setForm] = useState<SubscriptionForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [readingIcon, setReadingIcon] = useState(false);
  const [paying, setPaying] = useState<SubscriptionResponse | null>(null);
  const [payment, setPayment] = useState({ paid_on: "", amount: "" });
  const [paymentError, setPaymentError] = useState("");
  const [deleting, setDeleting] = useState<SubscriptionResponse | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [history, setHistory] = useState<{ name: string; payments: SubscriptionPayment[] } | null>(null);
  const summary = data?.summary;

  function openForm(item?: SubscriptionResponse) {
    setEditing(item ?? null);
    setForm(item ? {
      name: item.name, amount: item.amount, billing_cycle: item.billing_cycle,
      next_due_date: item.next_due_date, category: item.category,
      payment_method_label: item.payment_method_label ?? "", icon: item.icon,
    } : { ...emptyForm });
    setFormError("");
    setDialogOpen(true);
  }

  function uploadIcon(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setFormError("Choose a PNG, JPEG, or WebP icon no larger than 2 MiB.");
      event.target.value = "";
      return;
    }
    setFormError("");
    setReadingIcon(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setForm((current) => ({ ...current, icon: reader.result as string }));
    };
    reader.onerror = () => setFormError("Could not read this icon. Choose another image.");
    reader.onloadend = () => setReadingIcon(false);
    reader.readAsDataURL(file);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || readingIcon) return;
    if (!form.next_due_date) { setFormError("Choose the next due date."); return; }
    setBusy(true);
    setFormError("");
    try {
      await request(editing ? "/" + editing.id : "", editing ? "PATCH" : "POST", {
        ...form, name: form.name.trim(), payment_method_label: form.payment_method_label.trim() || null,
      });
      setDialogOpen(false);
      notifyFinanceChanged();
      toast.success(editing ? "Subscription updated" : "Subscription saved");
    } catch (failure) {
      setFormError(failure instanceof Error ? failure.message : "Unable to save subscription.");
    } finally { setBusy(false); }
  }

  async function archive(item: SubscriptionResponse) {
    setBusy(true);
    try {
      await request("/" + item.id, "PATCH", { is_active: !item.is_active });
      notifyFinanceChanged();
      toast.success(item.is_active ? "Subscription archived" : "Subscription restored");
    } catch (failure) { toast.error(failure instanceof Error ? failure.message : "Unable to update subscription."); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    setDeleteError("");
    try {
      await request("/" + deleting.id, "DELETE");
      setDeleting(null);
      notifyFinanceChanged();
      toast.success("Subscription deleted");
    } catch (failure) { setDeleteError(failure instanceof Error ? failure.message : "Unable to delete subscription."); }
    finally { setBusy(false); }
  }

  async function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paying || busy) return;
    setBusy(true);
    setPaymentError("");
    try {
      // Preserve the selected occurrence across retries, even if another request succeeded.
      await request("/" + paying.id + "/payments", "POST", { ...payment, due_date: paying.next_due_date });
      setPaying(null);
      notifyFinanceChanged();
      toast.success("Payment recorded and next due date updated");
    } catch (failure) { setPaymentError(failure instanceof Error ? failure.message : "Unable to record payment."); }
    finally { setBusy(false); }
  }

  async function showHistory(item: SubscriptionResponse) {
    setBusy(true);
    try {
      const payments: SubscriptionPayment[] = await request("/" + item.id + "/payments", "GET");
      setHistory({ name: item.name, payments });
    } catch (failure) { toast.error(failure instanceof Error ? failure.message : "Unable to load payment history."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Subscriptions</h2>
          <p className="text-sm text-muted-foreground">Track recurring costs, due dates, and recorded payments.</p>
        </div>
        <Button onPress={() => openForm()} isDisabled={busy}><Plus className="size-4" />Add Subscription</Button>
      </div>

      {error && <div role="alert" className="flex items-center gap-3 text-sm text-destructive">{error}<Button variant="outline" onPress={refresh}>Retry</Button></div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Active subscriptions", value: summary?.active_count, note: "Saved recurring subscriptions", Icon: RefreshCcw },
          { title: "Monthly average", value: summary ? currency(summary.monthly_average) : undefined, note: "Estimated at current prices", Icon: DollarSign },
          { title: "Yearly estimate", value: summary ? currency(summary.yearly_cost) : undefined, note: "Active subscriptions only", Icon: CalendarDays },
          { title: "Overdue", value: summary?.overdue_count, note: summary ? summary.due_today_count + " due today · " + summary.upcoming_count + " upcoming" : "Checking due dates", Icon: CreditCard },
        ].map(({ title, value, note, Icon }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle><Icon className="size-4 text-muted-foreground" /></CardHeader>
            <CardContent><div className="text-2xl font-bold">{value ?? "—"}</div><p className="text-xs text-muted-foreground">{note}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Tracker</CardTitle>
          <CardDescription>Estimates are separate from actual spending in Transactions. Due status uses the current UTC date.</CardDescription>
          <Button size="sm" variant={includeArchived ? "secondary" : "outline"} className="w-fit" aria-pressed={includeArchived} onPress={() => setIncludeArchived((value) => !value)}>Show archived subscriptions</Button>
        </CardHeader>
        <CardContent>
          {loading && <p role="status" className="mb-3 text-sm text-muted-foreground">Loading subscriptions…</p>}
          <Table aria-label="Saved subscriptions" className="min-w-[1000px]">
            <TableHeader>
              <TableHead isRowHeader>Name</TableHead><TableHead>Cost</TableHead><TableHead>Category</TableHead>
              <TableHead>Next due</TableHead><TableHead>Yearly estimate</TableHead><TableHead>Payment method</TableHead><TableHead>Actions</TableHead>
            </TableHeader>
            <TableBody items={data?.items ?? []} renderEmptyState={() => loading ? "Loading…" : error ? "Subscriptions could not be loaded." : "No subscriptions yet. Add your first subscription to get started."}>
              {(item) => (
                <TableRow id={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                        {item.icon ? <img src={item.icon} alt="" className="size-full object-cover" /> : item.name.charAt(0).toUpperCase()}
                      </div>
                      <div><div className="font-medium">{item.name}</div>{item.last_paid_on && <p className="text-xs text-muted-foreground">Last paid {formatDate(item.last_paid_on)}</p>}</div>
                    </div>
                  </TableCell>
                  <TableCell>{currency(item.amount)}<p className="text-xs text-muted-foreground">{item.billing_cycle === "monthly" ? "Monthly" : "Annual"}</p></TableCell>
                  <TableCell>{item.category ?? "Uncategorized"}</TableCell>
                  <TableCell><Badge variant={item.next_bill_status === "overdue" ? "destructive" : "secondary"}>{statusLabels[item.next_bill_status]}</Badge><p className="mt-1 text-xs">{formatDate(item.next_due_date)}</p></TableCell>
                  <TableCell>{currency(item.yearly_cost)}</TableCell>
                  <TableCell>{item.payment_method_label ?? "Not set"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {item.is_active && <Button size="sm" variant="outline" isDisabled={busy} onPress={() => {
                        setPaying(item); setPayment({ amount: item.amount, paid_on: summary?.as_of_date ?? new Date().toISOString().slice(0, 10) }); setPaymentError("");
                      }}>Record payment</Button>}
                      <Button size="icon-sm" variant="ghost" aria-label={"Edit " + item.name} isDisabled={busy} onPress={() => openForm(item)}><Pencil className="size-4" /></Button>
                      <Button size="icon-sm" variant="ghost" aria-label={"Payment history for " + item.name} isDisabled={busy} onPress={() => showHistory(item)}><History className="size-4" /></Button>
                      <Button size="icon-sm" variant="ghost" aria-label={(item.is_active ? "Archive " : "Restore ") + item.name} isDisabled={busy} onPress={() => archive(item)}><Archive className="size-4" /></Button>
                      {item.payment_count === 0 && <Button size="icon-sm" variant="ghost" aria-label={"Delete " + item.name} isDisabled={busy} onPress={() => { setDeleting(item); setDeleteError(""); }}><Trash2 className="size-4 text-destructive" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog isOpen={dialogOpen} onOpenChange={(open) => { if (!busy && !readingIcon) setDialogOpen(open); }} isDismissable={!busy && !readingIcon} showCloseButton={!busy && !readingIcon} className="max-h-[90dvh] overflow-y-auto sm:max-w-[540px]">
        <DialogHeader><DialogTitle>{editing ? "Edit Subscription" : "Add Subscription"}</DialogTitle><DialogDescription>Enter the price per billing period and the next unpaid due date.</DialogDescription></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="subscription-name">Name</Label><Input id="subscription-name" required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Music service" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="subscription-amount">Amount (USD)</Label><Input id="subscription-amount" required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <Select aria-label="Billing cycle" className="w-full" selectedKey={form.billing_cycle} onSelectionChange={(key) => { if (key === "monthly" || key === "annual") setForm({ ...form, billing_cycle: key }); }}>
              <Label>Billing cycle</Label><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem id="monthly">Monthly</SelectItem><SelectItem id="annual">Annual</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="subscription-due-input">Next due date</Label><DatePickerInput id="subscription-due" value={form.next_due_date} onChange={(date) => setForm({ ...form, next_due_date: date })} /></div>
          <div className="space-y-2"><CategorySelect value={form.category} onChange={(category) => setForm({ ...form, category })} />{form.category && <Button type="button" size="sm" variant="ghost" onPress={() => setForm({ ...form, category: null })}>Clear category</Button>}</div>
          <div className="space-y-2"><Label htmlFor="subscription-method">Payment method nickname (optional)</Label><Input id="subscription-method" maxLength={100} value={form.payment_method_label} onChange={(e) => setForm({ ...form, payment_method_label: e.target.value })} placeholder="Discover" /></div>
          <div className="space-y-2"><Label htmlFor="subscription-icon">Icon (optional, up to 2 MiB)</Label><Input id="subscription-icon" type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadIcon} disabled={readingIcon || busy} />
            {form.icon && <div className="flex items-center gap-3"><img src={form.icon} alt="Icon preview" className="size-10 rounded-lg object-cover" /><Button type="button" size="sm" variant="ghost" onPress={() => setForm({ ...form, icon: null })}>Remove icon</Button></div>}
          </div>
          {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
          <DialogFooter><Button type="button" variant="outline" isDisabled={busy || readingIcon} onPress={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" isDisabled={busy || readingIcon}>{busy ? "Saving…" : "Save Subscription"}</Button></DialogFooter>
        </form>
      </Dialog>

      <Dialog isOpen={!!paying} onOpenChange={(open) => { if (!open && !busy) setPaying(null); }} isDismissable={!busy} showCloseButton={!busy}>
        <DialogHeader><DialogTitle>Record payment</DialogTitle><DialogDescription>{paying?.name} · Due {paying ? formatDate(paying.next_due_date) : ""}. This records a payment you made; it does not charge your card or add an expense to Transactions.</DialogDescription></DialogHeader>
        <form onSubmit={recordPayment} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="subscription-paid-on">Paid on (UTC date)</Label><Input id="subscription-paid-on" type="date" required max={summary?.as_of_date} value={payment.paid_on} onChange={(e) => setPayment({ ...payment, paid_on: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="subscription-paid-amount">Amount paid (USD)</Label><Input id="subscription-paid-amount" type="number" required min="0.01" step="0.01" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} /></div>
          {paymentError && <p role="alert" className="text-sm text-destructive">{paymentError}</p>}
          <DialogFooter><Button type="button" variant="outline" isDisabled={busy} onPress={() => setPaying(null)}>Cancel</Button><Button type="submit" isDisabled={busy}>{busy ? "Saving…" : "Confirm payment"}</Button></DialogFooter>
        </form>
      </Dialog>

      <Dialog isOpen={!!deleting} onOpenChange={(open) => { if (!open && !busy) setDeleting(null); }} isDismissable={!busy} showCloseButton={!busy}>
        <DialogHeader><DialogTitle>Delete subscription?</DialogTitle><DialogDescription>Remove {deleting?.name} from your saved subscriptions. This does not cancel the service with its provider.</DialogDescription></DialogHeader>
        {deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}
        <DialogFooter><Button variant="outline" isDisabled={busy} onPress={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" isDisabled={busy} onPress={remove}>{busy ? "Deleting…" : "Delete subscription"}</Button></DialogFooter>
      </Dialog>

      <Dialog isOpen={!!history} onOpenChange={(open) => { if (!open) setHistory(null); }}>
        <DialogHeader><DialogTitle>Payment history</DialogTitle><DialogDescription>{history?.name}</DialogDescription></DialogHeader>
        <div className="max-h-80 space-y-3 overflow-y-auto">
          {history?.payments.length === 0 && <p className="text-sm text-muted-foreground">No recorded payments yet.</p>}
          {history?.payments.map((entry) => <div key={entry.id} className="flex justify-between gap-4 rounded-lg border p-3"><div><p className="text-sm">Paid {formatDate(entry.paid_on)}</p><p className="text-xs text-muted-foreground">Bill due {formatDate(entry.due_date)}</p></div><span className="font-medium">{currency(entry.amount)}</span></div>)}
        </div>
      </Dialog>
    </div>
  );
}
