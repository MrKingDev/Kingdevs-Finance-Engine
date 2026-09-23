import { Trash } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const value = 50;

const BudgetCard = () => {
  return (
    <div>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <CardTitle className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
              <span>September</span>
              <span>2026</span>
            </div>

            <span className="text-lg font-semibold">Monthly Budget</span>
          </CardTitle>

          <CardAction>
            <Button
              variant="destructive"
              size="icon"
              aria-label="Delete budget"
            >
              <Trash className="size-4" />
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Budget Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Budget</p>
              <p className="font-semibold">$100.00</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Spent</p>
              <p className="font-semibold">$100.00</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="font-semibold">$100.00</p>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">Budget usage</p>
              <p className="font-medium">{value}% used</p>
            </div>

            <Progress
              aria-label="Budget progress"
              value={value}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetCard;
