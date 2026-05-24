import type { RepoSeed } from './git-engine';

export interface PlaygroundScenario {
	id: string;
	title: string;
	description: string;
	hint: string;
	suggestedCommands: string[];
	seed: RepoSeed;
}

export const playgroundScenarios: PlaygroundScenario[] = [
	{
		id: 'ai-changes',
		title: 'AI changed 4 files',
		description: 'The AI modified three files and created one new file. Review and commit safely.',
		hint: 'Start with git status, stage what you trust, then commit.',
		suggestedCommands: ['git status', 'git add src/auth.py src/routes.py', 'git add .', 'git commit -m "feat: Add user authentication"'],
		seed: {
			commits: [
				{
					message: 'Initial commit',
					files: [
						{ path: 'README.md', content: '# My App\n' },
						{ path: 'src/app.py', content: 'print("hello")\n' }
					]
				}
			],
			workingFiles: [
				{ path: 'src/auth.py', content: 'def authenticate(user):\n    return True\n' },
				{ path: 'src/routes.py', content: 'from auth import authenticate\n\n@app.route("/login")\ndef login():\n    pass\n' },
				{ path: 'tests/test_auth.py', content: 'def test_auth():\n    assert True\n' },
				{ path: 'src/middleware.py', content: 'def middleware():\n    pass\n' }
			]
		}
	},
	{
		id: 'branch-experiment',
		title: 'Branch for AI experiment',
		description: 'Main is stable. Create a branch and commit AI work without touching main.',
		hint: 'Create a branch with git switch -c, then commit on it.',
		suggestedCommands: [
			'git log --oneline',
			'git switch -c feature/ai-experiment',
			'git add .',
			'git commit -m "feat: AI refactor attempt 1"'
		],
		seed: {
			commits: [
				{
					message: 'Initial commit',
					files: [{ path: 'src/main.py', content: 'def main():\n    pass\n' }]
				},
				{ message: 'Stable feature A', files: [{ path: 'src/main.py', content: 'def main():\n    run()\n' }] }
			],
			workingFiles: [
				{ path: 'src/main.py', content: 'def main():\n    run_ai_pipeline()\n' },
				{ path: 'src/utils.py', content: 'def helper():\n    return 42\n' }
			]
		}
	},
	{
		id: 'undo-mistake',
		title: 'Undo a bad commit',
		description: 'You committed too early. Soft-reset to uncommit while keeping your changes staged.',
		hint: 'Use git reset --soft HEAD~1 to move HEAD back one commit.',
		suggestedCommands: ['git log --oneline', 'git reset --soft HEAD~1', 'git status'],
		seed: {
			commits: [
				{
					message: 'Initial commit',
					files: [{ path: 'app.py', content: 'v1\n' }]
				},
				{
					message: 'WIP: half-baked AI output',
					files: [{ path: 'app.py', content: 'v1\n# broken ai code\n' }]
				}
			]
		}
	},
	{
		id: 'clean-slate',
		title: 'Clean slate',
		description: 'Empty repo — practice any Git commands from scratch.',
		hint: 'Create files with your editor in a real repo; here, use git add after seed files appear in scenarios.',
		suggestedCommands: ['git status', 'git branch', 'help'],
		seed: {
			commits: []
		}
	}
];

export function getScenario(id: string): PlaygroundScenario {
	return playgroundScenarios.find((s) => s.id === id) ?? playgroundScenarios[0];
}
