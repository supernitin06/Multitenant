const permissionCache = new Map();

/**
 * key: "<scope>:<roleId>"  (scope = "platform" | "tenant")
 * value: Set of permission keys
 */
export const getCachedPermissions = (key) => {
  return permissionCache.get(key);
};

export const setCachedPermissions = (key, permissions) => {
  permissionCache.set(key, new Set(permissions));
};

// Role ids are UUIDs, so clearing both scopes is safe.
export const clearRoleCache = (roleId) => {
  permissionCache.delete(`platform:${roleId}`);
  permissionCache.delete(`tenant:${roleId}`);
};

// Used when a permission itself is renamed or deleted.
export const clearAllPermissionCache = () => {
  permissionCache.clear();
};
