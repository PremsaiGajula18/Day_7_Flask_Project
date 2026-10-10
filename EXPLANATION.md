# Student Assignment Explanation & Predictions

## 1. Conceptual Explanation

1. **Why does returning inside `setTimeout` not return tea from the outer function?**
   The outer function finishes execution synchronously on the call stack and returns before the browser timer callback is ever queued or called; the inner `return` value is received only by the timer caller inside Web APIs, not the outer function (demonstrated in `app.js` at `btnBrokenReturn`).

2. **What does a Promise return immediately?**
   A Promise returns an instance of the `Promise` object in the `pending` state immediately, which acts as a placeholder for a future value that will later settle as fulfilled or rejected (demonstrated in `app.js` in `btnPromise` and `prepareTea()`).

3. **What exactly pauses at `await`?**
   `await` pauses only the execution of that specific asynchronous function scope until the awaited Promise settles, allowing the JavaScript engine to keep running other functions, event listeners, and user clicks (demonstrated in `app.js` inside `processOrderPreparation()`).

4. **Why can a later order finish first?**
   Each order's timer operates independently in the browser's Web APIs background environment; a 2-second timer will fire its callback and resolve its promise earlier than an earlier order with a 6-second timer (demonstrated in `app.js` in `processOrderPreparation()`).

5. **How do you distinguish an HTTP error from a rejected Promise?**
   An HTTP error (such as a 400 Bad Request or 404 Not Found) still produces a resolved Promise from `fetch()` with `response.ok === false` and a numeric `response.status`; a rejected Promise from `fetch()` only occurs on network disconnects or invalid URLs where no HTTP response could be obtained (demonstrated in `app.js` during order submission).

---

## 2. Checkpoint 1: Predictions Before Coding

### Snippet A: Immediate Result
```javascript
function tea() { setTimeout(() => { return "Ready"; }, 2000); }
console.log(tea());
console.log("Next customer");
```
- **Predicted Output:**
  ```text
  undefined
  Next customer
  ```
- **Reason:** `tea()` has no return statement on its main body, so it returns `undefined` immediately. The inner callback runs 2 seconds later, returning `"Ready"` to nowhere.

---

### Snippet B: Callback
```javascript
function tea(done) { setTimeout(() => done("Ready"), 2000); }
tea(value => console.log(value));
console.log("Next customer");
```
- **Predicted Output:**
  ```text
  Next customer
  Ready
  ```
- **Reason:** The callback is registered for deferred execution after 2000ms. The synchronous line `console.log("Next customer")` executes immediately without waiting.

---

### Snippet C: Promise and Timer (Event Loop Priority)
```javascript
console.log("A");
setTimeout(() => console.log("Timer"), 0);
Promise.resolve().then(() => console.log("Promise"));
console.log("B");
```
- **Predicted Output:**
  ```text
  A
  B
  Promise
  Timer
  ```
- **Reason:** 
  1. Synchronous statements `console.log("A")` and `console.log("B")` execute immediately on the call stack.
  2. `Promise.resolve().then(...)` schedules its callback in the **Microtask Queue**.
  3. `setTimeout(..., 0)` schedules its callback in the **Macrotask (Task) Queue**.
  4. The Event Loop prioritizes and exhausts all Microtasks before taking tasks from the Macrotask queue, so `"Promise"` prints before `"Timer"`.
