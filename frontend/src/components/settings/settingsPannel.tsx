"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { map } from "motion/react-client";

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
    lable: "Option 1",
    optionId: "option-1",
    content: (
      <Card>
        <CardHeader>
          <CardTitle>Option 2</CardTitle>
          <CardDescription>Settings for option 2.</CardDescription>
        </CardHeader>

        <CardContent>
          <p>Option 2 content</p>
        </CardContent>
      </Card>
    ),
  },
  {
    lable: "Option 2",
    optionId: "option-2",
    content: (
      <Card>
        <CardHeader>
          <CardTitle>Option 2</CardTitle>
          <CardDescription>Settings for option 2.</CardDescription>
        </CardHeader>

        <CardContent>
          <p>Option 2 content</p>
        </CardContent>
      </Card>
    ),
  },
  {
    lable: "Option 3",
    optionId: "option-3",
    content: (
      <Card>
        <CardHeader>
          <CardTitle>Option 2</CardTitle>
          <CardDescription>Settings for option 2.</CardDescription>
        </CardHeader>

        <CardContent>
          <p>Option 2 content</p>
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
