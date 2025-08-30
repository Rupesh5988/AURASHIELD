import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

def generate_transactions(num_accounts=200, num_transactions=1000, filename='transactions.csv'):
    transactions = []
    accounts = list(range(1, num_accounts + 1))
    legit_businesses = random.sample(accounts, int(num_accounts * 0.05))
    
    transaction_id = 1
    start_time = datetime(2025, 1, 1)

    def add_transaction(from_acc, to_acc, value, timestamp, is_fraud=False):
        nonlocal transaction_id
        is_legit = to_acc in legit_businesses
        transactions.append({
            'id': transaction_id, 'from': from_acc, 'to': to_acc, 'value': value,
            'timestamp': timestamp.isoformat(), 'is_legit_business': is_legit,
            'is_fraud': is_fraud
        })
        transaction_id += 1

    for _ in range(num_transactions):
        from_acc, to_acc = random.sample(accounts, 2)
        value = round(random.uniform(500, 50000), 2)
        time = start_time + timedelta(days=random.randint(0, 30), hours=random.randint(0, 23))
        add_transaction(from_acc, to_acc, value, time, is_fraud=False)
    
    def add_smurfing_pattern():
        target_acc = random.choice(accounts)
        num_smurfs = random.randint(4, 8)
        smurf_sources = random.sample([acc for acc in accounts if acc != target_acc], num_smurfs)
        base_time = start_time + timedelta(days=random.randint(31, 60))
        for i, source in enumerate(smurf_sources):
            value = round(random.uniform(8000, 9999), 2)
            time = base_time + timedelta(hours=i*2 + random.random())
            add_transaction(source, target_acc, value, time, is_fraud=True)

    def add_layering_cycle():
        cycle_len = random.randint(3, 5)
        cycle_nodes = random.sample(accounts, cycle_len)
        base_time = start_time + timedelta(days=random.randint(61, 90))
        for i in range(cycle_len):
            from_acc = cycle_nodes[i]
            to_acc = cycle_nodes[(i + 1) % cycle_len]
            value = round(random.uniform(20000, 100000), 2)
            time = base_time + timedelta(minutes=i*15 + random.randint(0,5))
            add_transaction(from_acc, to_acc, value, time, is_fraud=True)

    def add_rapid_movement():
        source, passthrough, destination = random.sample(accounts, 3)
        base_time = start_time + timedelta(days=random.randint(91, 120))
        in_value = round(random.uniform(50000, 150000), 2)
        out_value = round(in_value * random.uniform(0.96, 0.99), 2)
        time_in = base_time
        time_out = time_in + timedelta(minutes=random.randint(5, 25))
        add_transaction(source, passthrough, in_value, time_in, is_fraud=True)
        add_transaction(passthrough, destination, out_value, time_out, is_fraud=True)

    for _ in range(8): add_smurfing_pattern()
    for _ in range(5): add_layering_cycle()
    for _ in range(6): add_rapid_movement()

    df = pd.DataFrame(transactions)
    df.to_csv(filename, index=False)
    print(f"Generated '{filename}' with {len(df)} transactions successfully!")
    print(f"Fraudulent transactions: {df['is_fraud'].sum()} ({df['is_fraud'].sum() / len(df) * 100:.2f}%)")

if __name__ == '__main__':
    generate_transactions()