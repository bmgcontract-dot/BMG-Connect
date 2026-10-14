import { suppliersFromContracts } from './directory.js';

const fail = (status, message) => Object.assign(new Error(message), { status });

// A shared directory requires supplier permission, never unrestricted contract access.
export function createSupplierDirectoryReader({ verifyToken, getProfile, getContracts }) {
  return async ({ token }) => {
    if (!token) throw fail(401, 'unauthorized');
    let identity;
    try { identity = await verifyToken(token); } catch { throw fail(401, 'unauthorized'); }
    const profile = await getProfile(identity.uid);
    if (!profile || profile.authUid !== identity.uid || profile.status !== 'Active') throw fail(403, 'forbidden');
    if (identity.admin !== true && profile.permissions?.proj_contractors?.view !== true) throw fail(403, 'forbidden');
    return { suppliers: suppliersFromContracts(await getContracts()) };
  };
}
