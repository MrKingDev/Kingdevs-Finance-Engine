import type { ReactNode } from "react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Metric({
  label,
  value,
  icon,
  bg,
  text,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  bg: string;
  text: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div
          className={`
            mb-5 flex size-10
            items-center justify-center
            rounded-xl
            ${bg}
            ${text}
          `}
        >
          {icon}
        </div>

        <CardTitle>{label}</CardTitle>
        <CardDescription>{value}</CardDescription>
      </CardHeader>
    </Card>
  );
}
