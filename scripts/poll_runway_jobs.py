#!/usr/bin/env python3
"""Poll Runway Gen-4.5 video generation jobs and download completed videos."""
import json, os, time, urllib.request, urllib.error

API_KEY = "key_772780b2c4240137dd4484b07035299b227430232143d7559f62038a127d9f69812d35e2f72397a4252dce0059760401f55d2307e9f4dbc434fa2693b59e5276"
API_BASE = "https://api.dev.runwayml.com/v1"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "X-Runway-Version": "2024-11-06",
}
OUTPUT_DIR = "/mnt/d/TomorrowNow AI/Hermes_COO_Flow-Media/production/media-saas/assets/runway"
QUEUE_LOG = "/mnt/d/TomorrowNow AI/Hermes_COO_Flow-Media/production/media-saas/timeline/runway_job_results.json"

jobs = [
    {"module_id": 1, "title": "THE WORLD I LEFT", "job_id": "c6d544f4-71ae-40bf-bf82-4374a1c28e16", "status": "submitted"},
    {"module_id": 2, "title": "THE OBSOLETE MODEL", "job_id": "85a69c1a-2e34-4f87-9765-df96623f0836", "status": "submitted"},
    {"module_id": 3, "title": "STONE AGE & ROCK BOTTOM", "job_id": "95066ffa-18d8-4627-9019-85531984b15a", "status": "submitted"},
    {"module_id": 4, "title": "THE KEY", "job_id": "cbc8a714-befd-42db-9e4b-217bb59adf88", "status": "submitted"},
    {"module_id": 5, "title": "THE PRISON OF THE MIND", "job_id": "1e94b034-8d75-4b98-b411-5e4fc5ab4934", "status": "submitted"},
    {"module_id": 6, "title": "REINVENTION \u0026 CODE", "job_id": "1d8f23b8-5f2c-4dda-89fd-b73c93c78154", "status": "submitted"},
    {"module_id": 7, "title": "TOMORROWNOW AI", "job_id": "7155ae8b-370c-4610-8fa8-00973a03b452", "status": "submitted"},
]

results = {"submitted_at": time.strftime("%Y-%m-%dT%H:%M:%S"), "model": "gen4.5", "jobs": jobs}

def poll_job(job_id):
    req = urllib.request.Request(f"{API_BASE}/tasks/{job_id}", headers=HEADERS)
    resp = urllib.request.urlopen(req, timeout=30)
    data = json.loads(resp.read())
    return data.get("status"), data.get("output")

print("=" * 70)
print("POLLING RUNWAY GEN-4.5 JOBS")
print("=" * 70)

max_retries = 40
interval = 30

for attempt in range(max_retries):
    all_done = True
    if attempt > 0:
        print(f"\n--- Poll round {attempt+1}/{max_retries} (waiting {interval}s) ---", flush=True)
        time.sleep(interval)

    for job in results["jobs"]:
        if job["status"] in ("completed", "failed"):
            continue
        all_done = False
        try:
            status, output = poll_job(job["job_id"])
            print(f"  Module {job['module_id']} ({job['title']}): {status}", flush=True)
            if status == "SUCCEEDED":
                video_url = output[0] if output else None
                job["status"] = "completed"
                job["video_url"] = video_url
                print(f"    COMPLETE -- {video_url}", flush=True)
                if video_url:
                    output_file = os.path.join(OUTPUT_DIR, f"module{job['module_id']}.mp4")
                    print(f"    Downloading to {output_file}...", flush=True)
                    urllib.request.urlretrieve(video_url, output_file)
                    size = os.path.getsize(output_file)
                    print(f"    Saved: {size:,} bytes", flush=True)
            elif status == "FAILED":
                job["status"] = "failed"
                print("    FAILED", flush=True)
            else:
                job["status"] = "in_progress"
        except Exception as e:
            print(f"  Module {job['module_id']}: poll error -- {e}", flush=True)

    with open(QUEUE_LOG, "w") as f:
        json.dump(results, f, indent=2)

    if all_done:
        print("\nAll jobs complete!", flush=True)
        break

print("\n" + "=" * 70)
print("FINAL STATUS")
print("=" * 70)
for job_i in results["jobs"]:
    marker = "PASS" if job_i["status"] == "completed" else "FAIL"
    print(f"  [{marker}] Module {job_i['module_id']}: {job_i['title']} -- {job_i['status']}", flush=True)
    if job_i.get("video_url"):
        print(f"         {job_i['video_url']}", flush=True)
