"""One-time export: sklearn LGBMClassifier (joblib) -> native LightGBM text model.
Run once in an environment with lightgbm==4.6.0 and scikit-learn==1.6.1.
Usage: python export_booster.py compact82_4f086816606c770cc9a1.joblib compact82_booster.txt
"""
import sys, joblib
m = joblib.load(sys.argv[1])
m.booster_.save_model(sys.argv[2])
print('saved', sys.argv[2], 'trees', m.booster_.num_trees(), 'features', m.n_features_in_)
