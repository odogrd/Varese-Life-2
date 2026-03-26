import { logger } from "./logger";

const BROWSERACT_API_BASE = "https://api.browseract.com/v2";

export interface BrowserActTask {
  taskId: string;
  status: string;
}

export async function triggerBrowserActWorkflow(
  workflowId: string,
  callbackUrl: string,
  apiKey?: string
): Promise<{ taskId: string }> {
  const key = apiKey || process.env.BROWSERACT_API_KEY;
  if (!key) throw new Error("BrowserAct API key not configured");

  const res = await fetch(`${BROWSERACT_API_BASE}/workflow/run-task`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workflow_id: workflowId,
      callback_url: callbackUrl,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 429 || err.toLowerCase().includes("quota")) {
      throw new Error("BROWSERACT_QUOTA_EXCEEDED");
    }
    throw new Error(`BrowserAct error ${res.status}: ${err}`);
  }

  const data = await res.json() as { task_id?: string; taskId?: string; id?: string };
  return { taskId: data.task_id || data.taskId || data.id || "unknown" };
}

export async function getBrowserActTaskStatus(taskId: string, apiKey?: string): Promise<BrowserActTask> {
  const key = apiKey || process.env.BROWSERACT_API_KEY;
  if (!key) throw new Error("BrowserAct API key not configured");

  const res = await fetch(`${BROWSERACT_API_BASE}/workflow/task/${taskId}`, {
    headers: {
      "Authorization": `Bearer ${key}`,
    },
  });

  if (!res.ok) {
    throw new Error(`BrowserAct status check failed: ${res.status}`);
  }

  const data = await res.json() as { status: string; task_id?: string };
  return { taskId, status: data.status };
}
