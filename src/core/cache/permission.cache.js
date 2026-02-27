const permissionCache = new Map();

/**
 * key: roleId
 * value: Set of permission keys
 */
export const getCachedPermissions = (roleId) => {
  return permissionCache.get(roleId);
};

export const setCachedPermissions = (roleId, permissions) => {
  permissionCache.set(roleId, new Set(permissions));
};

export const clearRoleCache = (roleId) => {
  permissionCache.delete(roleId);
};

console.log("permissionCache", permissionCache);
