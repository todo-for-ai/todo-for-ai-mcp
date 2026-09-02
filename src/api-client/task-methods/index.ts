/**
 * Task methods re-export
 *
 * This module re-exports all task-related API methods from the sub-modules.
 */

// Core task operations (20 functions)
export {
  getProjectTasksByName,
  getTaskById,
  getTaskEvidence,
  setTaskDod,
  listMyTasks,
  searchTasks,
  updateTaskStatus,
  reportProgress,
  requestApproval,
  submitTaskFeedback,
  createTask,
  getProjectInfo,
  listReviewQueue,
  listTaskAssignments,
  listTaskEvents,
  postTaskEvent,
  handoffTask,
  dispatchTasks,
  createSubtask,
  updateTaskAssignment,
  getSharedContext,
  setSharedContext,
  deleteSharedContext,
  getRunLogs,
  appendRunLogs,
  listTaskTemplates,
  createTaskTemplate,
  instantiateTaskTemplate,
  registerCapabilities,
  testConnection,
} from './core.js';

// Task analytics (16 functions)
export {
  getTaskAllocationFairness,
  escalateOverdueTasks,
  fireDueTriggers,
  getTaskStats,
  getTaskOverdueTrend,
  getTaskOverdueByAssignee,
  getTaskOverdueClustering,
  getTaskCompletionByPriority,
  getTaskCompletionRateByProject,
  getTaskPriorityTrend,
  getTaskCompletionForecast,
  getTaskCompletionByProject,
  getTaskCompletionByAssignee,
  getTaskDependencyChain,
  getTaskCommentSentimentTrend,
  getTaskReworkAnalysis,
} from './analytics.js';

// Cross-project / workflow (5 functions)
export {
  findCrossProjectTasks,
  claimCrossProjectTask,
  setStepRuntimeOverride,
  clearStepRuntimeOverride,
  getStepEffectiveParams,
} from './cross-project.js';
