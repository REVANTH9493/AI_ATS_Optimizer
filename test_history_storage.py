import os
import sys
import json
from dotenv import load_dotenv

workspace_root = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(workspace_root, "project", "backend")
sys.path.append(backend_path)

load_dotenv(dotenv_path=os.path.join(backend_path, ".env"))

from app.supabase_client import supabase_client

try:
    email = "rockr949367@gmail.com"
    dummy_data = {
        "job_analysis": {"company": "TestCorp", "job_title": "Python Dev"},
        "ats_analysis": {"ats_score_before": 50, "ats_score_after": 80}
    }
    
    path = f"{email}/history/test_file.json"
    print(f"Uploading dummy history file to '{path}'...")
    
    # Upload
    supabase_client.storage.from_("resumes").upload(
        path=path,
        file=json.dumps(dummy_data).encode("utf-8"),
        file_options={"content-type": "application/json", "upsert": "true"}
    )
    
    print("Listing files under history folder...")
    res = supabase_client.storage.from_("resumes").list(f"{email}/history")
    print("Files found:")
    for f in res:
        print(f)
        
    # Clean up
    print("Cleaning up test file...")
    supabase_client.storage.from_("resumes").remove(path)
    
except Exception as e:
    print(f"Error: {e}")
