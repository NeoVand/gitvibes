import git from 'isomorphic-git';
import type { GitEngine } from './git-engine';
import { writeRemoteTrackingRef } from './remote-state';

/** feature (C,D) diverged from main (E,F) after shared B */
export async function buildMergeRebaseRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('A - shared history', [{ path: 'README.md', content: '# App\n' }]);
	await engine.commitFiles('B - shared history', [{ path: 'src/app.py', content: 'base\n' }]);

	await git.branch({ fs: engine.fs, dir: engine.dir, ref: 'feature', checkout: true });
	await engine.commitFiles('C - your work', [{ path: 'src/feature.py', content: 'feature c\n' }]);
	await engine.commitFiles('D - your work', [{ path: 'src/feature.py', content: 'feature d\n' }]);

	await git.checkout({ fs: engine.fs, dir: engine.dir, ref: 'main' });
	await engine.commitFiles('E - teammate', [{ path: 'src/main.py', content: 'teammate e\n' }]);
	await engine.commitFiles('F - teammate', [{ path: 'src/main.py', content: 'teammate f\n' }]);

	await git.checkout({ fs: engine.fs, dir: engine.dir, ref: 'feature' });
}

/** feature branch mid-merge with conflict in src/model.py */
export async function buildMergeConflictRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [{ path: 'src/model.py', content: 'x = 1\n' }]);

	await git.branch({
		fs: engine.fs,
		dir: engine.dir,
		ref: 'feature/ai-experiment',
		checkout: true
	});
	await engine.commitFiles('AI change', [
		{ path: 'src/model.py', content: 'x = 10\n# AI refactor\n' }
	]);

	await git.checkout({ fs: engine.fs, dir: engine.dir, ref: 'main' });
	await engine.commitFiles('Teammate change', [
		{ path: 'src/model.py', content: 'x = 5\n# teammate fix\n' }
	]);

	await git.checkout({ fs: engine.fs, dir: engine.dir, ref: 'feature/ai-experiment' });

	// Leave a REAL in-progress merge behind: abortOnConflict:false writes the
	// conflict markers and index stages, and engine.mergeState is what makes
	// git status report unmerged paths, git merge --abort work, and the
	// resolution commit come out with two parents.
	const origHead = await git.resolveRef({ fs: engine.fs, dir: engine.dir, ref: 'HEAD' });
	const theirsOid = await git.resolveRef({
		fs: engine.fs,
		dir: engine.dir,
		ref: 'refs/heads/main'
	});
	try {
		await git.merge({
			fs: engine.fs,
			dir: engine.dir,
			ours: 'feature/ai-experiment',
			theirs: 'main',
			abortOnConflict: false,
			author: { name: 'Vibe Coder', email: 'vibe@gitvibes.dev' }
		});
	} catch {
		engine.mergeState = { origHead, theirsOid, theirsLabel: 'main' };
		await engine.relabelConflictMarkers(['src/model.py'], 'feature/ai-experiment');
	}
}

/** Local main behind origin/main; user on feature branch */
export async function buildSyncRemoteRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Shared history', [{ path: 'README.md', content: '# App\n' }]);
	await engine.commitFiles('Local main', [{ path: 'src/app.py', content: 'local main\n' }]);
	const localMainOid = await engine.getCommitOid('main', 0);

	await engine.commitFiles('Teammate commit E', [{ path: 'src/shared.py', content: 'e\n' }]);
	await engine.commitFiles('Teammate commit F', [{ path: 'src/shared.py', content: 'ef\n' }]);
	const remoteMainOid = await engine.getCommitOid('main', 0);

	await git.checkout({ fs: engine.fs, dir: engine.dir, ref: localMainOid });
	await git.branch({
		fs: engine.fs,
		dir: engine.dir,
		ref: 'main',
		object: localMainOid,
		checkout: true,
		force: true
	});

	engine.remote.setBranch('main', remoteMainOid);
	// Deliberately stale: the tracking ref (and the lease knowledge) point at
	// the old tip until the learner fetches — that's the whole lesson.
	engine.remote.recordFetched('main', localMainOid);
	await writeRemoteTrackingRef(engine, 'origin', 'main', localMainOid);

	await git.branch({
		fs: engine.fs,
		dir: engine.dir,
		ref: 'feature/sync-practice',
		checkout: true
	});
	await engine.commitFiles('My feature commit', [{ path: 'src/feature.py', content: 'my work\n' }]);
}

