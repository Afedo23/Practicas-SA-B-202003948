// Tabla de permisos: qué roles pueden acceder a cada ruta protegida del backend
// principal. Este es el "cerebro" del microservicio de autorización: vive aquí,
// desacoplado del servicio de autenticación, tal como pide el Requerimiento 9.
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  'GET /protected/route1': ['ADMIN'],
  'GET /protected/route2': ['ADMIN', 'CLIENTE'],
};

export function isRoleAllowed(route: string, role: string): boolean {
  const allowedRoles = ROUTE_PERMISSIONS[route];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}
