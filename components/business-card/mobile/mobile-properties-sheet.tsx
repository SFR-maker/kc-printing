"use client";

import { BottomSheet } from "./bottom-sheet";
import { ElementPropertiesContent } from "../element-properties-content";

export function MobilePropertiesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Edit Properties">
      <ElementPropertiesContent />
    </BottomSheet>
  );
}