/** Undo toolkit with pushed bad commit for revert practice */
export async function buildUndoRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [{ path: 'src/model.py', content: 'v1\n' }]);

	await git.branch({ fs: engine.fs, dir: engine.dir, ref: 'feature/experiment', checkout: true });
	await engine.commitFiles('feat: experiment', [{ path: 'src/model.py', content: 'v2\n' }]);
	await engine.commitFiles('bad: broken AI refactor', [
		{ path: 'src/model.py', content: 'broken ai\n' }
	]);

	const pushedOid = await engine.getCommitOid('feature/experiment', 0);
	engine.remote.setBranch('feature/experiment', pushedOid);
	engine.remote.recordFetched('feature/experiment', pushedOid);
	engine.remote.setUpstream('feature/experiment', 'feature/experiment');
	await writeRemoteTrackingRef(engine, 'origin', 'feature/experiment', pushedOid);

	await engine.writeFile('src/model.py', 'messed up by ai\n');
	await engine.writeFile('src/utils.py', 'bad ai output\n');
	await engine.writeFile('src/config.py', 'wrong config\n');
	await git.add({ fs: engine.fs, dir: engine.dir, filepath: 'src/utils.py' });
}

/** Branch ready to commit and push */
export async function buildBranchingRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [
		{ path: 'src/main.py', content: 'def main():\n    pass\n' }
	]);
	await engine.commitFiles('Stable feature A', [
		{ path: 'src/main.py', content: 'def main():\n    run()\n' }
	]);

	const mainOid = await engine.getCommitOid('main', 0);
	engine.remote.setBranch('main', mainOid);
	engine.remote.recordFetched('main', mainOid);
	await writeRemoteTrackingRef(engine, 'origin', 'main', mainOid);

	await engine.writeFile('src/main.py', 'def main():\n    run_ai_pipeline()\n');
	await engine.writeFile('src/utils.py', 'def helper():\n    return 42\n');
}

/** Committed to wrong branch — need to move commit to a feature branch */
export async function buildWrongBranchRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [{ path: 'README.md', content: '# App\n' }]);
	await engine.commitFiles('feat: add user model', [
		{ path: 'src/models.py', content: 'class User:\n    pass\n' }
	]);

	const mainOid = await engine.getCommitOid('main', 0);
	engine.remote.setBranch('main', mainOid);
	engine.remote.recordFetched('main', mainOid);
	await writeRemoteTrackingRef(engine, 'origin', 'main', mainOid);

	await engine.commitFiles('feat: add payment processing', [
		{ path: 'src/payments.py', content: 'def process_payment():\n    return True\n' },
		{ path: 'src/billing.py', content: 'def create_invoice():\n    pass\n' }
	]);
}

/** Accidentally staged files that shouldn't be committed */
export async function buildAccidentalStageRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [
		{ path: 'README.md', content: '# My App\n' },
		{ path: 'src/app.py', content: 'def main():\n    pass\n' },
		{ path: '.env', content: 'SECRET_KEY=old_key\n' }
	]);

	await engine.writeFile('src/app.py', 'def main():\n    run_server()\n');
	await engine.writeFile('.env', 'SECRET_KEY=supersecret123\nDB_PASSWORD=admin\n');
	await engine.writeFile('src/debug.py', 'import pdb; pdb.set_trace()\n');
	await engine.writeFile('src/feature.py', 'def new_feature():\n    return True\n');

	await git.add({ fs: engine.fs, dir: engine.dir, filepath: 'src/app.py' });
	await git.add({ fs: engine.fs, dir: engine.dir, filepath: '.env' });
	await git.add({ fs: engine.fs, dir: engine.dir, filepath: 'src/debug.py' });
	await git.add({ fs: engine.fs, dir: engine.dir, filepath: 'src/feature.py' });
}

