"""Tea Shop Order Simulator - REST API Backend.

Handles order creation, status retrieval, and updates backed by MySQL.
Supports asynchronous operations, simulated delays, and state recovery.
"""

import os
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
import mysql.connector
from flask import Flask, jsonify, render_template, request

# Load environment variables from .env file
load_dotenv(Path(__file__).resolve().parent / '.env')
load_dotenv()

app = Flask(__name__)

MYSQL_CONFIG = {
    'host': os.getenv('MYSQL_HOST', '127.0.0.1'),
    'port': int(os.getenv('MYSQL_PORT', '3306')),
    'user': os.getenv('MYSQL_USER', 'root'),
    'password': os.getenv('MYSQL_PASSWORD', ''),
    'database': os.getenv('MYSQL_DB_NAME', 'tea_shop_db'),
}

TEA_TYPES = ('Regular tea', 'Ginger tea', 'Green tea')
PREP_TIMES = (2, 4, 6, 20)


@contextmanager
def connect():
    """Yield a MySQL connection and commit or rollback transactions cleanly."""
    db = mysql.connector.connect(**MYSQL_CONFIG)
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def validate_order(data):
    """Validate submitted JSON and return any errors with cleaned values."""
    if not isinstance(data, dict):
        return ['Send a valid JSON object.'], None

    name = str(data.get('customer_name', '')).strip()
    tea_type = str(data.get('tea_type', '')).strip()
    prep_time = data.get('prep_time')
    simulate_failure = bool(data.get('simulate_failure', False))

    errors = []
    if not (2 <= len(name) <= 50):
        errors.append('Customer name must be between 2 and 50 characters.')
    if tea_type not in TEA_TYPES:
        errors.append(f'Tea type must be one of: {", ".join(TEA_TYPES)}.')
    try:
        prep_time = int(prep_time)
        if prep_time not in PREP_TIMES and prep_time <= 0:
            errors.append('Preparation time must be a positive number of seconds.')
    except (TypeError, ValueError):
        errors.append('Preparation time must be an integer.')

    return errors, (name, tea_type, prep_time, int(simulate_failure))


def get_order(order_id):
    """Retrieve one order by ID as a dictionary."""
    with connect() as db:
        with db.cursor(dictionary=True) as cursor:
            cursor.execute('SELECT * FROM orders WHERE id = %s', (order_id,))
            return cursor.fetchone()


@app.route('/')
def home():
    """Serve the Single Page Application HTML shell."""
    return render_template('index.html')


@app.get('/api/orders')
def list_orders():
    """Return all orders. Auto-recovers orders whose prep_time elapsed during refresh."""
    with connect() as db:
        with db.cursor(dictionary=True) as cursor:
            # Query all orders
            cursor.execute('SELECT * FROM orders ORDER BY id DESC')
            orders = cursor.fetchall()

            now = datetime.now()
            # Recovery check: if an order is still 'Preparing' but elapsed time >= prep_time, settle it
            for order in orders:
                if order['status'] == 'Preparing':
                    created = order['created_at']
                    elapsed = (now - created).total_seconds()
                    if elapsed >= order['prep_time']:
                        new_status = 'Failed' if order['simulate_failure'] else 'Ready'
                        reason = 'Ingredients unavailable.' if order['simulate_failure'] else None
                        
                        update_cur = db.cursor()
                        update_cur.execute(
                            'UPDATE orders SET status = %s, failure_reason = %s WHERE id = %s',
                            (new_status, reason, order['id']),
                        )
                        order['status'] = new_status
                        order['failure_reason'] = reason

    return jsonify(orders)


@app.get('/api/orders/<int:order_id>')
def single_order(order_id):
    """Retrieve a single order by ID."""
    order = get_order(order_id)
    if not order:
        return jsonify(error='Order not found.'), 404
    return jsonify(order)


@app.post('/api/orders')
def create_order():
    """Accept and store a new order in MySQL with initial status 'Preparing'."""
    if not request.is_json:
        return jsonify(error='Send JSON with Content-Type: application/json.'), 415

    errors, values = validate_order(request.get_json(silent=True))
    if errors:
        return jsonify(errors=errors), 400

    with connect() as db:
        with db.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO orders (customer_name, tea_type, prep_time, simulate_failure, status)
                VALUES (%s, %s, %s, %s, 'Preparing')
                """,
                values,
            )
            order_id = cursor.lastrowid

    return jsonify(get_order(order_id)), 201


@app.patch('/api/orders/<int:order_id>')
def update_status(order_id):
    """Update order status to Ready or Failed when preparation completes."""
    if not request.is_json:
        return jsonify(error='Send JSON with Content-Type: application/json.'), 415

    data = request.get_json(silent=True) or {}
    new_status = data.get('status')
    failure_reason = data.get('failure_reason')

    if new_status not in ('Ready', 'Failed', 'Preparing'):
        return jsonify(error='Invalid status provided.'), 400

    with connect() as db:
        with db.cursor() as cursor:
            cursor.execute('SELECT id FROM orders WHERE id = %s', (order_id,))
            if cursor.fetchone() is None:
                return jsonify(error='Order not found.'), 404

            cursor.execute(
                'UPDATE orders SET status = %s, failure_reason = %s WHERE id = %s',
                (new_status, failure_reason, order_id),
            )

    return jsonify(get_order(order_id)), 200


@app.delete('/api/orders/clear')
def clear_orders():
    """Reset the demonstration database (optional helper)."""
    with connect() as db:
        with db.cursor() as cursor:
            cursor.execute('TRUNCATE TABLE orders')
    return jsonify(message='Orders cleared.'), 200


if __name__ == '__main__':
    app.run(debug=True, port=5001)
