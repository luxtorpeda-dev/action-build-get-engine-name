const core = require('@actions/core');
const githubReq = require('@actions/github');
const fs = require('fs').promises;
const path = require('path');

console.log('Starting.');

async function run() {
    try {
        const context = githubReq.context;
        const github = githubReq.getOctokit(core.getInput('token'));
        const isPullRequest = context.payload.pull_request;
        const commits = !isPullRequest ? context.payload.commits.filter(c => c.distinct) : [{
            id: context.payload.pull_request.head.sha
        }];
        const repository = context.payload.repository;
        const organization = repository.organization;
        const owner = organization || repository.owner;
        
        let engineName;

        for(let i = 0; i < commits.length; i++) {
            const args = {
                owner: !isPullRequest ? owner: context.payload.pull_request.head.repo.owner.login,
                repo: !isPullRequest ? repository.name : context.payload.pull_request.head.repo.name,
                ref: commits[i].id
            };
            
            const ret = await github.rest.repos.getCommit(args);

            if(ret && ret.data && ret.data.files) {
                for(let y = 0; y < ret.data.files.length; y++) {
                    const filename = ret.data.files[y].filename;
                    
                    const filePath = filename.split('/');
                    if(filePath[0] === 'engines') {
                       engineName = filePath[1];
                    }
                    
                    break;
                }
            }
            
            if(engineName) {
                break;
            }
        }
        
        if(engineName) {
            console.log(`Found Engine Name: ${engineName}`);
            core.setOutput('engine', engineName);
            
            let container = 'registry.gitlab.steamos.cloud/steamrt/sniper/sdk:3.0.20250210.116596';
            
            console.log(`Found container name: ${container}`);
            core.setOutput('container', container);
        } else {
            core.setFailed('Failed to find engine name');
        }
    }
    catch (error) {
        core.setFailed(error.message);
    }
}

run();
