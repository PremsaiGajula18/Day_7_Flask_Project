/**
 * Tea Shop Order Simulator - Client-Side Controller
 * Demonstrates:
 * 1. Broken return vs Callbacks vs Promises vs async/await
 * 2. Non-blocking asynchronous timers (2s order completes before 6s order)
 * 3. REST API integration with Flask backend (GET, POST, PATCH)
 * 4. Recovery and persistence across browser refreshes
 */

// DOM Elements
const orderForm = document.getElementById('order-form');
const customerNameInput = document.getElementById('customer_name');
const teaTypeSelect = document.getElementById('tea_type');
const prepTimeSelect = document.getElementById('prep_time');
const simulateFailureCheck = document.getElementById('simulate_failure');
const formError = document.getElementById('form-error');

const activityLog = document.getElementById('activity-log');
const clearLogBtn = document.getElementById('clear-log-btn');

const preparingList = document.getElementById('preparing-list');
const readyList = document.getElementById('ready-list');
const failedList = document.getElementById('failed-list');

const preparingCount = document.getElementById('preparing-count');
const readyCount = document.getElementById('ready-count');
const failedCount = document.getElementById('failed-count');

// Teaching Demo Buttons
const btnBrokenReturn = document.getElementById('btn-broken-return');
const btnCallback = document.getElementById('btn-callback');
const btnPromise = document.getElementById('btn-promise');

// In-memory state tracking active client timers
const activeTimers = new Set();


/**
 * Helper: Append timestamped messages to the Activity Log
 */
function logActivity(message, kind = 'info') {
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS

  const entry = document.createElement('div');
  entry.className = `log-entry ${kind}`;
  entry.innerHTML = `<span class="log-time">[${timeStr}]</span> ${message}`;

  activityLog.prepend(entry);
}


/**
 * Helper: Format time duration
 */
function formatDuration(seconds) {
  return `${seconds} second${seconds === 1 ? '' : 's'}`;
}


/**
 * Render order card element
 */
function createOrderCard(order) {
  const card = document.createElement('div');
  card.className = 'order-card';
  card.id = `order-card-${order.id}`;

  const title = document.createElement('h5');
  title.className = 'order-title';
  title.textContent = `#${order.id} · ${order.customer_name}`;

  const subtitle = document.createElement('p');
  subtitle.className = 'order-subtitle';
  subtitle.textContent = `${order.tea_type} · ${formatDuration(order.prep_time)}`;

  card.appendChild(title);
  card.appendChild(subtitle);
  return card;
}


/**
 * Fetch and render all orders from the Flask API
 */
async function loadOrders() {
  try {
    const response = await fetch('/api/orders');
    if (!response.ok) {
      throw new Error(`Failed to load orders: ${response.statusText}`);
    }

    const orders = await response.json();
    renderOrders(orders);

    // Resume tracking for any order still Preparing
    const now = new Date().getTime();
    for (const order of orders) {
      if (order.status === 'Preparing' && !activeTimers.has(order.id)) {
        activeTimers.add(order.id);
        const createdAt = new Date(order.created_at).getTime();
        const elapsedSec = Math.max(0, (now - createdAt) / 1000);
        const remainingSec = Math.max(0.1, order.prep_time - elapsedSec);

        // Resume async workflow for remaining time
        processOrderPreparation(order, remainingSec);
      }
    }
  } catch (err) {
    logActivity(`Error loading orders: ${err.message}`, 'error');
  }
}


/**
 * Distribute orders into Preparing, Ready, and Failed columns
 */
function renderOrders(orders) {
  preparingList.replaceChildren();
  readyList.replaceChildren();
  failedList.replaceChildren();

  let prepTotal = 0;
  let readyTotal = 0;
  let failedTotal = 0;

  for (const order of orders) {
    const card = createOrderCard(order);

    if (order.status === 'Preparing') {
      preparingList.appendChild(card);
      prepTotal++;
    } else if (order.status === 'Ready') {
      readyList.appendChild(card);
      readyTotal++;
    } else if (order.status === 'Failed') {
      failedList.appendChild(card);
      failedTotal++;
    }
  }

  // Update counts
  preparingCount.textContent = prepTotal;
  readyCount.textContent = readyTotal;
  failedCount.textContent = failedTotal;

  // Render empty state notices if counts are zero
  if (prepTotal === 0) preparingList.innerHTML = '<p class="empty-state">No orders</p>';
  if (readyTotal === 0) readyList.innerHTML = '<p class="empty-state">No orders</p>';
  if (failedTotal === 0) failedList.innerHTML = '<p class="empty-state">No orders</p>';
}


/**
 * Promise-based tea preparation timer
 * Returns a Promise that resolves or rejects after the duration
 */
