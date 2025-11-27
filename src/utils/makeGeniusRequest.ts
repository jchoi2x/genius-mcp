export type MakeGeniusRequest = <T>(
  endpoint: string,
  params?: URLSearchParams,
) => Promise<T | null>;

export const buildMakeGeniusRequest = (apiBase: string, apiToken: string) => async function makeGeniusRequest<T>(
  endpoint: string,
  params?: URLSearchParams,
): Promise<T | null> {
  const url = new URL(endpoint, apiBase);
  if (params) {
    url.search = params.toString();
  }

  const token = apiToken;

  if (!token) {
    const authType = token ? "User Access Token" : "Client Access Token";
    const errorMsg = `Authentication required: Cannot authorize ${authType} for the endpoint ${endpoint}.`;
    throw new Error(errorMsg);
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "MCP-Genius-Server/1.0",
        Accept: "application/json", // Añadir por si acaso, aunque default es JSON
      },
    });

    const data: any = await response.json();

    if (!response.ok || (data.meta && data.meta.status >= 400)) {
      const status = data.meta?.status || response.status;
      const message = data.meta?.message || response.statusText;
      throw new Error(`Error calling API Genius [${status}]: ${message}`);
    }

    return data as T;
  } catch (error: any) {
    throw new Error(`Error calling Genius API: ${error.message}`);
  }
}
