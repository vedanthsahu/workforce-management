import axios from "axios";

// One place that turns a failed request into text a user can act on, instead of
// axios's own "Request failed with status code 403".
//
// The backend wraps every error as { error: { code, message } } (see
// backend/main.py http_exception_handler) -- older/plain responses may carry
// `detail` or `message` instead -- so a readable reason is usually available.
// When it isn't, fall back to a message for the status code, then to `fallback`.

type ErrorBody = {
  detail?: { message?: string } | string | unknown[];
  message?: string;
  error?: { message?: string };
};

const MESSAGE_FOR_STATUS: Record<number, string> = {
  400: "That request couldn't be processed. Please check the details and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "You don't have permission to do this.",
  404: "We couldn't find what you were looking for.",
  409: "This was just changed by someone else. Please refresh and try again.",
  422: "Some of the details aren't valid. Please check them and try again.",
  429: "Too many requests. Please wait a moment and try again.",
};

const NETWORK_MESSAGE = "We couldn't reach the server. Please check your connection and try again.";
const SERVER_MESSAGE = "Something went wrong on our side. Please try again in a moment.";

export function getApiErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as ErrorBody | undefined;
    const detail = body?.detail;
    const fromBody =
      (detail && typeof detail === "object" && !Array.isArray(detail) ? detail.message : null) ??
      (typeof detail === "string" ? detail : null) ??
      body?.error?.message ??
      body?.message ??
      null;
    if (typeof fromBody === "string" && fromBody.trim()) return fromBody;

    const status = err.response?.status;
    if (!err.response) return NETWORK_MESSAGE;
    if (status && status >= 500) return SERVER_MESSAGE;
    if (status && MESSAGE_FOR_STATUS[status]) return MESSAGE_FOR_STATUS[status];
    return fallback;
  }
  // A plain `Error` is one our own code threw with a message written for the
  // user. Other error types (TypeError and so on) carry technical text.
  if (err instanceof Error && err.constructor === Error && err.message) return err.message;
  return fallback;
}