/** Diverged from remote — need to force push safely */
export async function buildForcePushRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [{ path: 'README.md', content: '# App\n' }]);
	await engine.commitFiles('feat: Add core logic', [{ path: 'src/core.py', content: 'v1\n' }]);

	await git.branch({ fs: engine.fs, dir: engine.dir, ref: 'feature/cleanup', checkout: true });
	await engine.commitFiles('bad: AI broke everything', [
		{ path: 'src/core.py', content: 'broken\n' }
	]);
	await engine.commitFiles('wip: trying to fix', [
		{ path: 'src/core.py', content: 'still broken\n' }
	]);

	const pushedOid = await engine.getCommitOid('feature/cleanup', 0);
	engine.remote.setBranch('feature/cleanup', pushedOid);
	engine.remote.recordFetched('feature/cleanup', pushedOid);
	engine.remote.setUpstream('feature/cleanup', 'feature/cleanup');
	await writeRemoteTrackingRef(engine, 'origin', 'feature/cleanup', pushedOid);
}

/** Three commits, then a disastrous reset --hard that "lost" two of them */
export async function buildReflogRescueRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [
		{ path: 'README.md', content: '# Search Service\n' }
	]);
	await engine.commitFiles('feat: add ranking algorithm', [
		{ path: 'src/ranking.py', content: 'def rank(results):\n    return sorted(results)\n' }
	]);
	await engine.commitFiles('feat: add caching layer', [
		{ path: 'src/cache.py', content: 'cache = {}\n' }
	]);

	// The "agent disaster": a hard reset two commits back
	const target = await engine.getCommitOid('main', 2);
	await git.writeRef({
		fs: engine.fs,
		dir: engine.dir,
		ref: 'refs/heads/main',
		value: target,
		force: true
	});
	await git.checkout({ fs: engine.fs, dir: engine.dir, ref: 'main', force: true });
	engine.recordReflog(target, 'reset: moving to HEAD~2 (--hard)');
}

/**
 * feature branch diverged from main, both editing the same single line of
 * src/config.py — the conflict wraps the whole file and the resolution is
 * a clean one-line echo.
 */
export async function buildRebaseConflictRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [
		{ path: 'src/config.py', content: 'TIMEOUT = 30\n' },
		{ path: 'README.md', content: '# Inference Service\n' }
	]);

	await git.branch({ fs: engine.fs, dir: engine.dir, ref: 'feature/tuning', checkout: true });
	await engine.commitFiles('feat: raise timeout for slow model APIs', [
		{ path: 'src/config.py', content: 'TIMEOUT = 120\n' }
	]);

	await git.checkout({ fs: engine.fs, dir: engine.dir, ref: 'main' });
	await engine.commitFiles('fix: lower timeout after load test', [
		{ path: 'src/config.py', content: 'TIMEOUT = 10\n' }
	]);

	await git.checkout({ fs: engine.fs, dir: engine.dir, ref: 'feature/tuning' });
}

/** experiment branch with one gem commit worth cherry-picking to main */
export async function buildCherryPickRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [
		{ path: 'src/billing.py', content: 'def total(items):\n    return sum(items)\n' }
	]);

	await git.branch({ fs: engine.fs, dir: engine.dir, ref: 'experiment', checkout: true });
	await engine.commitFiles('wip: half-finished dashboard rewrite', [
		{ path: 'src/dashboard.py', content: '# TODO: everything\n' }
	]);
	await engine.commitFiles('fix: round currency to 2 decimal places', [
		{ path: 'src/billing.py', content: 'def total(items):\n    return round(sum(items), 2)\n' }
	]);

	await git.checkout({ fs: engine.fs, dir: engine.dir, ref: 'main' });
}

/** Linear history with a known-good older commit to explore */
export async function buildDetachedHeadRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [
		{ path: 'src/app.py', content: 'VERSION = "0.1"\n' }
	]);
	await engine.commitFiles('feat: version 0.2 — stable', [
		{ path: 'src/app.py', content: 'VERSION = "0.2"\n' }
	]);
	await engine.commitFiles('feat: version 0.3 — big refactor', [
		{ path: 'src/app.py', content: 'VERSION = "0.3"  # refactored\n' }
	]);
	await engine.commitFiles('feat: version 0.4 — experimental', [
		{ path: 'src/app.py', content: 'VERSION = "0.4"  # experimental\n' }
	]);
}

/**
 * The final challenge: three messes at once. A payment commit landed on main
 * instead of a branch, a secret .env is sitting staged, and the cleaned-up
 * main still needs its release tag.
 */
