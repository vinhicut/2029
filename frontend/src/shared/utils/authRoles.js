/**
 * Tiện ích kiểm tra phân quyền truy cập khu vực Quản lý.
 * Bao gồm 3 nhóm được cấp quyền: Nhà phát triển, Quản trị viên, Cộng tác viên.
 */

export function isAdminOrDeveloper(user) {
  if (!user || typeof user !== 'object') return false;
  const role = String(user.role || '').trim().toLowerCase();
  const accountType = String(user.account_type || '').trim().toLowerCase();
  const adminLevel = Number(user.admin_level || 0);
  return (
    role === 'developer' ||
    role === 'admin' ||
    role === 'manager' ||
    accountType === 'developer' ||
    accountType === 'admin' ||
    adminLevel > 0
  );
}

export function isCollaborator(user) {
  if (!user || typeof user !== 'object') return false;
  const role = String(user.role || '').trim().toLowerCase();
  const accountType = String(user.account_type || '').trim().toLowerCase();
  return role === 'collaborator' || accountType === 'collaborator';
}

export function isDeveloperAccount(user) {
  if (!user || typeof user !== 'object') return false;
  const role = String(user.role || '').trim().toLowerCase();
  const accountType = String(user.account_type || '').trim().toLowerCase();
  return Boolean(user.is_developer) || role === 'developer' || accountType === 'developer';
}

export function isSandboxActive(user) {
  if (!user || typeof user !== 'object') return false;
  return isDeveloperAccount(user) && Boolean(user.is_sandbox);
}

export function hasManagementAccess(user) {
  if (!user || typeof user !== 'object') return false;
  return Boolean(user.can_access_management) || isAdminOrDeveloper(user) || isCollaborator(user);
}

export function getManagementRoleLabel(user) {
  if (!user || typeof user !== 'object') return '';
  const role = String(user.role || '').trim().toLowerCase();
  const accountType = String(user.account_type || '').trim().toLowerCase();
  const adminLevel = Number(user.admin_level || 0);
  if (role === 'developer' || accountType === 'developer' || adminLevel === 1) {
    return 'Nhà phát triển';
  }
  if (isAdminOrDeveloper(user)) {
    return 'Quản trị viên';
  }
  if (isCollaborator(user)) {
    return 'Cộng tác viên';
  }
  return '';
}

const DEVELOPER_EMAILS = ['tranngocxuanbach7@gmail.com'];

export function getRoleBadgeInfo(user) {
  if (!user || typeof user !== 'object') {
    return { label: 'KHÁCH HÀNG', variant: 'customer' };
  }
  const email = String(user.email || '').trim().toLowerCase();
  const role = String(user.role || '').trim().toLowerCase();
  const accountType = String(user.account_type || '').trim().toLowerCase();
  const adminLevel = Number(user.admin_level || 0);

  if (
    DEVELOPER_EMAILS.includes(email) ||
    role === 'developer' ||
    accountType === 'developer'
  ) {
    return { label: 'NHÀ PHÁT TRIỂN', variant: 'developer' };
  }

  if (
    role === 'admin' ||
    role === 'manager' ||
    accountType === 'admin' ||
    adminLevel > 0
  ) {
    return { label: 'QUẢN TRỊ VIÊN', variant: 'admin' };
  }

  if (role === 'collaborator' || accountType === 'collaborator') {
    return { label: 'CỘNG TÁC VIÊN', variant: 'collaborator' };
  }

  return { label: 'KHÁCH HÀNG', variant: 'customer' };
}
