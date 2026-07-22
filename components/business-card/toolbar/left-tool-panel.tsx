"use client";

import { useState } from "react";
import { Type, Square, QrCode, Palette, Image as ImageIcon, Smile, LayoutGrid } from "lucide-react";
import { QrDialog } from "../qr-dialog";
import { TextTools } from "../tools/text-tools";
import { ShapeTools } from "../tools/shape-tools";
import { ImageUploadButton } from "../image-upload-button";
import { BackgroundTools } from "../tools/background-tools";
import { ElementsTools } from "../tools/elements-tools";
import { TemplateSwitcher } from "../template-switcher";

export function LeftToolPanel() {
  const [qrOpen, setQrOpen] = useState(false);

  return (
    <div className="flex w-64 shrink-0 flex-col gap-5 overflow-y-auto border-r border-kc-border bg-white p-4">
      <Section title="Text" icon={<Type className="h-3.5 w-3.5" />}>
        <TextTools />
      </Section>

      <Section title="Shapes & Icons" icon={<Square className="h-3.5 w-3.5" />}>
        <ShapeTools />
      </Section>

      <Section title="Image / Logo" icon={<ImageIcon className="h-3.5 w-3.5" />}>
        <ImageUploadButton />
      </Section>

      <Section title="QR Code" icon={<QrCode className="h-3.5 w-3.5" />}>
        <button
          onClick={() => setQrOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-kc-border px-3 py-2.5 text-sm font-medium text-kc-dark hover:border-kc-teal/40 hover:bg-kc-bg"
        >
          <QrCode className="h-4 w-4" /> Add QR Code
        </button>
        <QrDialog open={qrOpen} onOpenChange={setQrOpen} />
      </Section>

      <Section title="Background" icon={<Palette className="h-3.5 w-3.5" />}>
        <BackgroundTools />
      </Section>

      <Section title="Elements" icon={<Smile className="h-3.5 w-3.5" />}>
        <ElementsTools />
      </Section>

      <Section title="Templates" icon={<LayoutGrid className="h-3.5 w-3.5" />}>
        <TemplateSwitcher />
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-kc-muted">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}
