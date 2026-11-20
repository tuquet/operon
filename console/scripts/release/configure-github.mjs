import { execFileSync } from 'node:child_process';

import { config, isMain } from './common.mjs';
import { github, readState, writeState } from './github.mjs';
import { auditEvent } from './state.mjs';

if (isMain(import.meta.url)) {
  if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN)
    process.env.GH_TOKEN = execFileSync('gh', ['auth', 'token'], {
      encoding: 'utf8',
    }).trim();
  if (!process.argv.includes('--apply')) {
    console.log(
      'Planned: immutable releases, required quality checks on main, protected version tags, deployment environments and an empty release registry. Pass --apply to configure.',
    );
    process.exit(0);
  }
  const viewer = JSON.parse(
    execFileSync('gh', ['api', 'user'], { encoding: 'utf8' }),
  );
  await github('immutable-releases', { method: 'PUT' });
  await github('actions/permissions/workflow', {
    method: 'PUT',
    body: {
      default_workflow_permissions: 'read',
      can_approve_pull_request_reviews: true,
    },
  });
  for (const environment of [
    'release-build',
    'release-stable',
    'release-prerelease',
    'release-management',
  ]) {
    await github(`environments/${environment}`, {
      method: 'PUT',
      body: {
        ...(environment === 'release-stable'
          ? {
              reviewers: [{ type: 'User', id: viewer.id }],
              prevent_self_review: false,
            }
          : {}),
        deployment_branch_policy: {
          protected_branches: false,
          custom_branch_policies: true,
        },
      },
    });
    const existing = await github(
      `environments/${environment}/deployment-branch-policies`,
    );
    const policies =
      environment === 'release-stable'
        ? [{ name: 'v*', type: 'tag' }]
        : [
            { name: 'main', type: 'branch' },
            ...(environment === 'release-management'
              ? []
              : [{ name: 'v*', type: 'tag' }]),
          ];
    for (const policy of policies) {
      if (
        !existing.branch_policies.some(
          (item) => item.name === policy.name && item.type === policy.type,
        )
      )
        await github(`environments/${environment}/deployment-branch-policies`, {
          method: 'POST',
          body: policy,
        });
    }
  }
  await github('branches/main/protection', {
    method: 'PUT',
    body: {
      required_status_checks: { strict: true, contexts: ['Frontend quality'] },
      enforce_admins: true,
      required_pull_request_reviews: {
        required_approving_review_count: 0,
        dismiss_stale_reviews: true,
        require_code_owner_reviews: false,
      },
      restrictions: null,
      required_conversation_resolution: true,
      allow_force_pushes: false,
      allow_deletions: false,
    },
  });
  const rulesets = await github('rulesets');
  const existing = rulesets.find(
    (item) => item.name === 'Version tag integrity',
  );
  await github(existing ? `rulesets/${existing.id}` : 'rulesets', {
    method: existing ? 'PUT' : 'POST',
    body: {
      name: 'Version tag integrity',
      target: 'tag',
      enforcement: 'active',
      conditions: { ref_name: { include: ['refs/tags/v*'], exclude: [] } },
      rules: [{ type: 'deletion' }, { type: 'non_fast_forward' }],
    },
  });
  const { sha, state } = await readState();
  if (!sha) {
    state.history.push({ ...auditEvent(), action: 'initialize' });
    await writeState(null, state, 'release: initialize registry');
  }
  console.log(
    `Configured production release lifecycle for ${config.repository}. Signing secrets were not read or changed.`,
  );
}
