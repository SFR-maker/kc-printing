/**
 * Proves the R2 credentials work, without printing them.
 *
 * Run before the first upload:  node --env-file=.env.local scripts/r2-check.mjs
 *
 * The failure modes here are distinctive and worth naming, because the error text is not:
 *   SignatureDoesNotMatch  - usually a token created under My Profile -> API Tokens rather than
 *                            R2 -> Manage API tokens. They are different systems; only the R2 one
 *                            authenticates against the S3 endpoint.
 *   NoSuchBucket           - R2_BUCKET does not match the bucket name, or the token is scoped to a
 *                            different bucket.
 *   AccessDenied           - token exists but lacks Object Read & Write.
 */
import { S3Client, HeadBucketCommand, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;

const missing = Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET })
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length) {
  console.error("Missing from .env.local:", missing.join(", "));
  process.exit(1);
}

const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
console.log("endpoint :", endpoint);
console.log("bucket   :", R2_BUCKET);
console.log("key id   :", `${R2_ACCESS_KEY_ID.slice(0, 4)}…${R2_ACCESS_KEY_ID.slice(-4)} (${R2_ACCESS_KEY_ID.length} chars)`);
console.log("secret   : withheld (%d chars)\n", R2_SECRET_ACCESS_KEY.length);

const s3 = new S3Client({
  region: "auto",
  endpoint,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const step = async (label, fn) => {
  try {
    const detail = await fn();
    console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ""}`);
    return true;
  } catch (err) {
    console.log(`  FAIL  ${label} — ${err.name}: ${err.message}`);
    return false;
  }
};

let ok = true;
ok = (await step("bucket reachable and token valid", async () => {
  await s3.send(new HeadBucketCommand({ Bucket: R2_BUCKET }));
})) && ok;

ok = (await step("can list objects (read)", async () => {
  const r = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, MaxKeys: 5 }));
  return `${r.KeyCount ?? 0} object(s) currently in the bucket`;
})) && ok;

const probeKey = "_connectivity-check.txt";
ok = (await step("can write (put)", async () => {
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: probeKey,
    Body: `written by scripts/r2-check.mjs at ${new Date().toISOString()}`,
    ContentType: "text/plain",
  }));
})) && ok;

ok = (await step("can delete (cleanup)", async () => {
  await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: probeKey }));
})) && ok;

console.log(ok ? "\nCredentials are good. Ready to upload." : "\nSomething is wrong — see the FAIL line above.");
process.exit(ok ? 0 : 1);
