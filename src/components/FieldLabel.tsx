import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

interface FieldLabelProps {
  htmlFor: string;
  children: ReactNode;
  requirement?: string;
}

function FieldLabel({ htmlFor, children, requirement = "Required" }: FieldLabelProps) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <Label htmlFor={htmlFor}>{children}</Label>
      <span aria-hidden="true" className="text-xs font-normal text-muted-foreground">{requirement}</span>
    </div>
  );
}

export default FieldLabel;
