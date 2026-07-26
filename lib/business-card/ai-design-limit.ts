/** "Create with AI" custom design generator requires a signed-in account and is capped to a
 * handful of free generations per person (tracked in AiDesignGeneration, keyed by userId) so a
 * live nano-banana call can't be triggered in an unbounded loop by one visitor. */
export const FREE_AI_DESIGN_LIMIT = 3;
