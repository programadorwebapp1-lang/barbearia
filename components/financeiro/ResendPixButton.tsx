"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/system-ui";

export function ResendPixButton({
  disabled,
  onClick,
}: {
  disabled?: boolean;
  onClick: () => Promise<void>;
}) {
  return (
    <Button variant="secondary" size="sm" disabled={disabled} onClick={onClick}>
      <RefreshCw className="w-3.5 h-3.5" />
      Reenviar Pix
    </Button>
  );
}
