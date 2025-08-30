import pandas as pd
import numpy as np
import joblib
import sys

def process_file(input_filename):
    print(f"Loading new data from '{input_filename}'...")
    try:
        df = pd.read_csv(input_filename)
    except FileNotFoundError:
        print(f"Error: The file '{input_filename}' was not found.")
        sys.exit(1)
        
    df['timestamp'] = pd.to_datetime(df['timestamp'], format='ISO8601', errors='coerce')

    print("Loading pre-trained model from 'aml_model.pkl'...")
    try:
        lgb_clf = joblib.load('aml_model.pkl')
    except FileNotFoundError:
        print("Error: 'aml_model.pkl' not found. Please run 'train_and_predict.py' first to train and save the model.")
        sys.exit(1)

    print("Engineering features for the new data...")
    df['hour_of_day'] = df['timestamp'].dt.hour
    df['day_of_week'] = df['timestamp'].dt.dayofweek

    from_features = df.groupby('from').agg(
        outgoing_tx_count=('id', 'count'),
        avg_outgoing_value=('value', 'mean'),
        total_outgoing_value=('value', 'sum')
    ).reset_index().rename(columns={'from': 'account_id'})

    to_features = df.groupby('to').agg(
        incoming_tx_count=('id', 'count'),
        avg_incoming_value=('value', 'mean'),
        total_incoming_value=('value', 'sum')
    ).reset_index().rename(columns={'to': 'account_id'})

    account_features = pd.merge(from_features, to_features, on='account_id', how='outer').fillna(0)
    
    df = pd.merge(df, account_features, left_on='from', right_on='account_id', how='left')
    df = pd.merge(df, account_features, left_on='to', right_on='account_id', how='left', suffixes=('_from', '_to'))
    df = df.drop(columns=['account_id_from', 'account_id_to'])
    
    features = [
        'value', 'hour_of_day', 'day_of_week',
        'outgoing_tx_count_from', 'avg_outgoing_value_from', 'total_outgoing_value_from',
        'incoming_tx_count_from', 'avg_incoming_value_from', 'total_incoming_value_from',
        'outgoing_tx_count_to', 'avg_outgoing_value_to', 'total_outgoing_value_to',
        'incoming_tx_count_to', 'avg_incoming_value_to', 'total_incoming_value_to'
    ]
    
    print("Predicting risk scores...")
    df['transaction_risk_score'] = lgb_clf.predict_proba(df[features])[:, 1]
    
    print("Aggregating scores by account...")
    sender_scores = df.groupby('from')['transaction_risk_score'].max()
    receiver_scores = df.groupby('to')['transaction_risk_score'].max()
    account_scores = pd.concat([sender_scores, receiver_scores], axis=1).max(axis=1).reset_index()
    account_scores.columns = ['account_id', 'ml_risk_score']
    
    final_accounts = pd.merge(account_features, account_scores, on='account_id', how='left').fillna(0)
    final_accounts['ml_risk_score'] = (final_accounts['ml_risk_score'] * 100).round(2)
    
    output_accounts_filename = 'processed_accounts.csv'
    final_accounts.to_csv(output_accounts_filename, index=False)
    
    print("\nProcessing complete!")
    print(f"1. The original transactions are in your input file: '{input_filename}'")
    print(f"2. The scored accounts have been saved to: '{output_accounts_filename}'")
    print("\nYou can now upload these two files on the website.")

if __name__ == '__main__':
    if len(sys.argv) != 2: 
        print("Usage: python process_new_file.py <path_to_your_csv_file>")
    else:
        process_file(sys.argv[1])
