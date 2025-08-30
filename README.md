AuraShield AML 🛡️
An interactive, machine-learning-powered dashboard for visually detecting and analyzing complex money laundering networks.

AuraShield is a forensic analysis tool designed to empower financial investigators and law enforcement agencies. It transforms massive, confusing spreadsheets of transaction data into a clear, intuitive, and interactive network graph. By visualizing the flow of funds and leveraging a powerful AI-driven risk scoring engine, AuraShield can uncover sophisticated laundering schemes in minutes, a task that would otherwise take days or weeks of manual analysis.

This project was developed to provide a powerful, open-source solution to a critical global problem, making advanced fraud detection technology more accessible.


✨ Key Features
Interactive Network Visualization: Go beyond spreadsheets. AuraShield displays accounts as nodes and transactions as edges, allowing you to instantly see the connections and flow of money.

AI-Powered Risk Scoring: At its core, AuraShield uses a trained LightGBM model to assign a precise ML Risk Score to every account. This allows investigators to immediately focus on the most critical threats.

Heuristic Pattern Filters: In addition to the AI score, the dashboard includes one-click filters to highlight classic money laundering patterns like Smurfing, Layering, and Rapid Movement, providing multiple layers of analysis.

Synchronized Transaction Timeline: Uncover coordinated activity by analyzing when transactions occurred. The timeline is fully synchronized with the network graph, providing a crucial temporal dimension to investigations.

Flexible Data Analysis: The powerful Python backend can be used to process and score any new transaction file. The frontend allows investigators to easily upload these scored reports for immediate visualization.

🛠️ Technology Stack
Backend & ML Engine: Python, Pandas, Scikit-learn, LightGBM, Joblib

Frontend & Dashboard: HTML, CSS, JavaScript, Tailwind CSS, vis.js, PapaParse

Getting Started
The system works in two stages: a one-time model training process and an analysis stage for new files. Full, step-by-step instructions on how to run the project can be found in the documentation

