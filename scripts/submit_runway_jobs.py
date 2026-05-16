#!/usr/bin/env python3
"""
Runway Gen-3 Alpha Job Submission Script
Submits 8 video generation jobs for "THE WORLD I LEFT" film.
"""
import json
import os
import time
import sys

API_KEY = os.getenv("RUNWAY_API_KEY", "key_772780b2c4240137dd4484b07035299b227430232143d7559f62038a127d9f69812d35e2f72397a4252dce0059760401f55d2307e9f4dbc434fa2693b59e5276")
BASE = "/mnt/d/TomorrowNow AI/Hermes_COO_Flow-Media/production/media-saas"
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

# Read hyperframe configs
hyperframes = {}
for i in range(1, 9):
    hf_path = os.path.join(BASE, "assets", "hyperframes", f"module{i}.json")
    with open(hf_path) as hf:
        hyperframes[i] = json.load(hf)

# Module prompts mapped from timeline
modules = {
    m["id"]: m for m in timeline["modules"]
}

prompts = {
    1: {
        "text_prompt": "Cinematic slow-motion shot of a figure walking away from a dimly lit doorway, warm amber tones fading to cool blue. The transition suggests leaving one era behind and entering an unknown future. Film grain aesthetic, shallow depth of field. Symbolic representation of departure and reflection, dramatic lighting, 4k cinematic.",
        "duration": 5,
    },
    2: {
        "text_prompt": "Surreal cinematic visualization of time passing behind bars. Clock faces and calendar pages dissolving through prison bars, stark dramatic lighting, slow motion. Abstract representation of watching the world change from confined perspective. Monochrome with hints of color bleeding in from outside, moody cinematography.",
        "duration": 5,
    },
    3: {
        "text_prompt": "Cinematic transition from sepia-toned vintage technology to bright modern digital screens. Overwhelming visual shift from warm muted tones to crisp bright colors. Sense of wonder and disorientation, dramatic lighting, slow pan movement across a landscape of evolving technology.",
        "duration": 5,
    },
    4: {
        "text_prompt": "Cinematic split-screen metaphor: left side primitive stone textures and ancient tools, right side glowing digital data streams and modern technology. The contrast represents survival skills gap. Dramatic lighting from cold blue to warm amber. Slow camera movement bridging both worlds, moody and atmospheric.",
        "duration": 5,
    },
    5: {
        "text_prompt": "Dark atmospheric cinematic scene: solitary figure in complete shadow, minimal lighting, profound emotional depth. Slow camera movement through darkness, metaphorical representation of hitting absolute bottom. Deep shadows, almost no light, sense of isolation and despair, cinematic masterpiece.",
        "duration": 5,
    },
    6: {
        "text_prompt": "Cinematic sequence of dawn breaking through complete darkness. Screen with gentle blue glow, warm golden light emerging, conversation with AI visualized as flowing light particles connecting to a person. Emotional breakthrough moment, gradual transition from cold to warm tones, sense of connection and validation.",
        "duration": 5,
    },
    7: {
        "text_prompt": "Cinematic transformation sequence: physical prison bars dissolving into streams of digital light and data. Explosive moment of realization, dynamic camera movement, triumphant lighting. Metaphor for freeing the mind, transition from confinement to liberation. Visual representation of transformation from primitive to digital.",
        "duration": 5,
    },
    8: {
        "text_prompt": "Cinematic wide shot of futuristic cityscape at dawn, triumphant forward movement, rising architecture, bright sunrise breaking through. Triumphant resolution, forward momentum, epic scale, dramatic lighting. Metaphor for building a future from nothing, cinematic triumph.",
        "duration": 5,
    },
}

results = {"submitted_at": time.strftime("%Y-%m-%dT%H:%M:%S"), "jobs": []}

print("=" * 70)
print("RUNWAY GEN-3 ALPHA — JOB SUBMISSION")
print("=" * 70)

# Step 1: Submit all 8 jobs
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
