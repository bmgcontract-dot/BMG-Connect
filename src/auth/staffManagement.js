// Authorization policy for the privileged /api/admin-users endpoint (creating,
// editing, deleting Firebase Authentication accounts for staff).
//
// Two roles may manage staff accounts:
//   1) Super Admin — a Firebase custom claim `admin: true`.
//   2) A "staff manager" — a normal user the admin granted the staff module
//      (proj_staff save OR edit) AND all-department access (accessibleDepts
//      includes 'All'). This matches the product model: admin ticks a module
//      permission → the user can perform that action, scoped by department access.
//
// Pure and side-effect free so it can be unit-tested without Firebase.

export function isSuperAdminClaim(decodedToken) {
  return decodedToken?.admin === true;
}

function accessibleDeptList(profile) {
  const deps = profile?.accessibleDepts;
  if (Array.isArray(deps)) return deps;
  if (typeof deps === 'string') return deps.split(',').map((d) => d.trim()).filter(Boolean);
  return [];
}

export function hasAllDepartmentAccess(profile) {
  return accessibleDeptList(profile).includes('All');
}

export function isActiveStaffManager(profile) {
  if (!profile || typeof profile !== 'object') return false;
  if (profile.status !== 'Active') return false;
  const staff = profile.permissions?.proj_staff;
  const canWriteStaff = staff?.save === true || staff?.edit === true;
  return canWriteStaff && hasAllDepartmentAccess(profile);
}

// The endpoint calls this with the caller's decoded token and their Firestore
// profile. Returns true when the caller may manage staff accounts.
export function canManageStaffAccounts(decodedToken, callerProfile) {
  return isSuperAdminClaim(decodedToken) || isActiveStaffManager(callerProfile);
}
