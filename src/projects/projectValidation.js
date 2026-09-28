function normalizeProjectIdentity(value) {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('th-TH')
    : '';
}

export function validateProjectUniqueness({ candidate, projects }) {
  const projectList = Array.isArray(projects) ? projects : [];
  const candidateName = normalizeProjectIdentity(candidate?.name);
  const existing = projectList.find((project) => (
    project?.id !== candidate?.id
    && normalizeProjectIdentity(project?.name) === candidateName
  ));

  if (existing) {
    return {
      valid: false,
      duplicateField: 'name',
      existingProjectId: existing.id,
    };
  }

  const candidateCode = normalizeProjectIdentity(candidate?.code);
  const existingCode = candidateCode && projectList.find((project) => (
    project?.id !== candidate?.id
    && normalizeProjectIdentity(project?.code) === candidateCode
  ));

  if (existingCode) {
    return {
      valid: false,
      duplicateField: 'code',
      existingProjectId: existingCode.id,
    };
  }

  return { valid: true };
}
