#!/usr/bin/env python3
"""
Runway Gen-3 Alpha Job Submission Script
Submits 7 video generation jobs for the "How AI Saved My Life" film.
"""
import json
import os
import time
import sys

API_KEY = os.getenv("RUNWAY_API_KEY", "key_772780b2c4240137dd4484b07035299b227430232143d7559f62038a127d9f69812d35e2f72397a4252dce0059760401f55d2307e9f4dbc434fa2693b59e5276")
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(SCRIPT_DIR)
TIMELINE = os.path.join(BASE, "timeline", "story.timeline.json")
OUTPUT_DIR = os.path.join(BASE, "assets", "runway")
QUEUE_LOG = os.path.join(BASE, "timeline", "runway_job_results.json")
API_BASE = "https://api.runwayml.com/v1"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "X-Runway-Version": "2024-11-06",
}

# Load timeline
with open(TIMELINE) as f:
    timeline = json.load(f)

# Read hyperframe configs for the 7 modules
hyperframes = {}
for i in range(1, 8):
    hf_path = os.path.join(BASE, "assets", "hyperframes", f"module{i}.json")
    with open(hf_path) as hf:
        hyperframes[i] = json.load(hf)

# Module prompts mapped dynamically from timeline
modules = {}
prompts = {}
for m in timeline["modules"]:
    module_id = m["id"]
    modules[module_id] = m
    prompts[module_id] = {
        "text_prompt": m["assets"]["runway_gen3_prompt"],
        "duration": 5, # Standard 5 second B-roll duration
    }

results = {"submitted_at": time.strftime("%Y-%m-%dT%H:%M:%S"), "jobs": []}

print("=" * 70)
print("RUNWAY GEN-3 ALPHA — JOB SUBMISSION")
print("=" * 70)

# Step 1: Submit all 7 jobs
for module_id in sorted(prompts.keys()):
    module = modules[module_id]
    prompt_data = prompts[module_id]
    hf = hyperframes[module_id]

    body = {
        "textPrompt": prompt_data["text_prompt"],
        "model": "gen3a_turbo",
        "duration": prompt_data["duration"],
        "ratio": "16:9",
        "seed": int(time.time() * 1000) % 2**31,
    }

    print(f"\nSubmitting Module {module_id}: {module['title']}...")

    try:
        req = __import__("urllib.request")
        resp = req.urlopen(req.Request(
            f"{API_BASE}/image_to_video",
            data=json.dumps(body).encode(),
            headers=HEADERS,
            method="POST",
        ))
        data = json.loads(resp.read())
        print(f"  Job submitted: {data.get('id', 'unknown')}")
        results["jobs"].append({
            "module_id": module_id,
            "title": module["title"],
            "job_id": data.get("id"),
            "status": "submitted",
            "prompt": prompt_data["text_prompt"],
        })
    except __import__("urllib.error").HTTPError as e:
        err = e.read().decode()
        print(f"  ERROR: HTTP {e.code} — {err[:200]}")
        results["jobs"].append({
            "module_id": module_id,
            "title": module["title"],
            "job_id": None,
            "status": f"failed_{e.code}",
            "error": err[:500],
        })

# Write results
with open(QUEUE_LOG, "w") as f:
    json.dump(results, f, indent=2)
    print(f"\nResults written to: {QUEUE_LOG}")

# Step 2: Poll for completion
print("\n" + "=" * 70)
print("POLLING FOR JOB COMPLETION")
print("=" * 70)

max_retries = 60
interval = 30

def poll_job(job_id):
    try:
        req = __import__("urllib.request")
        resp = req.urlopen(req.Request(
            f"{API_BASE}/tasks/{job_id}",
            headers=HEADERS,
        ))
        data = __import__("json").loads(resp.read())
        return data.get("status"), data.get("output")
    except Exception as e:
        return f"error_{e}", None

for attempt in range(max_retries):
    all_done = True
    time.sleep(interval)

    for job in results["jobs"]:
        if job["status"] == "completed":
            continue

        all_done = False
        if not job.get("job_id"):
            continue

        status, output = poll_job(job["job_id"])
        print(f"\n  Module {job['module_id']} ({job['title']}): attempt {attempt+1} — Status: {status}")

        if status == "SUCCEEDED":
            video_url = output[0] if output else None
            job["status"] = "completed"
            job["video_url"] = video_url
            print(f"    COMPLETE — {video_url}")

            # Download the video to assets/runway/
            if video_url:
                import urllib.request as ur
                output_file = os.path.join(OUTPUT_DIR, f"module{job['module_id']}.mp4")
                print(f"    Downloading to {output_file}...")
                ur.urlretrieve(video_url, output_file)
                size = os.path.getsize(output_file)
                print(f"    Saved: {size:,} bytes")

        elif status == "FAILED":
            job["status"] = "failed"
            print(f"    FAILED")
        elif status in ("NOT_FOUND", "queued", "running", "in_progress", "IN_PROGRESS"):
            job["status"] = "in_progress"
            print(f"    Still processing...")
        else:
            print(f"    Status: {status}")

    if all_done:
        print("\nAll jobs complete!")
        break

# Final summary
with open(QUEUE_LOG, "w") as f:
    json.dump(results, f, indent=2)

print("\n" + "=" * 70)
print("FINAL STATUS")
print("=" * 70)
for job in results["jobs"]:
    status_marker = "PASS" if job["status"] == "completed" else "FAIL"
    print(f"  [{status_marker}] Module {job['module_id']}: {job['title']} — {job['status']}")
    if job.get("video_url"):
        print(f"         {job['video_url']}")