export async function buildCapstoneRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [
		{ path: 'README.md', content: '# Checkout Service\n' }
	]);
	await engine.commitFiles('feat: add user model', [
		{ path: 'src/models.py', content: 'class User:\n    pass\n' }
	]);

	const mainOid = await engine.getCommitOid('main', 0);
	engine.remote.setBranch('main', mainOid);
	engine.remote.recordFetched('main', mainOid);
	await writeRemoteTrackingRef(engine, 'origin', 'main', mainOid);

	// Mess 1: the payment feature was committed straight to main
	await engine.commitFiles('feat: add payment processing', [
		{ path: 'src/payments.py', content: 'def process_payment():\n    return True\n' }
	]);

	// Mess 2: a secret is staged, ready to leak into the next commit
	await engine.writeFile('.env', 'STRIPE_KEY=sk_live_51Hb9x\n');
	await git.add({ fs: engine.fs, dir: engine.dir, filepath: '.env' });

	// Mess 3 isn't a mess yet — it's the missing v1.0.0 tag on the clean main
}

const PRICING_OK =
	'def total(price, qty, discount):\n    return round(price * qty * (1 - discount), 2)\n';
const PRICING_BUG =
	'def total(price, qty, discount):\n    return round(price * qty - discount, 2)\n';

/**
 * Eight commits; one in the middle silently broke the pricing function.
 * `run-tests` passes or fails based on the checked-out code — bisect finds
 * the culprit in three steps instead of eight.
 */
export async function buildBisectRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [
		{ path: 'src/pricing.py', content: PRICING_OK },
		{ path: 'README.md', content: '# Pricing Service\n' }
	]);
	const goodTag = await engine.getCommitOid('main', 0);
	await git.tag({ fs: engine.fs, dir: engine.dir, ref: 'v1.0', object: goodTag });

	await engine.commitFiles('feat: add currency formatting', [
		{ path: 'src/format.py', content: 'def fmt(x):\n    return f"${x:.2f}"\n' }
	]);
	await engine.commitFiles('docs: document the pricing API', [
		{ path: 'README.md', content: '# Pricing Service\n\nSee src/pricing.py.\n' }
	]);
	await engine.commitFiles('refactor: tidy pricing internals', [
		{ path: 'src/pricing.py', content: `# pricing core\n${PRICING_OK}` }
	]);
	// The regression, buried mid-history by "an agent refactor"
	await engine.commitFiles('refactor: simplify discount math', [
		{ path: 'src/pricing.py', content: `# pricing core\n${PRICING_BUG}` }
	]);
	await engine.commitFiles('feat: add tax table', [
		{ path: 'src/tax.py', content: 'TAX = {"CA": 0.0725}\n' }
	]);
	await engine.commitFiles('style: reformat tax table', [
		{ path: 'src/tax.py', content: 'TAX = {\n    "CA": 0.0725,\n}\n' }
	]);
	await engine.commitFiles('feat: add invoice numbers', [
		{ path: 'src/invoice.py', content: 'def next_id(n):\n    return n + 1\n' }
	]);

	engine.testRunner = async (e) => {
		const pricing = await e.readFile('src/pricing.py');
		const pass = pricing?.includes('(1 - discount)') ?? false;
		return pass
			? { pass, output: 'test_pricing ✓  test_format ✓  test_tax ✓\n3 passed' }
			: {
					pass,
					output:
						'test_pricing ✗  expected 17.96, got 19.90\ntest_format ✓  test_tax ✓\n1 failed, 2 passed'
				};
	};
}

/**
 * A repo with (simulated) husky hooks installed: pre-commit fails while the
 * debug marker is still in the code, commit-msg enforces Conventional Commits.
 */
