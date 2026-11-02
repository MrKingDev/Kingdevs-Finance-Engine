"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BackupImport from "./backupImport";
import CSVImport from "./csvImport";

export default function Imports() {
  return (
    <Tabs defaultSelectedKey="csv" className="space-y-5">
      <TabsList aria-label="Import format">
        <TabsTrigger id="csv">CSV transactions</TabsTrigger>
        <TabsTrigger id="backup">JSON backup</TabsTrigger>
      </TabsList>
      <TabsContent id="csv">
        <CSVImport />
      </TabsContent>
      <TabsContent id="backup">
        <BackupImport />
      </TabsContent>
    </Tabs>
  );
}
