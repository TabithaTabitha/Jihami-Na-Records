(() => {
  "use strict";

  const STORAGE_KEY = "jihami.na.records.restaurant.floor-layout.v1";
  const canvas = document.getElementById("floorCanvas");
  const tableList = document.getElementById("tableList");
  const dialog = document.getElementById("tableDialog");
  const form = document.getElementById("tableForm");
  const nameInput = document.getElementById("tableName");
  const shapeInput = document.getElementById("tableShape");
  const chairInput = document.getElementById("chairCount");
  const formError = document.getElementById("formError");
  const savedText = document.getElementById("savedText");
  const toast = document.getElementById("toast");
  const emptyState = document.getElementById("emptyState");
  const tables = [];
  let editingId = null;
  let selectedId = null;
  let toastTimer;
  let saveTimer;

  const randomId = () => `tbl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const clamp = (number, min, max) => Math.min(max, Math.max(min, number));

  function loadLayout() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(parsed)) return;
      parsed.forEach((item) => {
        if (!item || typeof item.name !== "string") return;
        tables.push({
          id: typeof item.id === "string" ? item.id : randomId(),
          name: item.name.slice(0, 32),
          shape: ["round", "square", "rect"].includes(item.shape) ? item.shape : "round",
          chairs: clamp(Number.parseInt(item.chairs, 10) || 4, 1, 12),
          x: clamp(Number(item.x) || 50, 4, 96),
          y: clamp(Number(item.y) || 50, 8, 92)
        });
      });
    } catch (_) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (_) {
        // Storage can be disabled by the browser; keep the planner usable for
        // the current session even when it cannot persist the layout.
      }
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
      savedText.textContent = "Saved on this device";
      document.getElementById("savedStatus").classList.remove("is-saving");
    } catch (_) {
      savedText.textContent = "Could not save";
    }
  }

  function scheduleSave(message) {
    savedText.textContent = "Saving…";
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      persist();
      if (message) showToast(message);
    }, 180);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2200);
  }

  function addChairElements(node, count, shape) {
    const dimensions = shape === "round" ? [47, 47] : shape === "rect" ? [64, 38] : [50, 43];
    Array.from({ length: count }, (_, index) => {
      const chair = document.createElement("span");
      chair.className = "chair";
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
      const x = Math.cos(angle) * (dimensions[0] + 13);
      const y = Math.sin(angle) * (dimensions[1] + 13);
      chair.style.left = `calc(50% + ${x.toFixed(1)}px - 9px)`;
      chair.style.top = `calc(50% + ${y.toFixed(1)}px - 9px)`;
      chair.setAttribute("aria-hidden", "true");
      node.appendChild(chair);
    });
  }

  function render() {
    canvas.querySelectorAll(".floor-table").forEach((node) => node.remove());
    tableList.replaceChildren();
    emptyState.hidden = tables.length > 0;
    document.getElementById("tableTotal").textContent = String(tables.length);
    document.getElementById("seatTotal").textContent = String(tables.reduce((sum, table) => sum + table.chairs, 0));
    document.getElementById("listCount").textContent = `${tables.length} ${tables.length === 1 ? "table" : "configured"}`;

    tables.forEach((table) => {
      const node = document.createElement("div");
      node.className = `floor-table ${table.shape}${selectedId === table.id ? " selected" : ""}`;
      node.dataset.id = table.id;
      node.style.left = `${table.x}%`;
      node.style.top = `${table.y}%`;
      node.style.transform = "translate(-50%, -50%)";
      node.setAttribute("role", "button");
      node.setAttribute("tabindex", "0");
      node.setAttribute("aria-label", `${table.name}, ${table.shape === "rect" ? "rectangular" : table.shape}, ${table.chairs} ${table.chairs === 1 ? "chair" : "chairs"}. Select to edit or drag to move.`);
      const name = document.createElement("span");
      name.className = "table-name";
      name.textContent = table.name;
      const seats = document.createElement("span");
      seats.className = "seat-label";
      seats.textContent = `${table.chairs} ${table.chairs === 1 ? "seat" : "seats"}`;
      node.append(name, seats);
      addChairElements(node, table.chairs, table.shape);
      canvas.appendChild(node);
      node.addEventListener("pointerdown", beginDrag);
      node.addEventListener("click", (event) => {
        if (!node.dataset.dragged) selectTable(table.id, true);
        node.dataset.dragged = "";
        event.stopPropagation();
      });
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectTable(table.id, true);
        }
      });
    });

    tables.forEach((table) => {
      const row = document.createElement("div");
      row.className = `list-row${selectedId === table.id ? " active" : ""}`;
      const select = document.createElement("button");
      select.type = "button";
      select.className = "list-select";
      select.setAttribute("aria-label", `Edit ${table.name}`);
      const title = document.createElement("span");
      title.className = "list-name";
      title.textContent = table.name;
      const meta = document.createElement("span");
      meta.className = "list-meta";
      meta.textContent = `${shapeLabel(table.shape)} · ${table.chairs} ${table.chairs === 1 ? "chair" : "chairs"}`;
      select.append(title, meta);
      select.addEventListener("click", () => selectTable(table.id));
      const actions = document.createElement("span");
      actions.className = "list-actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.setAttribute("aria-label", `Edit ${table.name}`);
      edit.title = "Edit table";
      edit.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m10.7 2.3 3 3M2 14l3.2-.7 8-8a1.4 1.4 0 0 0-2-2l-8 8L2 14Z" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"/></svg>';
      edit.addEventListener("click", () => openDialog(table));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove";
      remove.setAttribute("aria-label", `Remove ${table.name}`);
      remove.title = "Remove table";
      remove.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 4.5h9m-7.8 0 .5 8h5.6l.5-8M6 4.5V3h4v1.5M6.5 7v3.5m3-3.5v3.5" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      remove.addEventListener("click", () => removeTable(table.id));
      actions.append(edit, remove);
      row.append(select, actions);
      tableList.appendChild(row);
    });
  }

  function shapeLabel(shape) {
    return shape === "rect" ? "Rectangle" : shape === "round" ? "Round" : "Square";
  }

  function selectTable(id, focusCanvas = false) {
    selectedId = id;
    render();
    if (focusCanvas) {
      const node = canvas.querySelector(`[data-id="${CSS.escape(id)}"]`);
      if (node) node.focus({ preventScroll: true });
    }
  }

  function beginDrag(event) {
    if (event.button !== undefined && event.button !== 0) return;
    const node = event.currentTarget;
    const table = tables.find((item) => item.id === node.dataset.id);
    if (!table) return;
    event.preventDefault();
    node.setPointerCapture(event.pointerId);
    node.classList.add("dragging");
    selectedId = table.id;
    const bounds = canvas.getBoundingClientRect();
    const offsetX = event.clientX - (bounds.left + bounds.width * table.x / 100);
    const offsetY = event.clientY - (bounds.top + bounds.height * table.y / 100);
    let moved = false;

    const move = (pointerEvent) => {
      const nextX = clamp(((pointerEvent.clientX - bounds.left - offsetX) / bounds.width) * 100, 7, 93);
      const nextY = clamp(((pointerEvent.clientY - bounds.top - offsetY) / bounds.height) * 100, 11, 89);
      if (Math.abs(nextX - table.x) > .1 || Math.abs(nextY - table.y) > .1) moved = true;
      table.x = nextX;
      table.y = nextY;
      node.style.left = `${nextX}%`;
      node.style.top = `${nextY}%`;
    };
    const finish = () => {
      node.classList.remove("dragging");
      node.dataset.dragged = moved ? "true" : "";
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerup", finish);
      node.removeEventListener("pointercancel", finish);
      if (moved) {
        scheduleSave("Table position saved");
        render();
      }
    };
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerup", finish, { once: true });
    node.addEventListener("pointercancel", finish, { once: true });
  }

  function openDialog(table = null) {
    editingId = table ? table.id : null;
    form.reset();
    formError.textContent = "";
    document.getElementById("dialogTitle").textContent = table ? "Edit table" : "Add a table";
    document.getElementById("dialogDescription").textContent = table ? "Update the table details for this floor." : "Give the floor team a clear table name.";
    document.getElementById("saveTable").textContent = table ? "Save changes" : "Add table";
    nameInput.value = table ? table.name : "";
    shapeInput.value = table ? table.shape : "round";
    chairInput.value = table ? String(table.chairs) : "4";
    dialog.hidden = false;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => nameInput.focus(), 0);
  }

  function closeDialog() {
    dialog.hidden = true;
    document.body.style.overflow = "";
    editingId = null;
    document.getElementById("addTable").focus();
  }

  function removeTable(id) {
    const index = tables.findIndex((table) => table.id === id);
    if (index < 0) return;
    const [removed] = tables.splice(index, 1);
    if (selectedId === id) selectedId = null;
    render();
    scheduleSave(`${removed.name} removed`);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const chairs = Number.parseInt(chairInput.value, 10);
    if (!name) {
      formError.textContent = "Enter a table name to continue.";
      nameInput.focus();
      return;
    }
    if (!Number.isInteger(chairs) || chairs < 1 || chairs > 12) {
      formError.textContent = "Choose between 1 and 12 chairs.";
      chairInput.focus();
      return;
    }
    formError.textContent = "";
    if (editingId) {
      const table = tables.find((item) => item.id === editingId);
      if (table) Object.assign(table, { name, shape: shapeInput.value, chairs });
      selectedId = editingId;
    } else {
      const step = tables.length % 6;
      const table = {
        id: randomId(),
        name,
        shape: shapeInput.value,
        chairs,
        x: clamp(30 + (step * 9), 10, 90),
        y: clamp(35 + (Math.floor(tables.length / 6) * 14), 14, 86)
      };
      tables.push(table);
      selectedId = table.id;
    }
    const message = editingId ? "Table details saved" : "Table added to the floor";
    closeDialog();
    render();
    scheduleSave(message);
  });

  document.getElementById("addTable").addEventListener("click", () => openDialog());
  document.getElementById("closeDialog").addEventListener("click", closeDialog);
  document.getElementById("cancelDialog").addEventListener("click", closeDialog);
  document.getElementById("seatDown").addEventListener("click", () => {
    chairInput.value = String(clamp((Number.parseInt(chairInput.value, 10) || 1) - 1, 1, 12));
  });
  document.getElementById("seatUp").addEventListener("click", () => {
    chairInput.value = String(clamp((Number.parseInt(chairInput.value, 10) || 1) + 1, 1, 12));
  });
  document.getElementById("resetLayout").addEventListener("click", () => {
    if (!tables.length) {
      showToast("There are no table positions to reset");
      return;
    }
    tables.forEach((table, index) => {
      const column = index % 5;
      const row = Math.floor(index / 5);
      table.x = 18 + column * 16;
      table.y = clamp(28 + row * 22, 16, 84);
    });
    render();
    scheduleSave("Table positions reset");
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dialog.hidden) closeDialog();
    if (event.key === "Tab" && !dialog.hidden) {
      const focusable = [...dialog.querySelectorAll("button, input, select")].filter((el) => !el.disabled);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  window.addEventListener("resize", () => {
    // Keep the room positions proportional when the floor canvas changes size.
    render();
  });

  loadLayout();
  render();
})();
