"use client";
import React, { PropsWithChildren } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
}

export default function Modal({
  open,
  onClose,
  children,
  title,
}: PropsWithChildren<ModalProps>) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md p-6">
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}
        <div className="pt-2">{children}</div>
      </DialogContent>
    </Dialog>
  );
}