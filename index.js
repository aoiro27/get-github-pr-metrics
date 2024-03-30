import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";

const octokit = new Octokit({
  authStrategy: createAppAuth,
  auth: {
    appId: 'YOUR-APP-ID',
    privateKey: 'YOUR-PRIVATE-KEY',
    installationId: 'YOUR-INSTALLATION-ID',
  },
});

async function getPRDetailsForOrg(org) {
  try {
    // Get all repos for the organization
    const { data: repos } = await octokit.request('GET /orgs/{org}/repos', {
      org,
      type: 'public',
      per_page: 100
    });

    // Filter out archived repositories
    const activeRepos = repos.filter(repo => !repo.archived);

    // Iterate over each repository
    for (const repo of activeRepos) {
      console.log(`Repository: ${repo.name}`);

      // Get all PRs for the repository
      const { data: prs } = await octokit.request('GET /repos/{owner}/{repo}/pulls', {
        owner: org,
        repo: repo.name,
        state: 'all',
        per_page: 100
      });

      // Filter PRs to only include open PRs and PRs closed within the last week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const relevantPRs = prs.filter(pr => pr.state === 'open' || (pr.state === 'closed' && new Date(pr.closed_at) >= oneWeekAgo));

      // Iterate over each PR
      for (const pr of relevantPRs) {
        // Get PR comments
        const { data: comments } = await octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
          owner: org,
          repo: repo.name,
          issue_number: pr.number,
          per_page: 100
        });

        // Get PR commits
        const { data: commits } = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/commits', {
          owner: org,
          repo: repo.name,
          pull_number: pr.number,
          per_page: 100
        });

        // Output PR details
        console.log(`  PR number: ${pr.number}`);
        console.log(`  PR created at: ${pr.created_at}`);
        console.log(`  PR status: ${pr.state}`);
        console.log(`  First comment time: ${comments.length > 0 ? comments[0].created_at : 'No comments'}`);
        console.log(`  Last commit time: ${commits[commits.length - 1].commit.committer.date}`);
      }
    }
  } catch (error) {
    console.error(`Error! Status: ${error.status}. Message: ${error.message}`);
  }
}

getPRDetailsForOrg('orgName');