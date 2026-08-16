/**
 * Stands in for the `server-only` package under vitest.
 *
 * The real package is a build-time tripwire: it resolves to a module that throws if a bundler ever
 * pulls it into a client build, which is how lib/pricing/*-server and lib/specials guarantee their
 * megabytes of price tables and their Prisma import never reach a browser.
 *
 * Vitest runs in node with no client/server graph, so that guard has nothing to protect and instead
 * blocks importing a route handler in a unit test at all. Stubbing it here keeps the protection
 * exactly where it matters - the Next build - while letting the API routes be tested directly.
 */
export {};
