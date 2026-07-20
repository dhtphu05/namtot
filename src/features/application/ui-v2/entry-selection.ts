export function selectStudentApplicationSurface<T>(useV2: boolean, legacy: T, v2: T): T {
  return useV2 ? v2 : legacy;
}