function prepareTea(order, durationSec) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (order.simulate_failure) {
        reject(new Error('Ingredients unavailable.'));
      } else {
        resolve(`${order.tea_type} is hot and ready.`);
      }
    }, durationSec * 1000);
  });
}


/**
 * Asynchronous Order Workflow using async/await and try/catch
 */
async function processOrderPreparation(order, customDuration = null) {
  const duration = customDuration !== null ? customDuration : order.prep_time;

  try {
    // await pauses only this specific order execution!
    // The browser event loop remains free to take more orders.
    const message = await prepareTea(order, duration);

    // Notify backend of Ready status
    const updateRes = await fetch(`/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Ready' }),
    });

    if (!updateRes.ok) throw new Error('Failed to update order status on server');

    logActivity(`✅ #${order.id} · ${order.customer_name} ready! (${message})`, 'success');
  } catch (error) {
    // Settle failure on backend
    await fetch(`/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'Failed',
        failure_reason: error.message,
      }),
    });

    logActivity(`⚠️ #${order.id} · ${order.customer_name} failed: ${error.message}`, 'error');
  } finally {
    activeTimers.delete(order.id);
    await loadOrders(); // Refresh order columns and badge counts
  }
}


/**
 * Form Submit: Add new order via POST /api/orders
 */
orderForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.classList.add('d-none');
  formError.textContent = '';

  const customerName = customerNameInput.value.trim();
  const teaType = teaTypeSelect.value;
  const prepTime = parseInt(prepTimeSelect.value, 10);
  const simulateFailure = simulateFailureCheck.checked;

  // Frontend client validation
  if (customerName.length < 2 || customerName.length > 50) {
    formError.textContent = 'Customer name must be between 2 and 50 characters.';
    formError.classList.remove('d-none');
    return;
  }

  const payload = {
    customer_name: customerName,
    tea_type: teaType,
    prep_time: prepTime,
    simulate_failure: simulateFailure,
  };

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMsg = (result.errors || [result.error]).join(' ');
      formError.textContent = errorMsg;
      formError.classList.remove('d-none');
      return;
    }

    const createdOrder = result;
    logActivity(
      `📥 #${createdOrder.id} · ${createdOrder.customer_name} ordered ${createdOrder.tea_type} (${formatDuration(createdOrder.prep_time)})`,
      'info'
    );

    // Reset form for next customer immediately (cashier is never blocked)
    customerNameInput.value = '';
    simulateFailureCheck.checked = false;
    customerNameInput.focus();

    // Refresh UI to display new Preparing card
    await loadOrders();

    // Start background asynchronous cooking
    activeTimers.add(createdOrder.id);
    processOrderPreparation(createdOrder);

  } catch (networkError) {
    formError.textContent = `Network error: ${networkError.message}`;
    formError.classList.remove('d-none');
  }
});


/**
 * Clear log button
 */
clearLogBtn.addEventListener('click', () => {
  activityLog.replaceChildren();
});


/**
 * -------------------------------------------------------------
 * Teaching Demonstrations:
 * 1. Broken Return
 * 2. Callback
 * 3. Promise .then()
 * -------------------------------------------------------------
 */

// 1. Broken Return: Demonstrates returning inside setTimeout returns undefined immediately
btnBrokenReturn.addEventListener('click', () => {
  function makeTeaSync() {
    setTimeout(() => {
      return "Green tea"; // Returned to setTimeout internals, NOT makeTeaSync!
    }, 2000);
  }

  const result = makeTeaSync();
  logActivity(`[Demo 1: Broken return] makeTeaSync() returned: <strong>${result}</strong> (undefined!)`, 'error');
  console.log('[Demo 1 Broken Return] Result:', result); // prints undefined
});


// 2. Callback: Demonstrates passing a function called later
btnCallback.addEventListener('click', () => {
  logActivity(`[Demo 2: Callback] Started timer for 2 seconds...`, 'info');

  function makeTeaCallback(done) {
    setTimeout(() => {
      done("Ginger tea");
    }, 2000);
  }

  makeTeaCallback((tea) => {
    logActivity(`[Demo 2: Callback] Callback fired: ${tea} is ready!`, 'success');
  });

  logActivity(`[Demo 2: Callback] Cashier continues serving next customer immediately.`, 'info');
});


// 3. Promise with .then()
btnPromise.addEventListener('click', () => {
  logActivity(`[Demo 3: Promise] prepareTeaPromise() called. Immediate return is a Promise object.`, 'info');

  function prepareTeaPromise() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("Regular tea");
      }, 2000);
    });
  }

  const promiseObj = prepareTeaPromise();
  console.log('[Demo 3 Promise] Immediately returned:', promiseObj);

  promiseObj.then((tea) => {
    logActivity(`[Demo 3: Promise] .then() resolved: ${tea} is ready!`, 'success');
  });
});


// Initial page load
loadOrders();
