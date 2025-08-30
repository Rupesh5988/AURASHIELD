import pandas as pd
import numpy as np
import lightgbm as lgb
from sklearn.model_selection import train_test_split
import joblib

def train_and_score(input_filename='transactions.csv', output_filename='accounts_with_scores.csv'):
    print("Loading data...")
    df = pd.read_csv(input_filename)
    df['timestamp'] = pd.to_datetime(df['timestamp'], format='ISO8601')

    print("Engineering features...")
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
    target = 'is_fraud'

    X = df[features]
    y = df[target]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42, stratify=y)
    
    print("Training LightGBM model...")
    lgb_clf = lgb.LGBMClassifier(objective='binary', random_state=42)
    lgb_clf.fit(X_train, y_train)

    print("Evaluating model...")
    from sklearn.metrics import roc_auc_score
    test_preds = lgb_clf.predict_proba(X_test)[:, 1]
    print(f"Model AUC Score: {roc_auc_score(y_test, test_preds):.4f}")

    print("Saving the trained model to aml_model.pkl...")
    joblib.dump(lgb_clf, 'aml_model.pkl')
    
    print(f"Model training complete and model saved!")

if __name__ == '__main__':
    train_and_score()