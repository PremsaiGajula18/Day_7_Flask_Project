# Teaching Guide: Asynchronous JavaScript + Flask REST API

## Lesson Goals
1. Understand the difference between **synchronous (blocking)** and **asynchronous (non-blocking)** programming.
2. Trace the JavaScript Event Loop, Web APIs (`setTimeout`), the Microtask Queue (Promises), and the Task Queue.
3. Understand why `return` inside an async timer cannot return values from the enclosing function.
4. Bridge front-end async code with a **Flask REST API** handling JSON and MySQL persistence.

---

## 1. The Core Metaphor: The Busy Tea Shop

In a synchronous kitchen:
- The cashier takes an order for a 6-minute chai.
- The cashier **freezes** in place, stares at the kettle for 6 minutes, and refuses to talk to anyone else in line.
- Nobody else can place an order until that single chai is poured.

In an asynchronous kitchen:
- The cashier writes the order slip, passes it to the kitchen counter, and immediately welcomes the next customer.
- If Customer #2 orders a cold brew taking 30 seconds, Customer #2 receives their drink **before** Customer #1.
- JavaScript works exactly like the asynchronous cashier: single-threaded execution, but non-blocking tasks delegated to timer APIs and network fetches.

---

## 2. Comparing Async Patterns in JavaScript

### A. The Broken Return
```javascript
function tea() {
  setTimeout(() => {
    return "Ready"; // Returning here returns into the timer callback, NOT tea()
  }, 2000);
}
console.log(tea()); // Prints: undefined
```
- **Why it breaks:** `tea()` executes top-to-bottom and exits immediately without an explicit return statement. By the time 2000ms elapses, `tea()` has already finished and returned `undefined`.

### B. Callbacks
```javascript
function tea(done) {
  setTimeout(() => done("Ready"), 2000);
}
tea((value) => console.log(value)); // Fired 2 seconds later
console.log("Next customer");      // Prints immediately!
```
- **Why it works:** You hand a function to be called in the future.
- **Drawback:** Nested callbacks quickly lead to "Callback Hell" and difficult error handling.

### C. Promises
```javascript
function tea() {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve("Ready"), 2000);
  });
}
tea()
  .then((val) => console.log(val))
  .catch((err) => console.error(err));
```
- **Why it works:** The function immediately returns a **Promise** object representing a future value in either a *pending*, *fulfilled*, or *rejected* state.

### D. Modern Async / Await
```javascript
async function serveCustomer(order) {
  try {
    const tea = await prepareTea(order); // Pauses ONLY serveCustomer execution
    console.log(tea);
  } catch (err) {
    console.error(err);
  }
}
```
- **Why it is preferred:** Reads like clean, synchronous code while preserving all non-blocking asynchronous benefits.

---

## 3. Client vs Server Responsibilities

| Responsibility | Client (Browser / `app.js`) | Server (Flask / `app.py`) |
| :--- | :--- | :--- |
| **Input Entry** | Form inputs with instant feedback | Strict JSON validation (length, values, types) |
| **Concurrency** | Handles multiple ongoing timers | Stores timestamped orders safely in MySQL |
| **State Display** | Moves cards dynamically in the DOM | Issues authoritative order statuses |
| **Recovery** | Queries `GET /api/orders` on page reload | Calculates elapsed time and reconciles states |
