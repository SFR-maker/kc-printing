/** "Create with AI" custom design generator is capped to a handful of free generations per person
 * (tracked in AiDesignGeneration, keyed by signed-in userId or anonymousToken) so a live nano-banana
 * call can't be triggered in an unbounded loop by one visitor. */
export const FREE_AI_DESIGN_LIMIT = 3;
