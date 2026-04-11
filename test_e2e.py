import sys
import json
from pathlib import Path

# Add specific paths so we can import from classifier and ml_modules
base_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(base_dir / "classifier"))
sys.path.insert(0, str(base_dir / "ml_modules"))

try:
    from xgboost_model import run_image_pipeline
    from llm_question_gen import generate_questions
    from bayesian_updater import run_session, cli_presenter, format_output
except ImportError as e:
    print(f"Error importing modules: {e}")
    sys.exit(1)

def run_end_to_end_demo():
    print("=" * 60)
    print("  VISUALDIAGNOSE — END-TO-END WORKFLOW SIMULATION")
    print("=" * 60)
    print("This script simulates the entire backend flow as it will happen")
    print("through your FastAPI endpoints.\n")

    # 1. Image Extraction & XGBoost Initial Prediction
    print("── STEP 1: Image Extraction & XGBoost ──────────────────")
    tongue_path = str(base_dir / "ml_modules" / "tongue.jpeg")
    eye_path    = str(base_dir / "ml_modules" / "eye.jpeg")
    nail_path   = str(base_dir / "ml_modules" / "nail.jpeg")
    
    print(f"Loading user images...\n")
    xgb_result = run_image_pipeline(tongue_path, eye_path, nail_path)
    print("\n[Mock Endpoint 1 /predict] XGBoost output:")
    print(json.dumps(xgb_result["top3"], indent=2))
    
    # 2. LLM Question Generation
    print("\n── STEP 2: Generating Dynamic Questions (LLM) ──────────")
    print("User clicked 'Answer Questions for Detailed Analysis'.")
    questions = generate_questions(
        top3=xgb_result["top3_tuples"],
        provider="offline",  # Use offline to ensure consistent testing
        verbose=True
    )

    # 3. Bayesian Updater (User Interactive Loop)
    print("\n── STEP 3: User Diagnostic Session ─────────────────────")
    final_probs = run_session(
        top3=xgb_result["top3_tuples"],
        questions=questions,
        presenter=cli_presenter,
        verbose=True
    )

    # 4. Final Output Formatting
    print("\n── STEP 4: Generating Final JSON Report ────────────────")
    final_json = format_output(final_probs)
    print(json.dumps(final_json, indent=2))
    print("\nSimulation complete. This JSON drives the final UI Report page.")

if __name__ == "__main__":
    run_end_to_end_demo()
