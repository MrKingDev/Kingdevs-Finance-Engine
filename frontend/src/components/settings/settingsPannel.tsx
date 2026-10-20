"use client";

import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ClearData from "./pages/clearData";
import CategoriesSettings from "./pages/categories";
import CSVImport from "./pages/csvImport";
import ImportRules from "./pages/rules";
import Downloadables from "./pages/downloadables";

const tabOptions = [
  {
    label: "Import CSV",
    optionId: "csv",
    content: (
      <Card>
        <CardHeader>
          <CardTitle>Import Transactions</CardTitle>
          <CardDescription>
            Validate every row before anything reaches your ledger.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <CSVImport />
        </CardContent>
      </Card>
    ),
  },
  {
    label: "Downloadables",
    optionId: "download",
    content: (
      <Card>
        <CardHeader>
          <CardTitle>Downloadables</CardTitle>
          <CardDescription>
            Export a professional PDF summary or safe transaction CSV.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Downloadables />
        </CardContent>
      </Card>
    ),
  },
  {
    label: "Rules",
    optionId: "rules",
    content: (
      <Card>
        <CardHeader>
          <CardTitle>Rule Settings</CardTitle>
          <CardDescription>
            Automatically recognize expenses, income and categories in your CSV.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ImportRules />
        </CardContent>
      </Card>
    ),
  },
  {
    label: "Categories",
    optionId: "categories",
    content: (
      <Card>
        <CardHeader>
          <CardTitle>Categories Settings</CardTitle>
          <CardDescription>
            Create shared categories and choose their spending chart colors.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <CategoriesSettings />
        </CardContent>
      </Card>
    ),
  },
  {
    label: "Clear Data",
    optionId: "data",
    content: (
      <Card>
        <CardHeader>
          <CardTitle>CLEAR DATA</CardTitle>
          <CardDescription>
            This permanently deletes saved transactions, budgets, and
            categories. Goals, their entries and browser-only tools are unaffected. Restarting
            the backend does not restore deleted data.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ClearData />
        </CardContent>
      </Card>
    ),
  },
];

export default function SettingsPanel() {
  const [selectedTab, setSelectedTab] = useState("csv");
  useEffect(() => {
    const selectHashTab = () => {
      const key = window.location.hash.slice(1);
      if (tabOptions.some((tab) => tab.optionId === key)) setSelectedTab(key);
    };
    selectHashTab();
    window.addEventListener("hashchange", selectHashTab);
    return () => window.removeEventListener("hashchange", selectHashTab);
  }, []);
  return (
    <Tabs
      selectedKey={selectedTab}
      onSelectionChange={(key) => setSelectedTab(String(key))}
      className="w-full"
    >
      <div
        className="
      w-full
      overflow-x-auto
      overflow-y-hidden
      scrollbar-none
      [&::-webkit-scrollbar]:hidden
    "
      >
        <TabsList
          variant="line"
          className="
        h-11
        w-max
        min-w-full
        justify-start
        gap-1
        rounded-none
        border-b
        bg-transparent
        p-0
      "
        >
          {tabOptions.map((tabOption) => (
            <TabsTrigger
              key={tabOption.optionId}
              id={tabOption.optionId}
              className={`
            relative
            h-11
            shrink-0
            whitespace-nowrap
            rounded-none
            border-b-2
            border-transparent
            bg-transparent
            px-4
            py-0
            text-sm
            font-medium
            text-muted-foreground
            shadow-none
            transition-all
            duration-200

            hover:text-foreground

            data-[selected]:border-primary
            data-[selected]:bg-transparent
            data-[selected]:text-foreground
          `}
            >
              {tabOption.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {tabOptions.map((tabOption) => (
        <TabsContent
          key={tabOption.optionId}
          id={tabOption.optionId}
          className="mt-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        >
          {tabOption.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
