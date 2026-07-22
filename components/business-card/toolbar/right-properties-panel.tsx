"use client";

import { ElementPropertiesContent } from "../element-properties-content";

export function RightPropertiesPanel() {
  return (
    <div className="flex w-64 shrink-0 flex-col overflow-y-auto border-l border-kc-border bg-white p-4">
      <ElementPropertiesContent />
    </div>
  );
}
