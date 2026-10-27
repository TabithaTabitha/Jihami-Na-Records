(() => {
  "use strict";

  const ACTIVE_STATUSES = new Set(["pending", "confirmed", "preparing", "ready"]);
  const IDLE_AFTER_MS = 5 * 1000;
  const app = document.getElementById("app");
  let waiterShell = null;
  let idleOverlay = null;
  let idleTimer = null;
  let clockTimer = null;
  let lastFocusedElement = null;
  let lastActivityAt = 0;
  const state = {
    tables: [],
    menu: [],
    selectedTableId: null,
    orders: [],
    orderId: null,
    carts: new Map(),
    orderIdsByTable: new Map(),
    loadingTables: false,
    loadingMenu: false,
    loadingOrders: false,
    sending: false,
    menuError: "",
    tablesError: "",
    ordersError: ""
  };

  const money = (amount) => new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2
  }).format(Number(amount) || 0);

  function envelopeData(response, expectedType) {
    if (!response || !response.ok) {
      const message = response?.data?.message || "The request could not be completed.";
      throw new Error(message);
    }
    const envelope = response.data;
    if (!envelope || envelope.success !== true || !Object.prototype.hasOwnProperty.call(envelope, "data")) {
      throw new Error(envelope?.message || "The server returned an unexpected response.");
    }
    if (expectedType === "array" && !Array.isArray(envelope.data)) {
      throw new Error("The server returned an unexpected list.");
    }
    return envelope.data;
  }

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function buildIdleOverlay() {
    const overlay = make("div", "idle-overlay");
    overlay.hidden = true;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "idleTitle");
    overlay.setAttribute("aria-describedby", "idleHint");

    const card = make("section", "idle-clock-card");
    const brand = make("div", "idle-brand-mark", "J");
    brand.setAttribute("aria-hidden", "true");
    card.append(brand, make("p", "idle-kicker", "Jihami Na Records · Waiter pad"));

    const title = make("h1", "", "Service is ready when you are");
    title.id = "idleTitle";
    card.append(title);

    const clock = document.createElement("time");
    clock.className = "idle-clock-time";
    clock.id = "idleClockTime";
    clock.setAttribute("role", "img");
    clock.setAttribute("aria-label", "Local wall clock");
    clock.dateTime = new Date().toISOString();

    const svgNamespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", "0 0 300 300");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.classList.add("wall-clock-svg");

    const addSvgShape = (tag, attributes, className) => {
      const shape = document.createElementNS(svgNamespace, tag);
      Object.entries(attributes).forEach(([key, value]) => shape.setAttribute(key, String(value)));
      if (className) shape.classList.add(...className.split(/\s+/).filter(Boolean));
      svg.append(shape);
      return shape;
    };

    addSvgShape("circle", { cx: 150, cy: 150, r: 146 }, "clock-case");
    addSvgShape("circle", { cx: 150, cy: 150, r: 135 }, "clock-dial");
    for (let tick = 0; tick < 60; tick += 1) {
      const hourMark = tick % 5 === 0;
      addSvgShape("line", {
        x1: 150,
        y1: 25,
        x2: 150,
        y2: hourMark ? 45 : 35,
        transform: `rotate(${tick * 6} 150 150)`
      }, hourMark ? "clock-hour-mark" : "clock-minute-mark");
    }
    for (let numeral = 1; numeral <= 12; numeral += 1) {
      const angle = (numeral * Math.PI) / 6;
      addSvgShape("text", {
        x: 150 + Math.sin(angle) * 96,
        y: 150 - Math.cos(angle) * 96,
        "text-anchor": "middle",
        "dominant-baseline": "central"
      }, "clock-numeral").textContent = String(numeral);
    }
    addSvgShape("line", { id: "idleHourHand", x1: 150, y1: 150, x2: 150, y2: 91 }, "clock-hand clock-hour-hand");
    addSvgShape("line", { id: "idleMinuteHand", x1: 150, y1: 150, x2: 150, y2: 57 }, "clock-hand clock-minute-hand");
    addSvgShape("line", { id: "idleSecondHand", x1: 150, y1: 166, x2: 150, y2: 43 }, "clock-hand clock-second-hand");
    addSvgShape("circle", { cx: 150, cy: 150, r: 9 }, "clock-center-pin");
    clock.append(svg);
    card.append(clock);

    const date = make("time", "idle-clock-date");
    date.id = "idleClockDate";
    card.append(date);

    const hint = make("p", "idle-hint", "The order pad is resting. Tap anywhere to continue.");
    hint.id = "idleHint";
    card.append(hint);

    const resume = make("button", "idle-resume", "Resume orders");
    resume.type = "button";
    resume.id = "idleResume";
    resume.addEventListener("click", wakeFromIdle);
    card.append(resume);

    overlay.append(card);
    overlay.addEventListener("pointerdown", wakeFromIdle);
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        wakeFromIdle();
      } else if (event.key === "Tab") {
        event.preventDefault();
        resume.focus();
      }
    });
    return overlay;
  }

  function updateIdleClock() {
    const clock = document.getElementById("idleClockTime");
    const date = document.getElementById("idleClockDate");
    if (!clock || !date) return;

    const now = new Date();
    clock.dateTime = now.toISOString();
    const formattedTime = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit"
    }).format(now);
    clock.setAttribute("aria-label", `Local wall clock showing ${formattedTime}`);
    const hourHand = document.getElementById("idleHourHand");
    const minuteHand = document.getElementById("idleMinuteHand");
    const secondHand = document.getElementById("idleSecondHand");
    const hours = now.getHours() % 12;
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    hourHand?.setAttribute("transform", `rotate(${(hours + minutes / 60) * 30} 150 150)`);
    minuteHand?.setAttribute("transform", `rotate(${(minutes + seconds / 60) * 6} 150 150)`);
    secondHand?.setAttribute("transform", `rotate(${seconds * 6} 150 150)`);
    date.dateTime = now.toISOString();
    date.textContent = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }).format(now);
  }

  function showIdleClock() {
    if (!idleOverlay || !waiterShell || !idleOverlay.hidden) return;
    window.clearTimeout(idleTimer);
    idleTimer = null;
    if (document.visibilityState === "hidden") return;
    lastFocusedElement = waiterShell.contains(document.activeElement) ? document.activeElement : null;
    updateIdleClock();
    idleOverlay.hidden = false;
    waiterShell.inert = true;
    window.clearInterval(clockTimer);
    clockTimer = window.setInterval(updateIdleClock, 1000);
    window.setTimeout(() => document.getElementById("idleResume")?.focus({ preventScroll: true }), 0);
  }

  function scheduleIdleClock(resetActivity = true) {
    if (resetActivity) lastActivityAt = Date.now();
    window.clearTimeout(idleTimer);
    const remaining = Math.max(0, IDLE_AFTER_MS - (Date.now() - lastActivityAt));
    idleTimer = window.setTimeout(showIdleClock, remaining);
  }

  function wakeFromIdle() {
    if (!idleOverlay || idleOverlay.hidden) return;
    idleOverlay.hidden = true;
    if (waiterShell) waiterShell.inert = false;
    window.clearInterval(clockTimer);
    clockTimer = null;
    lastFocusedElement?.focus?.({ preventScroll: true });
    lastFocusedElement = null;
    scheduleIdleClock();
  }

  function trackWaiterActivity(event) {
    if (event.defaultPrevented) return;
    if (idleOverlay && !idleOverlay.hidden) {
      if (event.type === "keydown" && event.key === "Tab") return;
      wakeFromIdle();
      return;
    }
    scheduleIdleClock();
  }

  function startIdleClock() {
    scheduleIdleClock();
    ["pointerdown", "keydown", "input", "change", "wheel", "scroll", "touchstart"].forEach((eventName) => {
      document.addEventListener(eventName, trackWaiterActivity, { passive: true });
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      const inactiveFor = Date.now() - lastActivityAt;
      if (idleOverlay && idleOverlay.hidden && inactiveFor >= IDLE_AFTER_MS) showIdleClock();
      else if (idleOverlay && !idleOverlay.hidden) updateIdleClock();
      else scheduleIdleClock(false);
    });
  }

  function showSignIn() {
    const section = make("section", "state-card");
    section.setAttribute("aria-live", "polite");
    section.append(make("div", "state-mark", "J"), make("h1", "", "Sign in to take orders"));
    section.append(make("p", "", "A valid Jihami service session is required to load tables and send orders."));
    const link = make("a", "state-link", "Go to sign in");
    link.href = "/login.html";
    section.append(link);
    app.replaceChildren(section);
  }

  function showFatal(message, retry) {
    const section = make("section", "state-card");
    section.setAttribute("role", "alert");
    section.append(make("div", "state-mark", "J"), make("h1", "", "Could not load the order pad"));
    section.append(make("p", "", message));
    const button = make("button", "retry-button", "Try again");
    button.type = "button";
    button.addEventListener("click", retry);
    section.append(button);
    app.replaceChildren(section);
  }

  function buildShell() {
    const shell = make("div", "waiter-shell");
    const header = make("header", "topbar");
    const brand = make("a", "brand-lockup");
    brand.href = "/resturant_management/";
    brand.setAttribute("aria-label", "Jihami Na Records floor layout");
    brand.append(make("span", "brand-mark", "J"), make("span", "brand-name", "Jihami Na Records"), make("span", "topbar-context", "Restaurant service"));
    header.append(brand, make("span", "service-tag", "Waiter order pad"));

    const main = make("main");
    const heading = make("section", "page-heading");
    const titleGroup = document.createElement("div");
    titleGroup.append(make("p", "eyebrow", "During service / order taking"), make("h1", "", "Take an order"));
    titleGroup.append(make("p", "", "Choose a table, build the order, then send it to the kitchen in one tap."));
    heading.append(titleGroup);

    const layout = make("div", "service-layout");
    const menuPanel = make("section", "panel");
    menuPanel.setAttribute("aria-labelledby", "menuTitle");
    const menuHeader = make("header", "panel-head");
    const menuTitleBlock = document.createElement("div");
    menuTitleBlock.append(make("h2", "", "Menu"), make("p", "", "Tap an item to add it to this order."));
    menuTitleBlock.firstChild.id = "menuTitle";
    menuHeader.append(menuTitleBlock, make("span", "section-kicker", "Available items"));
    const tablesStrip = make("div", "table-strip");
    tablesStrip.id = "tableStrip";
    tablesStrip.setAttribute("aria-label", "Choose a table");
    const menuContent = make("div", "panel-content");
    const tools = make("div", "menu-tools");
    const searchWrap = make("label", "search-wrap");
    const search = make("input", "search-input");
    search.id = "menuSearch";
    search.type = "search";
    search.placeholder = "Find a menu item";
    search.autocomplete = "off";
    search.setAttribute("aria-label", "Search menu items");
    searchWrap.append(search);
    tools.append(searchWrap);
    const count = make("span", "menu-count", "");
    count.id = "menuCount";
    tools.append(count);
    const menuGrid = make("div", "menu-grid");
    menuGrid.id = "menuGrid";
    menuGrid.setAttribute("aria-live", "polite");
    menuContent.append(tools, menuGrid);
    menuPanel.append(menuHeader, tablesStrip, menuContent);

    const orderPanel = make("section", "panel order-panel");
    orderPanel.setAttribute("aria-labelledby", "orderTitle");
    const orderHead = make("header", "panel-head order-header");
    const orderTitleBlock = document.createElement("div");
    const orderTitle = make("h2", "", "Current order");
    orderTitle.id = "orderTitle";
    orderTitleBlock.append(orderTitle, make("p", "", "Review quantities before sending."));
    const tableLabel = make("span", "selected-table-label", "Choose a table");
    tableLabel.id = "selectedTableLabel";
    orderHead.append(orderTitleBlock, tableLabel);
    const orderContent = make("div", "order-content");
    const orderStatus = make("p", "order-status", "Select a table to begin.");
    orderStatus.id = "orderStatus";
    orderStatus.setAttribute("role", "status");
    orderStatus.setAttribute("aria-live", "polite");
    const lines = make("div", "order-lines");
    lines.id = "orderLines";
    const totalRow = make("div", "order-total-row");
    totalRow.append(make("span", "", "New items total"), make("strong", "", money(0)));
    totalRow.lastChild.id = "orderTotal";
    const send = make("button", "send-button", "");
    send.id = "sendOrder";
    send.type = "button";
    send.disabled = true;
    const sendIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    sendIcon.setAttribute("viewBox", "0 0 24 24");
    sendIcon.setAttribute("fill", "none");
    sendIcon.setAttribute("aria-hidden", "true");
    sendIcon.classList.add("send-icon");
    const sendPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    sendPath.setAttribute("d", "M4 12h15m-6-6 6 6-6 6");
    sendPath.setAttribute("stroke", "currentColor");
    sendPath.setAttribute("stroke-width", "1.8");
    sendPath.setAttribute("stroke-linecap", "round");
    sendPath.setAttribute("stroke-linejoin", "round");
    sendIcon.append(sendPath);
    send.append(make("span", "", "Send order"), sendIcon);
    const notice = make("p", "notice", "");
    notice.id = "notice";
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    orderContent.append(orderStatus, lines, totalRow, send, notice);
    orderPanel.append(orderHead, orderContent);
    layout.append(menuPanel, orderPanel);
    main.append(heading, layout);
    shell.append(header, main);
    app.replaceChildren(shell);
    waiterShell = shell;
    idleOverlay = buildIdleOverlay();
    app.append(idleOverlay);

    search.addEventListener("input", renderMenu);
    send.addEventListener("click", sendOrder);
    render();
  }

  function currentCart() {
    if (state.selectedTableId === null) return new Map();
    if (!state.carts.has(String(state.selectedTableId))) state.carts.set(String(state.selectedTableId), new Map());
    return state.carts.get(String(state.selectedTableId));
  }

  function tableLabel(table) {
    return table?.table_number !== undefined && table?.table_number !== null ? `Table ${table.table_number}` : "Table";
  }

  function renderTables() {
    const strip = document.getElementById("tableStrip");
    strip.replaceChildren();
    if (state.loadingTables) {
      const loading = make("div", "loading-block");
      loading.append(make("div", "loading-skeleton"), make("div", "loading-skeleton"));
      loading.style.minWidth = "100%";
      strip.append(loading);
      return;
    }
    if (state.tablesError) {
      const error = make("div", "order-empty");
      error.append(make("strong", "", "Tables are unavailable"), make("span", "", state.tablesError));
      const retry = make("button", "retry-button", "Retry");
      retry.type = "button";
      retry.addEventListener("click", async () => {
        state.loadingTables = true;
        state.tablesError = "";
        renderTables();
        try { await refreshTables(); }
        catch (failure) { state.tablesError = failure.message || "Could not load tables."; }
        finally { state.loadingTables = false; render(); }
      });
      error.append(retry);
      strip.append(error);
      return;
    }
    if (!state.tables.length) {
      const empty = make("div", "order-empty");
      empty.append(make("strong", "", "No tables found"), make("span", "", "Tables will appear here when they are available for service."));
      strip.append(empty);
      return;
    }
    state.tables.forEach((table) => {
      const button = make("button", "table-choice");
      button.type = "button";
      button.setAttribute("aria-pressed", String(String(table.id) === String(state.selectedTableId)));
      button.setAttribute("aria-label", `${tableLabel(table)}, ${Number(table.order_count) || 0} open orders`);
      const name = make("span", "table-choice-name", tableLabel(table));
      const orders = Number(table.order_count) || 0;
      const meta = make("span", "table-choice-meta", `${orders} ${orders === 1 ? "open order" : "open orders"}`);
      button.append(name, meta);
      button.addEventListener("click", () => selectTable(table.id));
      strip.append(button);
    });
  }

  function renderMenu() {
    const grid = document.getElementById("menuGrid");
    const count = document.getElementById("menuCount");
    if (!grid || !count) return;
    grid.replaceChildren();
    if (state.loadingMenu) {
      const loading = make("div", "loading-block");
      loading.style.gridColumn = "1 / -1";
      for (let i = 0; i < 4; i += 1) loading.append(make("div", "loading-skeleton"));
      grid.append(loading);
      count.textContent = "Loading";
      return;
    }
    if (state.menuError) {
      const error = make("div", "order-empty");
      error.style.gridColumn = "1 / -1";
      error.append(make("strong", "", "Menu unavailable"), make("span", "", state.menuError));
      const retry = make("button", "retry-button", "Retry menu");
      retry.type = "button";
      retry.addEventListener("click", () => loadMenu().catch(() => {}));
      error.append(retry);
      grid.append(error);
      count.textContent = "";
      return;
    }
    const term = (document.getElementById("menuSearch").value || "").trim().toLocaleLowerCase();
    const filtered = state.menu.filter((item) => {
      const name = String(item.name || "").toLocaleLowerCase();
      const description = String(item.description || "").toLocaleLowerCase();
      return !term || name.includes(term) || description.includes(term);
    });
    count.textContent = `${filtered.length} ${filtered.length === 1 ? "item" : "items"}`;
    if (!filtered.length) {
      const empty = make("div", "order-empty");
      empty.style.gridColumn = "1 / -1";
      empty.append(make("strong", "", state.menu.length ? "No matches" : "No menu items"), make("span", "", state.menu.length ? "Try another search." : "Menu items will appear here when available."));
      grid.append(empty);
      return;
    }
    filtered.forEach((item) => {
      const button = make("button", "menu-item");
      button.type = "button";
      const unitPrice = Number(item.unit_price);
      const canOrder = Number.isFinite(unitPrice) && unitPrice > 0;
      button.disabled = state.selectedTableId === null || state.sending || !canOrder;
      button.setAttribute("aria-label", `Add ${item.name || "item"}, ${money(item.unit_price)}`);
      const name = make("span", "menu-item-name", item.name || "Unnamed item");
      button.append(name);
      if (item.description) button.append(make("span", "menu-item-description", item.description));
      const bottom = make("span", "menu-item-bottom");
      bottom.append(make("span", "menu-price", canOrder ? money(unitPrice) : "Price unavailable"));
      bottom.append(make("span", "add-label", canOrder ? "+" : "—"));
      button.append(bottom);
      button.addEventListener("click", () => addItem(item));
      grid.append(button);
    });
  }

  function renderCart() {
    const lines = document.getElementById("orderLines");
    if (!lines) return;
    lines.replaceChildren();
    const cart = currentCart();
    let total = 0;
    if (!state.selectedTableId) {
      const empty = make("div", "order-empty");
      empty.append(make("strong", "", "Choose a table"), make("span", "", "Select the table you are serving to start an order."));
      lines.append(empty);
    } else {
      const openOrder = state.orders.find((order) => String(order.id) === String(state.orderId));
      if (Array.isArray(openOrder?.items) && openOrder.items.length) {
        const sent = make("section", "sent-order-summary");
        const sentHead = make("div", "sent-order-heading");
        sentHead.append(
          make("strong", "", `Already sent · #${openOrder.order_id || openOrder.id}`),
          make("span", "", money(openOrder.total_amount))
        );
        sent.append(sentHead);
        openOrder.items.forEach((item) => {
          const row = make("div", "sent-order-item");
          row.append(
            make("span", "", `${item.quantity} × ${item.item_name || "Menu item"}`),
            make("strong", "", money(item.amount ?? (Number(item.quantity) * Number(item.unit_price))))
          );
          sent.append(row);
        });
        lines.append(sent);
      }
      lines.append(make("p", "cart-section-title", "New items to send"));
      if (!cart.size) {
        const empty = make("div", "order-empty");
        empty.append(make("strong", "", "Nothing added yet"), make("span", "", "Tap a menu item to add it to this table's order."));
        lines.append(empty);
      } else {
        cart.forEach((entry, itemId) => {
          const amount = entry.quantity * entry.unitPrice;
          total += amount;
          const row = make("div", "order-line");
          const detail = document.createElement("div");
          detail.append(make("span", "line-name", entry.name), make("span", "line-price", `${money(entry.unitPrice)} each`));
          const controls = make("div", "line-controls");
          const decrement = make("button", "qty-button", "−");
          decrement.type = "button";
          decrement.disabled = state.sending;
          decrement.setAttribute("aria-label", `Remove one ${entry.name}`);
          decrement.addEventListener("click", () => changeQuantity(itemId, -1));
          const quantity = make("span", "qty-value", entry.quantity);
          quantity.setAttribute("aria-label", `Quantity ${entry.quantity}`);
          const increment = make("button", "qty-button", "+");
          increment.type = "button";
          increment.disabled = state.sending;
          increment.setAttribute("aria-label", `Add one ${entry.name}`);
          increment.addEventListener("click", () => changeQuantity(itemId, 1));
          controls.append(decrement, quantity, increment);
          row.append(detail, controls, make("span", "line-total", money(amount)));
          lines.append(row);
        });
      }
    }
    document.getElementById("orderTotal").textContent = money(total);
    const label = document.getElementById("selectedTableLabel");
    const selected = state.tables.find((table) => String(table.id) === String(state.selectedTableId));
    label.textContent = selected ? tableLabel(selected) : "Choose a table";
    const send = document.getElementById("sendOrder");
    send.disabled = state.selectedTableId === null || cart.size === 0 || state.sending ||
      state.loadingOrders || Boolean(state.ordersError && !state.orderId);
    const status = document.getElementById("orderStatus");
    status.replaceChildren();
    if (state.loadingOrders) status.textContent = "Loading this table's open orders…";
    else if (state.ordersError) {
      status.textContent = state.ordersError + " ";
      const retry = make("button", "inline-retry", "Retry");
      retry.type = "button";
      retry.addEventListener("click", () => loadOrders(state.selectedTableId));
      status.append(retry);
    }
    else if (!state.selectedTableId) status.textContent = "Select a table to begin.";
    else if (state.orderId) status.textContent = `Adding to open order #${state.orderId}`;
    else status.textContent = "New order will be created when you send.";
  }

  function render() {
    renderTables();
    renderMenu();
    renderCart();
  }

  function addItem(item) {
    if (!state.selectedTableId) return;
    const unitPrice = Number(item.unit_price);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      setNotice("This item has no valid price and cannot be ordered.", "error");
      return;
    }
    const cart = currentCart();
    const key = String(item.id);
    const existing = cart.get(key);
    if (existing) existing.quantity += 1;
    else cart.set(key, {
      itemId: item.id,
      name: String(item.name || "Unnamed item"),
      unitPrice,
      quantity: 1
    });
    setNotice(`${item.name || "Item"} added`, "success");
    renderCart();
  }

  function changeQuantity(itemId, delta) {
    const cart = currentCart();
    const entry = cart.get(String(itemId));
    if (!entry) return;
    entry.quantity += delta;
    if (entry.quantity <= 0) cart.delete(String(itemId));
    renderCart();
  }

  function setNotice(message, kind = "") {
    const notice = document.getElementById("notice");
    if (!notice) return;
    notice.textContent = message;
    notice.dataset.kind = kind;
  }

  function latestActiveOrder(orders) {
    return orders
      .filter((order) => ACTIVE_STATUSES.has(String(order.status || "").toLowerCase()))
      .sort((a, b) => Number(b.id) - Number(a.id))[0] || null;
  }

  async function loadOrders(tableId) {
    const tableKey = String(tableId);
    state.loadingOrders = true;
    state.ordersError = "";
    renderCart();
    try {
      const response = await HttpService.get(API.hotel.tables.orders(tableId));
      const orders = envelopeData(response, "array");
      if (String(state.selectedTableId) !== tableKey) return;
      state.orders = orders;
      const active = latestActiveOrder(orders);
      state.orderId = active?.id || null;
      if (active) state.orderIdsByTable.set(tableKey, active.id);
      else state.orderIdsByTable.delete(tableKey);
    } catch (error) {
      if (String(state.selectedTableId) !== tableKey) return;
      state.orders = [];
      state.ordersError = error.message || "Could not load this table's open orders.";
      state.orderId = state.orderIdsByTable.get(tableKey) || null;
    } finally {
      if (String(state.selectedTableId) === tableKey) {
        state.loadingOrders = false;
        renderCart();
      }
    }
  }

  async function selectTable(tableId) {
    if (state.sending) return;
    if (state.selectedTableId !== null && String(state.selectedTableId) === String(tableId)) return;
    state.selectedTableId = tableId;
    state.orderId = state.orderIdsByTable.get(String(tableId)) || null;
    setNotice("", "");
    render();
    await loadOrders(tableId);
  }

  async function refreshTables() {
    const response = await HttpService.get(API.hotel.tables.list);
    state.tables = envelopeData(response, "array");
    state.tablesError = "";
  }

  async function refreshSelectedData() {
    const selectedId = state.selectedTableId;
    const results = await Promise.allSettled([refreshTables(), loadMenu()]);
    if (selectedId !== null && String(selectedId) === String(state.selectedTableId)) {
      await loadOrders(selectedId);
    }
    render();
    return results;
  }

  async function loadMenu() {
    state.loadingMenu = true;
    state.menuError = "";
    renderMenu();
    try {
      const response = await HttpService.get(API.hotel.items.list);
      state.menu = envelopeData(response, "array");
    } catch (error) {
      state.menuError = error.message || "Could not load menu items.";
      throw error;
    } finally {
      state.loadingMenu = false;
      renderMenu();
    }
  }

  async function sendOrder() {
    const cart = currentCart();
    if (!state.selectedTableId || !cart.size || state.sending) return;
    const tableId = state.selectedTableId;
    state.sending = true;
    setNotice("Sending order…");
    const button = document.getElementById("sendOrder");
    button.classList.add("is-loading");
    button.firstChild.textContent = "Sending order…";
    renderMenu();
    renderCart();
    try {
      let orderId = state.orderId || state.orderIdsByTable.get(String(tableId));
      if (!orderId) {
        const created = envelopeData(
          await HttpService.post(API.hotel.orders.create, { table_id: tableId }),
          "object"
        );
        if (!created || created.id === undefined || created.id === null) throw new Error("Order was created but its ID was not returned. Your cart is still here.");
        orderId = created.id;
        state.orderId = orderId;
        state.orderIdsByTable.set(String(tableId), orderId);
        renderCart();
      }

      const items = Array.from(cart.values()).map((entry) => ({
        item_id: entry.itemId,
        quantity: entry.quantity,
        unit_price: entry.unitPrice
      }));
      envelopeData(
        await HttpService.post(API.hotel.orders.lineItems(orderId), { items }),
        "object"
      );
      cart.clear();
      setNotice("Order saved successfully.", "success");
      if (String(tableId) === String(state.selectedTableId)) {
        await Promise.allSettled([refreshTables(), loadOrders(tableId)]);
      } else {
        await refreshTables().catch(() => {});
      }
    } catch (error) {
      setNotice(error.message || "Order not sent. Your cart is saved; try again.", "error");
    } finally {
      state.sending = false;
      button.classList.remove("is-loading");
      button.firstChild.textContent = "Send order";
      render();
    }
  }

  async function start() {
    if (typeof API === "undefined" || typeof HttpService === "undefined" ||
        typeof TokenManager === "undefined" || !TokenManager.isTokenValid()) {
      showSignIn();
      return;
    }
    buildShell();
    state.loadingTables = true;
    state.loadingMenu = true;
    render();
    const [tablesResult, menuResult] = await Promise.allSettled([
      refreshTables(),
      loadMenu()
    ]);
    state.loadingTables = false;
    if (tablesResult.status === "rejected") state.tablesError = tablesResult.reason?.message || "Could not load tables.";
    if (menuResult.status === "rejected") state.menuError = menuResult.reason?.message || "Could not load menu items.";
    render();
    startIdleClock();
  }

  start().catch((error) => {
    if (error?.message === "Authentication required" ||
        (typeof TokenManager !== "undefined" && !TokenManager.isTokenValid())) showSignIn();
    else showFatal(error?.message || "The order pad could not be started.", start);
  });
})();
