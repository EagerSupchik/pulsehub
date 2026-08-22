import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dataPath = join(root, "data.json");
const port = Number(process.env.TEST_CRM_PORT || 4100);

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function json(response, status, value) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(value));
}

async function body(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function publicFile(pathname) {
  if (pathname === "/" || pathname === "/index.html")
    return ["index.html", "text/html; charset=utf-8"];
  if (pathname === "/app.js")
    return ["app.js", "text/javascript; charset=utf-8"];
  if (pathname === "/styles.css")
    return ["styles.css", "text/css; charset=utf-8"];
  return null;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);
    if (request.method === "GET" && url.pathname === "/api/state") {
      const state = await readJson(dataPath, { users: [], tasks: [] });
      return json(response, 200, state);
    }
    if (request.method === "GET" && url.pathname === "/api/tasks") {
      const state = await readJson(dataPath, { users: [], tasks: [] });
      return json(response, 200, {
        tasks: state.tasks,
        users: state.users,
      });
    }
    if (request.method === "POST" && url.pathname === "/api/tasks") {
      const input = await body(request);
      const state = await readJson(dataPath, { users: [], tasks: [] });
      const task = {
        id: `CRM-${Date.now().toString().slice(-6)}`,
        title: String(input.title || "Новая задача").trim(),
        project: String(input.project || "Основной проект").trim(),
        assigneeId: String(input.assigneeId || state.users[0]?.id || ""),
        status: "new",
        priority: input.priority || "medium",
        points: Math.max(0, Number(input.points) || 0),
        dueAt: input.dueAt || null,
      };
      state.tasks.unshift(task);
      await writeJson(dataPath, state);
      return json(response, 201, { task });
    }
    const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
    if (request.method === "PATCH" && taskMatch) {
      const input = await body(request);
      const state = await readJson(dataPath, { users: [], tasks: [] });
      const task = state.tasks.find(
        (item) => item.id === decodeURIComponent(taskMatch[1]),
      );
      if (!task) return json(response, 404, { error: "Задача не найдена" });
      for (const key of [
        "title",
        "project",
        "assigneeId",
        "status",
        "priority",
        "dueAt",
      ])
        if (key in input) task[key] = input[key];
      if ("points" in input)
        task.points = Math.max(0, Number(input.points) || 0);
      if (task.status === "done") task.completedAt ||= new Date().toISOString();
      else delete task.completedAt;
      await writeJson(dataPath, state);
      return json(response, 200, { task });
    }
    if (request.method === "DELETE" && taskMatch) {
      const state = await readJson(dataPath, { users: [], tasks: [] });
      const before = state.tasks.length;
      state.tasks = state.tasks.filter(
        (item) => item.id !== decodeURIComponent(taskMatch[1]),
      );
      await writeJson(dataPath, state);
      return json(response, before === state.tasks.length ? 404 : 200, {
        ok: before !== state.tasks.length,
      });
    }
    const file = publicFile(url.pathname);
    if (request.method === "GET" && file) {
      response.writeHead(200, {
        "content-type": file[1],
        "cache-control": "no-store",
      });
      return response.end(await readFile(join(root, "public", file[0])));
    }
    json(response, 404, { error: "Маршрут не найден" });
  } catch (error) {
    json(response, 500, {
      error: error instanceof Error ? error.message : "Внутренняя ошибка",
    });
  }
});

server.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
