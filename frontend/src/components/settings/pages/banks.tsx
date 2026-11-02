"use client";
import { useState } from "react";
import BankSelect from "@/components/banks/bankSelect";
import { useBanks } from "@/components/banks/bankProvider";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogTrigger, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { bankColor, bankTextColor } from "@/lib/banks";
import { API_URL, apiError, notifyFinanceChanged } from "@/lib/finance-api";

export default function BanksSettings() {
  const banks = useBanks();
  const [bank, setBank] = useState("");
  const [editName, setEditName] = useState("");
  const [editing, setEditing] = useState(false);
  const [editingColor, setEditingColor] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [replacement, setReplacement] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const selected = banks.data.find((item) => item.name.toLowerCase() === bank.trim().toLowerCase());
  const saved = selected?.color;
  const color = draft ?? saved ?? bankColor(bank);
  async function save(reset = false) {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`${API_URL}/banks/${reset ? "color/" : ""}${encodeURIComponent(bank.trim())}`, {
        method: reset ? "DELETE" : "PUT",
        headers: { "Content-Type": "application/json" },
        ...(reset ? {} : { body: JSON.stringify({ color }) }),
      });
      if (!response.ok) throw new Error(await apiError(response, "Unable to save badge color."));
      setDraft(null); setEditingColor(false); notifyFinanceChanged();
      setMessage(reset ? "Default badge color restored." : "Badge color saved everywhere this bank appears.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to save badge color."); }
    finally { setSaving(false); }
  }
  async function manage(remove = false) {
    setSaving(true); setError(""); setMessage("");
    try {
      const query = remove && replacement ? `?replacement=${encodeURIComponent(replacement)}` : "";
      const response = await fetch(`${API_URL}/banks/${encodeURIComponent(bank.trim())}${query}`, {
        method: remove ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        ...(remove ? {} : { body: JSON.stringify({ name: editName.trim() }) }),
      });
      if (!response.ok) throw new Error(await apiError(response, "Unable to update bank."));
      if (remove) { setBank(""); setEditName(""); }
      else { const updated = await response.json(); setBank(updated.name); setEditName(updated.name); }
      setEditing(false); setDeleting(false); setReplacement(""); setDraft(null);
      notifyFinanceChanged();
      setMessage(remove ? "Bank deleted. Existing transactions were preserved." : "Bank renamed across all its transactions.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to update bank."); }
    finally { setSaving(false); }
  }
  return <div className="max-w-xl space-y-4">
    <p className="text-sm text-muted-foreground">Choose a bank to edit its name or badge color. Changes are saved across devices. Renaming also updates existing transactions.</p>
    <BankSelect value={bank} disabled={saving} onChange={(value) => { setBank(value); setEditName(value); setDraft(null); setMessage(""); setError(""); setDeleting(false); setReplacement(""); }} />
    <span className="inline-block rounded-full px-3 py-1 text-sm font-medium" style={{ backgroundColor: color, color: bankTextColor(color) }}>{bank.trim() || "Bank preview"}</span>
    <div className="flex flex-wrap gap-2">
      {selected && <>
        <AlertDialogTrigger isOpen={editing} onOpenChange={(open) => { if (!saving) { setEditing(open); setEditName(selected.name); setError(""); } }}>
          <Button variant="outline" isDisabled={saving}>Edit bank name</Button>
          <AlertDialog isKeyboardDismissDisabled={saving}>
            <AlertDialogHeader>
              <AlertDialogTitle>Edit {selected.name}</AlertDialogTitle>
              <AlertDialogDescription>Renaming updates the bank on all its existing transactions.</AlertDialogDescription>
            </AlertDialogHeader>
            <label htmlFor="bank-name" className="text-sm font-medium">Bank name</label>
            <Input id="bank-name" value={editName} maxLength={100} disabled={saving} onChange={(event) => setEditName(event.target.value)} />
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <AlertDialogFooter>
              <AlertDialogCancel isDisabled={saving}>Cancel</AlertDialogCancel>
              <Button isDisabled={saving || !editName.trim() || editName.trim() === selected.name} onPress={() => void manage()}>{saving ? "Saving..." : "Save name"}</Button>
            </AlertDialogFooter>
          </AlertDialog>
        </AlertDialogTrigger>
        <AlertDialogTrigger isOpen={deleting} onOpenChange={(open) => { if (!saving) { setDeleting(open); setReplacement(""); setError(""); } }}>
          <Button variant="destructive" isDisabled={saving}>Delete bank</Button>
          <AlertDialog isKeyboardDismissDisabled={saving}>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selected.name}?</AlertDialogTitle>
              <AlertDialogDescription>Remove this bank from your options. Existing transactions will be preserved.</AlertDialogDescription>
            </AlertDialogHeader>
            {selected.transaction_count > 0 && <>
              <p className="text-sm text-muted-foreground">Choose where to move {selected.transaction_count} existing transactions.</p>
              <Select placeholder="Select replacement bank" aria-label="Replacement bank" selectedKey={replacement || null} isDisabled={saving} onSelectionChange={(key) => setReplacement(key === null ? "" : String(key))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{banks.data.filter((item) => item.name.toLowerCase() !== selected.name.toLowerCase()).map((item) => <SelectItem key={item.name} id={item.name}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
              {banks.data.length < 2 && <p className="text-sm">Cancel and add another bank using Other bank and save its color first.</p>}
            </>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <AlertDialogFooter>
              <AlertDialogCancel isDisabled={saving}>Cancel</AlertDialogCancel>
              <Button variant="destructive" isDisabled={saving || (selected.transaction_count > 0 && !replacement)} onPress={() => void manage(true)}>{saving ? "Deleting..." : "Delete bank"}</Button>
            </AlertDialogFooter>
          </AlertDialog>
        </AlertDialogTrigger>
      </>}
      <AlertDialogTrigger isOpen={editingColor} onOpenChange={(open) => { if (!saving) { setEditingColor(open); setDraft(null); setError(""); } }}>
        <Button variant="outline" isDisabled={saving || banks.loading || !!banks.error || !bank.trim()}>Edit badge color</Button>
        <AlertDialog isKeyboardDismissDisabled={saving}>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit badge for {bank}</AlertDialogTitle>
            <AlertDialogDescription>The saved color applies everywhere this bank appears. Reset restores its default color.</AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex items-center gap-3">Badge color
            <input aria-label="Badge color" type="color" value={color} disabled={saving} onChange={(event) => setDraft(event.target.value)} />
          </label>
          <span className="w-fit rounded-full px-3 py-1 text-sm font-medium" style={{ backgroundColor: color, color: bankTextColor(color) }}>{bank}</span>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button variant="outline" isDisabled={saving || !saved} onPress={() => void save(true)}>Reset color</Button>
          <AlertDialogFooter>
            <AlertDialogCancel isDisabled={saving}>Cancel</AlertDialogCancel>
            <Button isDisabled={saving || !draft} onPress={() => void save()}>{saving ? "Saving..." : "Save color"}</Button>
          </AlertDialogFooter>
        </AlertDialog>
      </AlertDialogTrigger>
    </div>
    {error && !editing && !editingColor && !deleting && <p role="alert" className="text-destructive">{error}</p>}
    <p role="status">{message}</p>
  </div>;
}
