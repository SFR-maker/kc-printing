import sharp from "sharp";
import { buildCustomBusinessCard, type CustomDesignInfo } from "../lib/business-card/templates/ai-custom";
import { exportCardPdf } from "../lib/business-card/export";

const INFO: CustomDesignInfo = {
  businessName: "Whitfield & Co. Realty", tagline: "Modern homes", phone: "(816) 555-0142",
  email: "d@w.com", website: "w.com", linkedin: "", address: "Dallas",
  palette: ["#123C69", "#C9A24B", "#111111"], headingFont: "Playfair Display",
  bodyFont: "Cormorant Garamond", includeQrCode: false,
};

async function main() {
  const art = await sharp({ create: { width: 1200, height: 700, channels: 3, background: { r: 30, g: 60, b: 105 } } }).jpeg().toBuffer();
  const { front, back } = buildCustomBusinessCard(INFO, `data:image/jpeg;base64,${art.toString("base64")}`, 1200, 700);
  for (const wm of [false, true]) {
    const t = Date.now();
    const { buffer } = await exportCardPdf(front, back, wm);
    console.log(`watermark=${String(wm).padEnd(5)} ${((Date.now() - t) / 1000).toFixed(1)}s  ${(buffer.length / 1024).toFixed(0)}KB`);
  }
}
main().catch((e) => { console.error(String(e).slice(0, 300)); process.exitCode = 1; });
