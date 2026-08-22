let state = { users: [], tasks: [] };
const $ = (selector) => document.querySelector(selector);
const toast = (message, error = false) => {
  const node = $("#toast");
  node.textContent = message;
  node.className = error ? "show error" : "show";
  setTimeout(() => (node.className = ""), 2800);
};
async function request(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: options?.body ? { "content-type": "application/json" } : undefined,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error?.message || data.error || "Ошибка запроса");
  return data;
}
function render() {
  $("#users").innerHTML = state.users
    .map(
      (user) =>
        `<article><b>${user.name}</b><span>${user.email}</span><code>${user.id}</code></article>`,
    )
    .join("");
  $("#newAssignee").innerHTML = state.users
    .map((user) => `<option value="${user.id}">${user.name}</option>`)
    .join("");
  $("#tasks").innerHTML = state.tasks
    .map((task) => {
      const assignee =
        state.users.find((user) => user.id === task.assigneeId)?.name ||
        task.assigneeId;
      const selected = (value) => (task.status === value ? "selected" : "");
      const selectedPriority = (value) =>
        task.priority === value ? "selected" : "";

      return `
        <article class="task" id="${task.id}">
          <div>
            <code>${task.id}</code>
            <h3>${task.title}</h3>
            <p>${task.project} · ${assignee}</p>
          </div>
          <label>
            Статус
            <select data-id="${task.id}" data-field="status">
              <option value="new" ${selected("new")}>Новая</option>
              <option value="progress" ${selected("progress")}>В работе</option>
              <option value="done" ${selected("done")}>Завершена</option>
              <option value="cancelled" ${selected("cancelled")}>Отменена</option>
            </select>
          </label>
          <label>
            Приоритет
            <select data-id="${task.id}" data-field="priority">
              <option value="low" ${selectedPriority("low")}>Низкий</option>
              <option value="medium" ${selectedPriority("medium")}>Средний</option>
              <option value="high" ${selectedPriority("high")}>Высокий</option>
            </select>
          </label>
          <label>
            Очки
            <input data-id="${task.id}" data-field="points" type="number" min="0" value="${task.points}">
          </label>
          <button class="delete" data-delete="${task.id}">Удалить</button>
        </article>
      `;
    })
    .join("");
}
async function load() {
  state = await request("/api/state");
  render();
}
document.addEventListener("change", async (event) => {
  const input = event.target;
  if (!input.dataset?.id) return;
  const value =
    input.dataset.field === "points" ? Number(input.value) : input.value;
  try {
    await request(`/api/tasks/${encodeURIComponent(input.dataset.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ [input.dataset.field]: value }),
    });
    toast("Задача сохранена");
    await load();
  } catch (error) {
    toast(error.message, true);
  }
});
document.addEventListener("click", async (event) => {
  const id = event.target.dataset?.delete;
  if (!id || !confirm("Удалить задачу из тестовой CRM?")) return;
  await request(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
  await load();
  toast("Задача удалена");
});
$("#openCreate").onclick = () => $("#createDialog").showModal();
$("#closeCreate").onclick = () => $("#createDialog").close();
$("#createForm").onsubmit = async (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  values.points = Number(values.points);
  await request("/api/tasks", { method: "POST", body: JSON.stringify(values) });
  $("#createDialog").close();
  event.currentTarget.reset();
  await load();
  toast("Задача создана");
};
load().catch((error) => toast(error.message, true));
