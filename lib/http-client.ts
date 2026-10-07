export async function readJSON<T>(response: Response): Promise<T> {
  let data: { error?: string } | undefined;
  const text = await response.text();
  try {
    data = JSON.parse(text);
  } catch {
    /* A proxy may return plain text or HTML. */
  }
  if (!response.ok) {
    throw new Error(
      data?.error ||
        (response.status === 413
          ? "The upload service rejected this file size. Please choose a smaller file or try again."
          : response.status === 401 || response.status === 403
            ? "Your session has expired or access was denied. Sign in again."
            : `The service could not complete this request (${response.status}). Please try again.`),
    );
  }
  if (!data)
    throw new Error(
      "The service returned an unexpected response. Please try again.",
    );
  return data as T;
}
