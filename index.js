const core = require('@actions/core');
const { context, GitHub } = require('@actions/github');

console.log('Starting.');

async function run() {
    try {
        const github = new GitHub(core.getInput('token'));
        const isPullRequest = github.context.payload.pull_request;
        if(isPullRequest) {
            console.log(JSON.stringify(github.context.payload.pull_request));
        }
        const commits = !isPullRequest ? context.payload.commits.filter(c => c.distinct) : context.payload.pull_request.commits.filter(c => c.distinct);
        const repository = context.payload.repository;
        const organization = repository.organization;
        const owner = organization || repository.owner;
        
        let engineName;

        for(let i = 0; i < commits.length; i++) {
            const args = {
                owner: owner,
                repo: repository.name,
                ref: commits[i].id
            };
            
            const ret = await github.repos.getCommit(args);
            

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
        } else {
            core.setFailed('Failed to find engine name');
        }
    }
    catch (error) {
        core.setFailed(error.message);
    }
}

run();
