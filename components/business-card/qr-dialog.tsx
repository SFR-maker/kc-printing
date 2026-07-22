"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildQrValue, type QrPayloadType } from "@/lib/business-card/qr";
import { contrastRatio } from "@/lib/business-card/validate";
import { createQrElement } from "@/lib/business-card/element-factory";
import { useCardEditorStore } from "@/lib/business-card/store";

const TYPE_LABELS: Record<QrPayloadType, string> = {
  url: "Website URL",
  phone: "Phone Number",
  email: "Email Address",
  sms: "Text Message",
  vcard: "Contact Card (vCard)",
  geo: "Map Location",
  text: "Plain Text",
};

export function QrDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [type, setType] = useState<QrPayloadType>("url");
  const [singleValue, setSingleValue] = useState("");
  const [vcard, setVcard] = useState({ name: "", org: "", phone: "", email: "", website: "" });
  const [geo, setGeo] = useState({ lat: "", lng: "", label: "" });
  const [foreground, setForeground] = useState("#111111");
  const [background, setBackground] = useState("#FFFFFF");

  const activeSide = useCardEditorStore((s) => s.activeSide);
  const addElement = useCardEditorStore((s) => s.addElement);
  const elements = useCardEditorStore((s) => (s.activeSide === "front" ? s.design.front.elements : s.design.back.elements));

  const input = type === "vcard" ? { name: vcard.name, org: vcard.org, phone: vcard.phone, email: vcard.email, website: vcard.website } : type === "geo" ? { lat: parseFloat(geo.lat), lng: parseFloat(geo.lng), label: geo.label } : singleValue;

  const { value, error } = buildQrValue(type, input as never);
  const ratio = contrastRatio(foreground, background);
  const lowContrast = ratio < 3;

  function handleInsert() {
    if (error || !value) return;
    const el = createQrElement({ payloadType: type, value, foreground, background }, elements);
    addElement(activeSide, el);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add QR Code</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>QR Code Type</Label>
            <Select value={type} onValueChange={(v) => v && setType(v as QrPayloadType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "vcard" ? (
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Full name *" value={vcard.name} onChange={(e) => setVcard({ ...vcard, name: e.target.value })} />
              <Input placeholder="Company" value={vcard.org} onChange={(e) => setVcard({ ...vcard, org: e.target.value })} />
              <Input placeholder="Phone" value={vcard.phone} onChange={(e) => setVcard({ ...vcard, phone: e.target.value })} />
              <Input placeholder="Email" value={vcard.email} onChange={(e) => setVcard({ ...vcard, email: e.target.value })} />
              <Input placeholder="Website" className="col-span-2" value={vcard.website} onChange={(e) => setVcard({ ...vcard, website: e.target.value })} />
            </div>
          ) : type === "geo" ? (
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Latitude *" value={geo.lat} onChange={(e) => setGeo({ ...geo, lat: e.target.value })} />
              <Input placeholder="Longitude *" value={geo.lng} onChange={(e) => setGeo({ ...geo, lng: e.target.value })} />
              <Input placeholder="Label (optional)" className="col-span-2" value={geo.label} onChange={(e) => setGeo({ ...geo, label: e.target.value })} />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>{type === "url" ? "Website URL" : type === "phone" || type === "sms" ? "Phone Number" : type === "email" ? "Email Address" : "Text"}</Label>
              <Input value={singleValue} onChange={(e) => setSingleValue(e.target.value)} placeholder={type === "url" ? "example.com" : ""} />
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Foreground</Label>
              <Input type="color" value={foreground} onChange={(e) => setForeground(e.target.value)} className="h-9 p-1" />
            </div>
            <div className="space-y-1.5">
              <Label>Background</Label>
              <Input type="color" value={background} onChange={(e) => setBackground(e.target.value)} className="h-9 p-1" />
            </div>
          </div>
          {lowContrast && (
            <p className="text-xs text-amber-600">
              Low contrast ({ratio.toFixed(1)}:1) — this QR code may not scan reliably. Aim for at least 3:1.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-kc-border">Cancel</Button>
          <Button onClick={handleInsert} disabled={!!error || !value} className="bg-kc-teal text-white hover:bg-kc-teal/90">
            Insert QR Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
