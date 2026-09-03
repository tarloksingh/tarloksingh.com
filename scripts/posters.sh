#!/bin/bash
# Pull one representative still out of every project clip, into
# `src/assets/posters/<project>/<name>.jpg`.
#
# These are what the home page's media field paints with, what a case-study
# figure shows before its video is worth decoding, and what a clip with sound
# shows before anyone presses play. So a poster that lands on a black frame is
# not a cosmetic problem — it is a card that looks broken.
#
# A lot of this footage opens on a fade from black, so the frame is chosen
# rather than taken: seek partway in, let ffmpeg's `thumbnail` filter pick the
# most representative frame from the following batch, then measure it. If the
# result is still nearly black, try progressively later offsets.
#
#   node scripts/media-manifest.mjs   # run after this, to pick up new files
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)/src/assets"
OUT="$ROOT/posters"
# Average luma below this reads as a black card rather than a dark frame.
MIN_LUMA=26
FORCE="${1:-}"
made=0 rescued=0 failed=0 kept=0

luma_of() {
  ffprobe -v error -f lavfi -i "movie=$1,signalstats" \
    -show_entries frame_tags=lavfi.signalstats.YAVG -of csv=p=0 2>/dev/null | head -1
}

while IFS= read -r video; do
  rel="${video#"$ROOT"/}"          # capsule-c1/hero.mp4
  project="${rel%%/*}"
  base="$(basename "${rel#*/}")"
  base="${base%.*}"
  [ "$project" = "posters" ] && continue

  mkdir -p "$OUT/$project"
  dest="$OUT/$project/$base.jpg"
  if [ -f "$dest" ] && [ "$FORCE" != "--force" ]; then
    kept=$((kept + 1))
    continue
  fi

  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$video" 2>/dev/null)
  ok=0
  # Later and later, until something is bright enough to be worth showing.
  for frac in 0.15 0.35 0.55 0.75; do
    seek=$(awk -v d="${dur:-0}" -v f="$frac" 'BEGIN { s = d * f; if (s < 0.1 || s != s) s = 0.1; printf "%.3f", s }')
    ffmpeg -nostdin -v error -ss "$seek" -i "$video" \
      -vf "thumbnail=120,scale=640:-2:flags=lanczos" -frames:v 1 -q:v 6 -y "$dest" 2>/dev/null
    [ -s "$dest" ] || continue
    luma=$(luma_of "$dest")
    if awk -v l="${luma:-0}" -v m="$MIN_LUMA" 'BEGIN { exit !(l >= m) }'; then
      ok=1
      [ "$frac" = "0.15" ] || rescued=$((rescued + 1))
      break
    fi
  done

  if [ "$ok" = "1" ]; then
    made=$((made + 1))
  elif [ -s "$dest" ]; then
    # Genuinely a dark clip all the way through — keep the last attempt.
    made=$((made + 1))
    echo "  dark throughout: $rel"
  else
    echo "  FAILED: $rel"
    failed=$((failed + 1))
  fi
done < <(find "$ROOT" -name '*.mp4' -not -path "*/posters/*" | sort)

echo "posters written: $made (rescued from black: $rescued)   kept: $kept   failed: $failed"
