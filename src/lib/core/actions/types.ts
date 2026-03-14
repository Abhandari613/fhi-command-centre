export type ActionError = {
  code: string;
  message: string;
  status: number;
  details?: any;
};

export type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string | ActionError;
};

export function createActionError(
  code: string,
  message: string,
  status: number = 400,
  details?: any,
): ActionError {
  return { code, message, status, details };
}
