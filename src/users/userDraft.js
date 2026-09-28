export function createNewUserDraft({
  position = '',
  department = '',
  permissions = {},
} = {}) {
  return {
    employeeId: '',
    firstName: '',
    lastName: '',
    position,
    otherPosition: '',
    department,
    accessibleDepts: [],
    phone: '',
    username: '',
    password: '',
    photo: null,
    status: 'Active',
    permissions,
  };
}
