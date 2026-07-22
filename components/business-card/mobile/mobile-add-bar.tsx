"use client";

import { useState } from "react";
import { Type, Square, Image as ImageIcon, QrCode, Palette, Smile, LayoutGrid } from "lucide-react";
import { BottomSheet } from "./bottom-sheet";
import { TextTools } from "../tools/text-tools";
import { ShapeTools } from "../tools/shape-tools";
import { ImageUploadButton } from "../image-upload-button";
import { BackgroundTools } from "../tools/background-tools";
import { ElementsTools } from "../tools/elements-tools";
import { QrDialog } from "../qr-dialog";
import { TemplateSwitcher } from "../template-switcher";

type Tab = "text" | "shape" | "image" | "background" | "elements" | "templates" | null;

const TABS: { key: Exclude<Tab, null>; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "text", label: "Text", icon: Type },
  { key: "shape", label: "Shapes", icon: Square },
  { key: "image", label: "Image", icon: ImageIcon },
  { key: "background", label: "Background", icon: Palette },
  { key: "elements", label: "Emoji", icon: Smile },
  { key: "templates", label: "Templates", icon: LayoutGrid },
];

export function MobileAddBar() {
  const [active, setActive] = useState<Tab>(null);
  const [qrOpen, setQrOpen] = useState(false);

  return (
    <>
      <div className="flex items-stretch justify-around border-t border-kc-border bg-white px-1 py-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium text-kc-muted active:bg-kc-bg"
          >
            <tab.icon className="h-5 w-5" />
            {tab.label}
          </button>
        ))}
        <button onClick={() => setQrOpen(true)} className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium text-kc-muted active:bg-kc-bg">
          <QrCode className="h-5 w-5" />
          QR
        </button>
      </div>

      <BottomSheet open={active === "text"} onClose={() => setActive(null)} title="Add Text">
        <TextTools onInserted={() => setActive(null)} />
      </BottomSheet>
      <BottomSheet open={active === "shape"} onClose={() => setActive(null)} title="Shapes & Icons">
        <ShapeTools onInserted={() => setActive(null)} />
      </BottomSheet>
      <BottomSheet open={active === "image"} onClose={() => setActive(null)} title="Image / Logo">
        <ImageUploadButton onInserted={() => setActive(null)} />
      </BottomSheet>
      <BottomSheet open={active === "background"} onClose={() => setActive(null)} title="Background">
        <BackgroundTools onInserted={() => setActive(null)} />
      </BottomSheet>
      <BottomSheet open={active === "elements"} onClose={() => setActive(null)} title="Emoji">
        <ElementsTools onInserted={() => setActive(null)} />
      </BottomSheet>
      <BottomSheet open={active === "templates"} onClose={() => setActive(null)} title="Templates">
        <TemplateSwitcher onSelected={() => setActive(null)} />
      </BottomSheet>

      <QrDialog open={qrOpen} onOpenChange={setQrOpen} />
    </>
  );
}
