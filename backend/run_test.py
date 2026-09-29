import sys
import traceback

try:
    import test_pipeline
    test_pipeline.test_pipeline()
    print("TEST_PIPELINE_SUCCESS")
except Exception as e:
    print(f"TEST_PIPELINE_ERROR: {e}")
    traceback.print_exc()
