"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlanModeModal } from "@/components/plan-mode-modal";

interface GeneratePlanButtonProps {
  label?: string;
  variant?: "default" | "outline";
  className?: string;
}

export function GeneratePlanButton({
  label = "Gerar meu plano",
  variant = "default",
  className,
}: GeneratePlanButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        variant={variant}
        size="lg"
      >
        {label}
      </Button>
      <PlanModeModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
