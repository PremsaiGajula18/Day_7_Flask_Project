# Day 7: Tea Shop Order Simulator (Flask REST API + Asynchronous JavaScript)

A classroom-ready Single Page Application (SPA) demonstrating asynchronous JavaScript (`fetch`, `async/await`, Promises, and non-blocking Event Loop) connected to a Python Flask REST API backed by MySQL.

---

## Architecture Overview

```
C:\Flask\Day-7_project\
├── with_js/
│   ├── app.py              # Flask JSON REST API (Port 5001)
│   ├── templates/
│   │   └── index.html      # Single Page HTML Shell
│   └── static/
│       ├── app.js          # Vanilla JS (fetch, async/await, DOM updates)
│       └── style.css       # Custom styling matching design specifications
├── mysql_schema.sql        # Database table schema (`tea_shop_db`)
├── requirements.txt        # Python dependencies
├── README.md               # Setup and project documentation
├── CLASS_CONTENT.md        # Teaching curriculum guide & concepts
└── EXPLANATION.md          # Checkpoint questions & async answers
```

---

## Windows & PowerShell Setup

### 1. Database Setup
Make sure MySQL Server is running locally. Run `mysql_schema.sql` via MySQL Workbench or PowerShell:

```powershell
mysql -u root -p < mysql_schema.sql
```
*(Enter your MySQL password when prompted. This creates `tea_shop_db` and the `orders` table.)*

### 2. Python Virtual Environment
Open PowerShell inside `C:\Flask\Day-7_project`:

```powershell
python -m venv venv
venv\Scripts\activate
python -m pip install -r requirements.txt
```

### 3. Environment Variables
Set your local MySQL credentials in PowerShell:

```powershell
$env:MYSQL_HOST = '127.0.0.1'
$env:MYSQL_PORT = '3306'
$env:MYSQL_USER = 'root'
$env:MYSQL_PASSWORD = 'your_mysql_password'
$env:MYSQL_DB_NAME = 'tea_shop_db'
```

### 4. Run the Application
Start the Flask API server:

```powershell
cd with_js
python app.py
```

Open your browser and navigate to:
**`http://127.0.0.1:5001/`**

---

## REST API Endpoints

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Serves the SPA HTML shell | `200` |
| `GET` | `/api/orders` | Retrieves all orders (with automatic refresh recovery) | `200` |
| `GET` | `/api/orders/<id>` | Retrieves a single order by ID | `200` / `404` |
| `POST` | `/api/orders` | Creates a new order (validates JSON payload) | `201 Created` / `400` / `415` |
| `PATCH` | `/api/orders/<id>` | Updates order status to `Ready` or `Failed` | `200` / `400` / `404` |
| `DELETE` | `/api/orders/clear` | Resets demonstration orders | `200` |

---

## Live Demonstration Guide

1. **Non-blocking Cashier / Out-of-order Completion:**
   - Enter Customer: `Alice`, Preparation time: `6 seconds`. Click **Place order**.
   - Immediately enter Customer: `Bob`, Preparation time: `2 seconds`. Click **Place order**.
   - **Observation:** Notice the cashier form is instantly cleared and free. Bob's tea finishes and moves to **Ready** at 2s, *before* Alice's finishes at 6s.
2. **Failure Simulation:**
   - Place an order with `Simulate failure` checked.
   - **Observation:** The order transitions to the **⚠️ Failed** column with reason "Ingredients unavailable." Other running orders continue without interruption.
3. **Refresh Recovery:**
   - Place a 20-second order.
   - Refresh the browser (F5).
   - **Observation:** The order is reloaded from MySQL and seamlessly completes into the Ready bucket when its time is up.
4. **Teaching Snippet Demos:**
   - Click `1 · Run broken return`: Demonstrates `undefined` output.
   - Click `2 · Run callback`: Demonstrates deferred callback execution.
   - Click `3 · Run Promise .then()`: Demonstrates immediate Promise return and `.then()` resolution.
