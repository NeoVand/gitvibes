/**
 * First-match-wins glob evaluator for shell commands, modeled on the
 * deepagents permissions evaluator: declaration order IS the policy. The
 * first rule whose pattern matches the (whitespace-normalized) command
 * decides. If no rule matches, the answer is 'ask' — the human stays in the
 * loop by default.
 */

export type RuleAction = 'allow' | 'deny' | 'ask';

export interface CommandRule {
	/** Glob over the whole command line: `*` any text, `?` one character. */
	pattern: string;
	action: RuleAction;
}

export interface RuleResult {
	/** What the first matching rule says — 'ask' when no rule matches. */
	action: RuleAction;
	matchedRule: CommandRule | null;
	/** Index of the matched rule (handy for UIs); -1 when no rule matched. */
	ruleIndex: number;
	reason?: string;
}

/** Glob-to-regex compiler for the small subset of patterns we need. */
function globToRegex(glob: string): RegExp {
	const re = glob
		.trim()
		.replace(/[.+^$(){}|[\]\\]/g, '\\$&')
		.replace(/\*/g, '.*')
		.replace(/\?/g, '.');
	return new RegExp(`^${re}$`);
}

function normalize(cmd: string): string {
	return cmd.trim().replace(/\s+/g, ' ');
}

export function evaluate(cmd: string, rules: CommandRule[]): RuleResult {
	const normalized = normalize(cmd);
	for (let i = 0; i < rules.length; i++) {
		const rule = rules[i];
		if (globToRegex(rule.pattern).test(normalized)) {
			return {
				action: rule.action,
				matchedRule: rule,
				ruleIndex: i,
				reason: rule.action === 'deny' ? `Denied by rule "${rule.pattern}".` : undefined
			};
		}
	}
	return { action: 'ask', matchedRule: null, ruleIndex: -1 };
}