export async function buildHooksRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [
		{ path: 'src/app.py', content: 'def main():\n    return serve()\n' },
		{
			path: 'package.json',
			content: '{\n  "scripts": { "lint": "ruff check .", "test": "pytest" }\n}\n'
		}
	]);

	// The hook scripts exist as real files so `cat` shows them...
	await engine.writeFile(
		'.husky/pre-commit',
		'#!/bin/sh\nnpm run lint || exit 1\nnpm test || exit 1\n'
	);
	await engine.writeFile(
		'.husky/commit-msg',
		`#!/bin/sh\ngrep -qE '^(Merge|Revert)' "$1" && exit 0\nif ! grep -qE '^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\\(.+\\))?!?: .+' "$1"; then\n  echo "Commit message must follow Conventional Commits" >&2\n  exit 1\nfi\n`
	);
	await git.add({ fs: engine.fs, dir: engine.dir, filepath: '.husky/pre-commit' });
	await git.add({ fs: engine.fs, dir: engine.dir, filepath: '.husky/commit-msg' });
	await git.commit({
		fs: engine.fs,
		dir: engine.dir,
		message: 'chore: install husky hooks',
		author: { name: 'Vibe Coder', email: 'vibe@gitvibes.dev' }
	});

	// ...and the engine enforces them.
	engine.hooks = {
		preCommit: {
			file: 'src/app.py',
			marker: 'BREAKPOINT',
			error: "ruff: src/app.py:2: leftover debugging statement ('BREAKPOINT')"
		},
		commitMsg: {
			pattern:
				/^(Merge|Revert)|^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\(.+\))?!?: .+/,
			error: "Commit message must follow Conventional Commits, e.g. 'fix: remove debug statement'"
		}
	};

	// The agent left its mess: a debug marker in the code
	await engine.writeFile(
		'src/app.py',
		'def main():\n    BREAKPOINT  # agent forgot to remove this\n    return serve()\n'
	);
}

/** A feature branch with three messy WIP commits begging to become one */
export async function buildInteractiveRebaseRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [
		{ path: 'src/app.py', content: 'def main():\n    pass\n' }
	]);

	await git.branch({ fs: engine.fs, dir: engine.dir, ref: 'feature/onboarding', checkout: true });
	await engine.commitFiles('wip: try onboarding form', [
		{ path: 'src/form.py', content: 'def onboarding_form():\n    return "TODO"\n' }
	]);
	await engine.commitFiles('wip: fix typo', [
		{ path: 'src/form.py', content: 'def onboarding_form():\n    return "todo"\n' }
	]);
	await engine.commitFiles('wip: form works now', [
		{
			path: 'src/form.py',
			content: 'def onboarding_form():\n    return render("onboarding.html")\n'
		}
	]);
}

/** Two feature branches waiting for parallel agents — worktree practice */
export async function buildWorktreesRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [
		{ path: 'src/auth.py', content: 'def login():\n    pass\n' },
		{ path: 'src/payments.py', content: 'def charge():\n    pass\n' }
	]);
	await git.branch({ fs: engine.fs, dir: engine.dir, ref: 'feature/auth-refactor' });
	await git.branch({ fs: engine.fs, dir: engine.dir, ref: 'feature/payments' });
}

/** History ready for a release tag, with one previous release tagged */
export async function buildReleaseRobotRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [
		{ path: 'README.md', content: '# Data Tools\n' },
		{ path: 'CHANGELOG.md', content: '## 1.0.0 (2026-07-01)\n\nFirst stable release.\n' },
		{ path: 'src/cli.py', content: 'def main():\n    pass\n' }
	]);
	const v1 = await engine.getCommitOid('main', 0);
	await git.tag({ fs: engine.fs, dir: engine.dir, ref: 'v1.0.0', object: v1 });
	await engine.commitFiles('feat: add csv export', [
		{ path: 'src/export_csv.py', content: 'def export_csv(rows):\n    return rows\n' }
	]);
	await engine.commitFiles('fix: handle empty header row', [
		{
			path: 'src/export_csv.py',
			content: 'def export_csv(rows):\n    return [r for r in rows if r]\n'
		}
	]);
}

export async function buildReleaseRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [{ path: 'README.md', content: '# CLI Tool\n' }]);
	await engine.commitFiles('feat: add export command', [
		{ path: 'src/export.py', content: 'def export():\n    pass\n' }
	]);
	const v1 = await engine.getCommitOid('main', 0);
	await git.tag({ fs: engine.fs, dir: engine.dir, ref: 'v1.0.0', object: v1 });
	await engine.commitFiles('feat: add import command', [
		{ path: 'src/import.py', content: 'def import_data():\n    pass\n' }
	]);
	await engine.commitFiles('fix: handle empty exports', [
		{ path: 'src/export.py', content: 'def export():\n    return []\n' }
	]);
}
