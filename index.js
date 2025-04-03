const core = require('@actions/core');
const githubReq = require('@actions/github');

async function run() {
    try {
        const context = githubReq.context;
        const github = githubReq.getOctokit(core.getInput('token'));

        const isPullRequest = !!context.payload.pull_request;

        if (!isPullRequest) {
            core.setFailed('This action only works on pull requests.');
            return;
        }

        const base = 'master';
        const head = context.payload.pull_request.head.sha;

        const owner = context.payload.pull_request.head.repo.owner.login;
        const repo = context.payload.pull_request.head.repo.name;

        const compare = await github.rest.repos.compareCommits({
            owner,
            repo,
            base,
            head
        });

        const changedFiles = compare.data.files || [];
        const engines = new Set();

        for (const file of changedFiles) {
            const parts = file.filename.split('/');
            if (parts.length >= 2 && parts[0] === 'engines') {
                engines.add(parts[1]);
            }
        }

        if (engines.size > 0) {
            const engineList = Array.from(engines);
            console.log(`Detected engines: ${engineList.join(', ')}`);
            core.setOutput('engines', JSON.stringify(engineList));

            const container = 'registry.gitlab.steamos.cloud/steamrt/sniper/sdk:3.0.20250210.116596';
            console.log(`Using container: ${container}`);
            core.setOutput('container', container);
        } else {
            core.setFailed('No engine changes detected.');
        }

    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
