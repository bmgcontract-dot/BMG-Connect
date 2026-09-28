export function unlockScheduleApproval(currentApproval, updatedAt) {
  if (!currentApproval || typeof currentApproval !== 'object' || Array.isArray(currentApproval)) {
    throw new TypeError('currentApproval must be an object');
  }

  if (typeof updatedAt !== 'string' || updatedAt.length === 0) {
    throw new TypeError('updatedAt is required');
  }

  return {
    ...currentApproval,
    isLocked: false,
    status: 'Pending HR',
    hrApprovedBy: null,
    updatedAt,
  };
}
