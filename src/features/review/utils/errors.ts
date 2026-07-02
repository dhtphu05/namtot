export function getErrorMessage(error: unknown, fallback = "Vui lòng thử lại sau.") {
  if (!error) {
    return fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}
