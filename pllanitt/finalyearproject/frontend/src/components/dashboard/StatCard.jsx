
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const StatCard = ({ title, value, description, icon, change }) => {
  return (
    <Card className="border border-border rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.1)] outline-none focus:outline-none focus-visible:outline-none active:outline-none focus:border-border focus-visible:border-border active:border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2 m-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-accent">{icon}</div>}
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {change && (
          <div className="flex items-center mt-1">
            <span
              className={
                change.type === 'increase'
                  ? 'text-green-600 text-xs'
                  : 'text-red-600 text-xs'
              }
            >
              {change.type === 'increase' ? '↑' : '↓'} {Math.abs(change.value)}%
            </span>
            <span className="text-xs text-muted-foreground ml-1">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
