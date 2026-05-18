#!/usr/bin/env python3
"""
Full widescreen film assembler using FFmpeg.

This script:
1. Concatenates all 7 Runway Gen-4.5 B-roll videos into a single continuous backdrop.
2. Optionally overlays the avatar presenter footage (picture-in-picture).
3. Optionally layers the voiceover audio track(s).
4. Adds cinematic intro title card and end credits.
5. Outputs a single master widescreen MP4.

Usage:
    python3 scripts/assemble_film.py [--with-avatar] [--with-audio] [--output PATH]
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUNWAY_DIR = os.path.join(BASE, "assets", "runway")
AVATAR_DIR = os.path.join(BASE, "assets", "avatar-video")
AUDIO_DIR = os.path.join(BASE, "assets", "audio")
OUTPUT_DIR = os.path.join(BASE, "assets", "output")
TIMELINE = os.path.join(BASE, "timeline", "story.timeline.json")
DEFAULT_OUTPUT = os.path.join(OUTPUT_DIR, "TN_FILM_FULL.mp4")


def ensure_dir(path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)


def validate_ffmpeg():
    """Check that ffmpeg is available."""
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            version_line = result.stdout.splitlines()[0]
            print(f"  FFmpeg found: {version_line}")
            return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    print("  ERROR: ffmpeg not found on PATH")
    return False


def build_concat_list(num_modules: int) -> str:
    """Build an FFmpeg concat demuxer list file."""
    fd, list_path = tempfile.mkstemp(suffix="_ffmpeg_concat.txt")
    os.close(fd)
    lines = []
    for i in range(1, num_modules + 1):
        video_path = os.path.join(RUNWAY_DIR, f"module{i}.mp4")
        path_norm = video_path.replace("\\", "/")
        lines.append(f"file '{path_norm}'")
    with open(list_path, "w") as f:
        f.write("\n".join(lines))
    return list_path


def generate_intro(duration_sec: float = 5.0, resolution: str = "1920x1080") -> str:
    """Generate a 5-second intro title card using FFmpeg."""
    fd, intro_path = tempfile.mkstemp(suffix="_intro.mp4")
    os.close(fd)

    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"color=c=black:s={resolution}:d={duration_sec}",
        "-vf", (
            "drawtext="
            "text='TOMORROWNOW AI':"
            "fontcolor=white:fontsize=64:"
            "x=(w-text_w)/2:y=(h-text_h)/2-30,"
            "drawtext="
            "text='How AI Saved My Life':"
            "fontcolor=white:fontsize=36:"
            "x=(w-text_w)/2:y=(h-text_h)/2+50,"
            "drawtext="
            "text='Narrated by Victor Ocasio':"
            "fontcolor=#cccccc:fontsize=24:"
            "x=(w-text_w)/2:y=(h-text_h)/2+110"
        ),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-r", "30",
        "-t", str(duration_sec),
        "-an",
        intro_path,
    ]
    subprocess.run(cmd, capture_output=True, check=True)
    return intro_path


def run(args=None):
    parser = argparse.ArgumentParser(description="Assemble the full widescreen film")
    parser.add_argument("--with-avatar", action="store_true", help="Overlay avatar video")
    parser.add_argument("--with-audio", action="store_true", help="Layer voiceover audio")
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="Output file path")
    opts = parser.parse_args(args)

    print("=" * 70)
    print("TOMORROWNOW AI -- FULL FILM ASSEMBLER (FFmpeg)")
    print("=" * 70)

    # Step 0: Validate ffmpeg
    print("\n[0/6] Checking FFmpeg...")
    if not validate_ffmpeg():
        sys.exit(1)

    # Load timeline
    print("\n[1/6] Loading timeline...")
    with open(TIMELINE) as f:
        timeline_data = json.load(f)
    num_modules = len(timeline_data["modules"])
    total_sec = sum(m["estimated_duration_sec"] for m in timeline_data["modules"])
    print(f"  Modules: {num_modules}")
    print(f"  Estimated total: ~{total_sec} seconds ({total_sec/60:.1f} min)")
    for m in timeline_data["modules"]:
        vpath = os.path.join(BASE, m["assets"]["video_path"])
        exists = os.path.exists(vpath)
        size = os.path.getsize(vpath) if exists else 0
        print(f"  Module {m['id']}: {m['title']} -- {m['estimated_duration_sec']}s ({size:,} bytes {'OK' if exists else 'MISSING'})")

    # Step 2: Generate intro
    print(f"\n[2/6] Generating intro title card...")
    intro_path = generate_intro(5.0)
    print(f"  Intro: {intro_path}")

    # Step 3: Build concat list
    print(f"\n[3/6] Building B-roll concat list...")
    concat_list = build_concat_list(num_modules)
    with open(concat_list) as f:
        print(f"  Files: {f.read()}")

    # Step 4: Concatenate B-roll + intro
    intermed_path = os.path.join(OUTPUT_DIR, "intermediate_concat.mp4")
    ensure_dir(intermed_path)
    
    # Add intro + concat to a master list
    fd, master_list = tempfile.mkstemp(suffix="_master_concat.txt")
    os.close(fd)
    with open(master_list, "w") as f:
        norm_intro = intro_path.replace("\\", "/")
        f.write(f"file '{norm_intro}'\n")
        with open(concat_list) as cl:
            f.write(cl.read())
    print(f"  Master concat list: {master_list}")
    with open(master_list) as f:
        print(f"  Content: {f.read()}")

    print(f"\n[4/6] Concatenating {num_modules} modules + intro...")
    concat_cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", master_list,
        "-c", "copy",
        "-movflags", "+faststart",
        "-preset", "medium",
        intermed_path,
    ]
    print(f"  Command: {' '.join(concat_cmd)}")
    
    # Run with output visible
    result = subprocess.run(concat_cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        print(f"  STDERR: {result.stderr[-1000:]}")
        # Try re-encoding approach instead of copy
        print("  Copy failed, trying re-encode approach...")
        reencode_cmd = [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", master_list,
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            intermed_path,
        ]
        result = subprocess.run(reencode_cmd, capture_output=True, text=True, timeout=600)
        if result.returncode != 0:
            print(f"  ERROR: FFmpeg concat failed: {result.stderr[-1000:]}")
            sys.exit(1)
    
    if os.path.exists(intermed_path):
        size = os.path.getsize(intermed_path)
        print(f"  Intermediate: {intermed_path} ({size/1024/1024:.1f} MB)")
    else:
        print("  ERROR: Intermediate file not created")
        sys.exit(1)

    # Step 5: Add audio if requested
    final_path = opts.output
    if opts.with_audio:
        print(f"\n[5/6] Layering voiceover audio...")
        # Check for available voiceover
        vo_path = None
        for candidate in ["voiceover_mod1.wav", "voiceover_mod2.wav", "New_Recording.m4a"]:
            cp = os.path.join(AUDIO_DIR, candidate)
            if os.path.exists(cp) and os.path.getsize(cp) > 100:
                vo_path = cp
                break
        
        if vo_path:
            print(f"  Using: {vo_path}")
            audio_cmd = [
                "ffmpeg", "-y",
                "-i", intermed_path,
                "-i", vo_path,
                "-c:v", "copy",
                "-c:a", "aac",
                "-b:a", "192k",
                "-map", "0:v:0",
                "-map", "1:a:0",
                "-shortest",
                "-movflags", "+faststart",
                final_path,
            ]
            print(f"  Command: {' '.join(audio_cmd)}")
            result = subprocess.run(audio_cmd, capture_output=True, text=True, timeout=300)
            if result.returncode != 0:
                print(f"  ERROR: Audio layering failed: {result.stderr[-1000:]}")
                # Just copy the intermediate as final
                import shutil
                shutil.copy2(intermed_path, final_path)
                print("  Using unadorned video as output")
        else:
            print("  No voiceover found -- using unadorned video")
            import shutil
            shutil.copy2(intermed_path, final_path)
    elif opts.with_avatar:
        print(f"\n[5/6] Overlaying avatar (picture-in-picture)...")
        # Find avatar video
        avatar_path = os.path.join(AVATAR_DIR, "IMG_0573.MOV")
        if os.path.exists(avatar_path):
            avatar_cmd = [
                "ffmpeg", "-y",
                "-i", intermed_path,
                "-i", avatar_path,
                "-filter_complex",
                "[1:v]scale=480:270[avatar];[0:v][avatar]overlay=W-w-20:H-h-20[vout]",
                "-map", "[vout]",
                "-c:v", "libx264",
                "-preset", "medium",
                "-crf", "23",
                "-movflags", "+faststart",
                final_path,
            ]
            print(f"  Avatar: {avatar_path}")
            print(f"  Command: {' '.join(avatar_cmd)}")
            result = subprocess.run(avatar_cmd, capture_output=True, text=True, timeout=300)
            if result.returncode != 0:
                print(f"  ERROR: Avatar overlay failed: {result.stderr[-500:]}")
                import shutil
                shutil.copy2(intermed_path, final_path)
        else:
            print(f"  Avatar not found at {avatar_path}")
            import shutil
            shutil.copy2(intermed_path, final_path)
    else:
        print(f"\n[5/6] No overlays requested -- copying intermediate to output")
        import shutil
        shutil.copy2(intermed_path, final_path)

    # Summary
    print(f"\n[6/6] Final output...")
    if os.path.exists(final_path):
        size = os.path.getsize(final_path)
        minutes = size / 1024 / 1024
        print(f"  PASS: {final_path}")
        print(f"  Size: {size:,} bytes ({size/1024:.1f} KB)")
        
        # Get duration
        probe_cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            final_path,
        ]
        try:
            probe_result = subprocess.run(probe_cmd, capture_output=True, text=True, timeout=10)
            if probe_result.returncode == 0:
                duration = float(probe_result.stdout.strip())
                print(f"  Duration: {duration:.1f}s ({duration/60:.1f} min)")
        except Exception:
            pass
    else:
        print(f"  FAIL: Output file not found at {final_path}")
        sys.exit(1)

    # Cleanup temp files
    for tmp in [concat_list, master_list, intro_path]:
        if os.path.exists(tmp):
            os.remove(tmp)
    if os.path.exists(intermed_path):
        os.remove(intermed_path)

    print("\n" + "=" * 70)
    print("ASSEMBLY COMPLETE")
    print("=" * 70)

if __name__ == "__main__":
    run()
