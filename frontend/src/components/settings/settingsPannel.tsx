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
    lable: "Import CSV",
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
    lable: "Preferences",
    optionId: "pref",
    content: (
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Control presentation, rule behavior, and deterministic alert
            thresholds
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p>Option 2 content</p>
        </CardContent>
      </Card>
    ),
  },
  {
    lable: "Downloadables",
    optionId: "download",
    content: (
      <Card>
        <CardHeader>
          <CardTitle>Downloadables</CardTitle>
          <CardDescription>
            Export a professional PDF summary or safe transaction CSV
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p>Option 3 content</p>
        </CardContent>
      </Card>
    ),
  },
  {
    lable: "Rules",
    optionId: "rules",
    content: (
      <Card>
        <CardHeader>
          <CardTitle>Rule Settings</CardTitle>
          <CardDescription>
            Higher numbers run first. Equal priorities use the older rule ID
            first
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p>Option 3 content</p>
        </CardContent>
      </Card>
    ),
  },
  {
    lable: "Categories",
    optionId: "catgeories",
    content: (
      <Card>
        <CardHeader>
          <CardTitle>Categories Settings</CardTitle>
          <CardDescription>
            Organize spending with accessible colors and icons.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p>Option 3 content</p>
        </CardContent>
      </Card>
    ),
  },
];

export default function SettingsPanel() {
  return (
    <Tabs defaultSelectedKey="option-1" className="w-full">
      <TabsList
        variant="line"
        className="
          w-full
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
            className={tabTriggerStyles}
          >
            {tabOption.lable}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabOptions.map((tabOption) => (
        <TabsContent
          key={tabOption.optionId}
          id={tabOption.optionId}
          className={tabContentStyles}
        >
          {tabOption.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
