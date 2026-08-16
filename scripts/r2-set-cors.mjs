/**
 * Applies the bucket CORS policy over the S3 API.
 *
 *   node --env-file=.env.local scripts/r2-set-cors.mjs
 *
 * Why this matters more than a normal CORS config: the design editor loads artwork with
 * `crossOrigin = "anonymous"` (components/business-card/use-html-image.ts) and exports through
 * `canvas.toDataURL()`. Cross-origin images without Access-Control-Allow-Origin fail onerror
 * outright, and a canvas that has drawn one becomes tainted and throws SecurityError on export.
 *
 * So the failure mode is: every template opens blank, export dies, and nothing appears in any
 * server log because none of it reached a server. Worth setting before the first asset is ever
 * requested from the CDN.
 *
 * localhost is included so the editor works against R2 during local development.
 */
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
for (const [k, v] of Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET })) {
  if (!v) {
    console.error(`Missing ${k} in .env.local`);
    process.exit(1);
  }
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const CORSRules = [
  {
    AllowedOrigins: ["https://611printing.com", "https://www.611printing.com", "http://localhost:3000"],
    // GET and HEAD only. Nothing in the browser writes to this bucket - uploads go through
    // UploadThing - so allowing anything else would widen the surface for no benefit.
    AllowedMethods: ["GET", "HEAD"],
    AllowedHeaders: ["*"],
    ExposeHeaders: ["Content-Length", "Content-Type"],
    MaxAgeSeconds: 3600,
  },
];

try {
  await s3.send(new PutBucketCorsCommand({ Bucket: R2_BUCKET, CORSConfiguration: { CORSRules } }));
  console.log("CORS policy applied to", R2_BUCKET);

  const back = await s3.send(new GetBucketCorsCommand({ Bucket: R2_BUCKET }));
  console.log("\nread back from the bucket:");
  for (const rule of back.CORSRules ?? []) {
    console.log("  origins:", rule.AllowedOrigins?.join(", "));
    console.log("  methods:", rule.AllowedMethods?.join(", "));
    console.log("  max age:", rule.MaxAgeSeconds);
  }
} catch (err) {
  console.error(`FAILED — ${err.name}: ${err.message}`);
  console.error("\nIf this is AccessDenied, the R2 API token needs Object Read & Write, or the");
  console.error("policy has to be set in the dashboard under Bucket → Settings → CORS policy.");
  process.exit(1);
}
