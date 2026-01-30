"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@pixpilot/shadcn";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@pixpilot/shadcn";

export type ModalVariant = "dialog" | "sheet";

interface FormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  variant?: ModalVariant;
  /** Sheet 方向，仅在 variant="sheet" 时生效 */
  side?: "top" | "right" | "bottom" | "left";
  /** Dialog 宽度类名 */
  className?: string;
  /** Footer 内容（操作按钮等） */
  footer?: ReactNode;
}

export function FormModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  variant = "dialog",
  side = "right",
  className,
  footer,
}: FormModalProps) {
  if (variant === "sheet") {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side={side} className={className ?? "sm:max-w-lg flex flex-col p-0"}>
          <SheetHeader className="flex-shrink-0 px-6 pt-6">
            <SheetTitle>{title}</SheetTitle>
            {description && (
              <SheetDescription>{description}</SheetDescription>
            )}
          </SheetHeader>
          <div className="flex-1 overflow-auto">
            <div className="px-6 py-4">{children}</div>
          </div>
          {footer && (
            <div className="flex-shrink-0 border-t px-6 py-4 bg-background">
              {footer}
            </div>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className ?? "max-w-2xl flex flex-col max-h-[90vh] p-0"}>
        <DialogHeader className="flex-shrink-0 px-6 pt-6">
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          <div className="px-6 py-4">{children}</div>
        </div>
        {footer && (
          <div className="flex-shrink-0 border-t px-6 py-4">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
