"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Styling
const tabTriggerStyles = `
  relative
  shrink-0
  whitespace-nowrap
  rounded-none
  border-b-2
  border-transparent
  bg-transparent
  px-4
  py-3
  text-sm
  font-medium
  text-muted-foreground
  shadow-none
  transition-all
  duration-200

  hover:text-foreground

  data-[selected]:border-primary
  data-[selected]:text-foreground
  data-[selected]:bg-transparent
`;

const tabContentStyles = `
  mt-6
  animate-in
  fade-in-0
  slide-in-from-bottom-2
  duration-300
`;

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
          <p>Option 1 content</p>
        </CardContent>
      </Card>
    ),
  },
  {
    label: "Preferences",
    optionId: "pref",
    content: (
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Control presentation, rule behavior, and deterministic alert
            thresholds.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p>Option 2 content</p>
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
          <p>Option 3 content</p>
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
            Higher numbers run first. Equal priorities use the older rule ID
            first.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p>Option 4 content</p>
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
            Organize spending with accessible colors and icons.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p>Option 5 content</p>
        </CardContent>
      </Card>
    ),
  },
];

export default function SettingsPanel() {
  return (
    <Tabs defaultSelectedKey="csv" className="w-full">
      <div
        className="
      w-full
      overflow-x-auto
      overflow-y-hidden
      [scrollbar-width:none]
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
