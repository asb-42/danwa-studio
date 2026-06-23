/**
 * Optimization Proposals — API client functions.
 *
 * HITL review of meta-agent-generated workflow optimisation proposals.
 * All endpoints are under /api/v1/optimization-proposals.
 */

import { request } from '../api.js';

// ─── Workflow reflection ────────────────────────────────────────────

/**
 * Trigger the meta-agent to generate a new optimisation proposal
 * for a workflow by reflecting on its execution history.
 * @param {string} workflowId
 * @returns {Promise<{ proposal_id: string, target_workflow_id: string, status: string }>}
 */
export function reflectOnWorkflow(workflowId) {
  return request(`/api/v1/optimization-proposals/workflows/${encodeURIComponent(workflowId)}/reflect`, {
    method: 'POST',
  });
}

// ─── Proposals CRUD ─────────────────────────────────────────────────

/**
 * List proposals, optionally filtered by status or workflow.
 * @param {{ status?: string, workflow_id?: string, limit?: number, offset?: number }} [opts]
 * @returns {Promise<Array>}
 */
export function listProposals({ status = null, workflow_id = null, limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (status) params.set('status', status);
  if (workflow_id) params.set('workflow_id', workflow_id);
  return request(`/api/v1/optimization-proposals?${params.toString()}`);
}

/**
 * Get a single proposal by ID.
 * @param {string} proposalId
 * @returns {Promise<Object>}
 */
export function getProposal(proposalId) {
  return request(`/api/v1/optimization-proposals/${encodeURIComponent(proposalId)}`);
}

/**
 * Approve a proposal — applies the suggested changes to the workflow.
 * @param {string} proposalId
 * @returns {Promise<Object>}
 */
export function approveProposal(proposalId) {
  return request(`/api/v1/optimization-proposals/${encodeURIComponent(proposalId)}/approve`, {
    method: 'POST',
  });
}

/**
 * Reject a proposal.
 * @param {string} proposalId
 * @returns {Promise<Object>}
 */
export function rejectProposal(proposalId) {
  return request(`/api/v1/optimization-proposals/${encodeURIComponent(proposalId)}/reject`, {
    method: 'POST',
  });
}
