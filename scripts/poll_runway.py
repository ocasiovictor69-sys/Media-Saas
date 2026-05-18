#!/usr/bin/env python3
import json
import os
import time
import urllib.request
import urllib.error

API_KEY = os.getenv("RUNWAY_API_KEY", "key_772780b2c4240137dd4484b07035299b227430232143d7559f62038a127d9f69812d35e2f72397a4252dce0059760401f55d2307e9f4dbc434fa2693b59e5276")
API_BASE = "https://api.dev.runwayml.com/v1"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "X-Runway-Version": "2024-11-06",
}

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(SCRIPT_DIR)
TIMELINE_JSON = os.path.join(BASE, "timeline", "runway_job_results.json")
OUTPUT_DIR = os.path.join(BASE, "assets", "runway")

def poll_job(job_id):
    try:
        req = urllib.request.Request(
            f"{API_BASE}/tasks/{job_id}",
            headers=HEADERS,
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            # Handle standard Runway API v1 response envelope where status is in data.get('task', {}).get('status')
            task_info = data.get("task", data)
            return task_info.get("status"), task_info.get("output")
    except Exception as e:
        return f"error_{e}", None

def run():
    print("=" * 70)
    print("RUNWAY POLLING SCRIPT - WINDOWS NATIVE WATCHDOG")
    print("=" * 70)
    
    if not os.path.exists(TIMELINE_JSON):
        print(f"ERROR: Results file not found at: {TIMELINE_JSON}")
        return
        
    with open(TIMELINE_JSON) as f:
        results = json.load(f)
        
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR, exist_ok=True)

    all_completed = True
    for job in results["jobs"]:
        output_file = os.path.join(OUTPUT_DIR, f"module{job['module_id']}.mp4")
        has_valid_file = os.path.exists(output_file) and os.path.getsize(output_file) > 100
        
        if job.get("status") == "completed" and has_valid_file:
            print(f"OK - Module {job['module_id']}: Already completed and verified.")
            continue
            
        job_id = job.get("job_id")
        if not job_id:
            print(f"WARN - Module {job['module_id']}: No job_id found.")
            continue
            
        all_completed = False
        
        # If marked completed but file is missing/invalid, trigger redownload directly
        if job.get("status") == "completed" and not has_valid_file:
            video_url = job.get("video_url")
            if video_url:
                print(f"\nRedownloading missing Module {job['module_id']} video from: {video_url}...")
                try:
                    urllib.request.urlretrieve(video_url, output_file)
                    print(f"   Saved successfully! Size: {os.path.getsize(output_file):,} bytes")
                    continue
                except Exception as ex:
                    print(f"   Download failed: {ex}")
                    # Reset status to in_progress so it retries later
                    job["status"] = "in_progress"
            else:
                job["status"] = "in_progress"
        print(f"\nPolling Module {job['module_id']} ({job['title']}) - ID: {job_id}...")
        status, output = poll_job(job_id)
        print(f"   Status: {status}")
        
        if status in ("SUCCEEDED", "succeeded", "COMPLETED", "completed"):
            video_url = output[0] if (output and len(output) > 0) else None
            if video_url:
                job["status"] = "completed"
                job["video_url"] = video_url
                output_file = os.path.join(OUTPUT_DIR, f"module{job['module_id']}.mp4")
                print(f"   Downloading completed video to: {output_file}...")
                try:
                    urllib.request.urlretrieve(video_url, output_file)
                    print(f"   Saved successfully! Size: {os.path.getsize(output_file):,} bytes")
                except Exception as ex:
                    print(f"   Download failed: {ex}")
            else:
                print("   WARN - No output URL returned by Runway.")
        elif status in ("FAILED", "failed"):
            job["status"] = "failed"
            print("   ERROR - Generation failed on Runway server.")
        elif status in ("PENDING", "pending", "QUEUED", "queued", "RUNNING", "running", "in_progress", "IN_PROGRESS", "THROTTLED", "throttled"):
            job["status"] = "in_progress"
            print("   INFO - Still rendering or throttled...")
        else:
            print(f"   Unhandled status response: {status}")

    # Write updated results back to disk
    with open(TIMELINE_JSON, "w") as f:
        json.dump(results, f, indent=2)
    print("\nStatus log updated successfully.")
    
    if all_completed:
        print("\nSUCCESS - ALL VIDEOS ARE COMPLETED AND DOWNLOADED!")

if __name__ == "__main__":
    run()
