export interface OneLastRouterDiagnostics {
  endpoint?: string;
  status?: number;
  error?: string;
  modelCount?: number;
  checkedAt?: number;
}

const current: OneLastRouterDiagnostics = {};

export function getLastDiagnostics(): OneLastRouterDiagnostics {
  return { ...current };
}

export function setLastEndpoint(endpoint: string): void {
  current.endpoint = endpoint;
}

export function setLastStatus(status: number): void {
  current.status = status;
}

export function setLastError(error: string): void {
  current.error = error;
}

export function setLastModelCount(count: number): void {
  current.modelCount = count;
}

export function setCheckedAt(ts: number): void {
  current.checkedAt = ts;
}
