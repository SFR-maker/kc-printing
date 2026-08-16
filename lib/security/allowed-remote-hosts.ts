/**
 * The only hosts this server will fetch an image from, on any code path.
 *
 * This list is the fix for a confirmed blind SSRF: POST /api/card-designs/export is unauthenticated
 * by design, and before the allowlist existed it would fetch whatever URL a client put in an image
 * element - including 169.254.169.254, the cloud instance-credential endpoint. It hung for over ten
 * seconds on that one, because nothing bounded it either.
 *
 * It lived in two files as a verbatim copy (lib/business-card/resolve-images-server and
 * app/api/artwork/inspect). Duplicated security lists drift, and the failure is silent in the worse
 * direction: the copy someone forgets to update is the one still accepting a host the other has
 * dropped. One definition, imported by both.
 *
 * Everything here is hardcoded, deliberately. An allowlist read from an environment variable is an
 * allowlist that a misconfiguration - or anyone who can set env vars - can widen, which defeats the
 * point of having one.
 */

/** Uploads. UploadThing v7 serves from *.ufs.sh; the older hosts remain for existing designs. */
const UPLOAD_HOSTS = [/^utfs\.io$/, /^uploadthing\.com$/, /\.uploadthing\.com$/, /\.ufs\.sh$/];

/**
 * Template artwork on R2.
 *
 * Needed because the bulk artwork moved off local disk: thumbnails and PDF exports resolve srcs like
 * /images/card-art/... which now live at cdn.611printing.com. Exactly one host, not a wildcard over
 * the domain - a wildcard would also admit anything else ever hosted on a subdomain.
 */
const ASSET_CDN_HOSTS = [/^cdn\.611printing\.com$/];

export const ALLOWED_REMOTE_HOSTS = [...UPLOAD_HOSTS, ...ASSET_CDN_HOSTS];

/**
 * Whether the server may fetch this URL.
 *
 * https only: plain http would allow a downgrade to a plaintext internal address, and every host
 * above serves TLS regardless.
 */
export function isAllowedRemote(src: string): boolean {
  try {
    const u = new URL(src);
    if (u.protocol !== "https:") return false;
    return ALLOWED_REMOTE_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}
