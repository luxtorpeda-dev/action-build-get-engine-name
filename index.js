const core = require('@actions/core');
const githubReq = require('@actions/github');

async function run() {
    try {
        const context = githubReq.context;
        const github = githubReq.getOctokit(core.getInput('token'));

        const isPullRequest = !!context.payload.pull_request;
        const repoInfo = isPullRequest
        ? context.payload.pull_request.head.repo
        : context.payload.repository;

        const owner = repoInfo.owner.login || repoInfo.owner.name;
        const repo = repoInfo.name;
        const engines = new Set();

        if (isPullRequest) {
            // compare base branch (usually master) with head commit of PR
            const base = context.payload.pull_request.base.sha;
            const head = context.payload.pull_request.head.sha;

            const compare = await github.rest.repos.compareCommits({
                owner,
                repo,
                base,
                head
            });

            const changedFiles = compare.data.files || [];
            for (const file of changedFiles) {
                const parts = file.filename.split('/');
                if (parts.length >= 2 && parts[0] === 'engines') {
                    engines.add(parts[1]);
                }
            }
        } else {
            // Push event, use current SHA and get its parent commit
            const commitSha = context.sha;
            const commitData = await github.rest.repos.getCommit({
                owner,
                repo,
                ref: commitSha
            });

            const parentSha = commitData.data.parents?.[0]?.sha;
            if (!parentSha) {
                core.setFailed('No parent commit found for comparison.');
                return;
            }

            const compare = await github.rest.repos.compareCommits({
                owner,
                repo,
                base: parentSha,
                head: commitSha
            });

            const changedFiles = compare.data.files || [];
            for (const file of changedFiles) {
                const parts = file.filename.split('/');
                if (parts.length >= 2 && parts[0] === 'engines') {
                    engines.add(parts[1]);
                }
            }
        }

        if (engines.size > 0) {
            const engineList = Array.from(engines);
            console.log(`Detected engines: ${engineList.join(', ')}`);
            core.setOutput('engines', JSON.stringify(engineList));

            const container = 'registry.gitlab.steamos.cloud/steamrt/sniper/sdk:3.0.20251110.180943';
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
