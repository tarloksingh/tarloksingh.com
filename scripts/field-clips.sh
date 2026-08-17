#!/bin/bash
# Build a tiny proxy of every project clip, into
# `src/assets/clips/<project>/<name>.mp4`.
#
# The home page's media field plays *all* of its cards at once, not a rationed
# few. That is only affordable because what it plays is not the case-study
# master — a card is a couple of hundred pixels wide on screen, so a 400px
# proxy at a coarse CRF is indistinguishable there and lands around 15-100 KB
# against the master's 1-8 MB.
#
# Audio is stripped: nothing in the field is ever unmuted, and an audio track
# the browser will never play still costs bandwidth and a decoder.
#
#   node scripts/media-manifest.mjs   # not needed — the proxy keeps the
#                                     # master's aspect, which is what the
#                                     # manifest records
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)/src/assets"
OUT="$ROOT/clips"
# Wide enough for the largest card the field ever draws on a retina display.
WIDTH=400
CRF=31
FORCE="${1:-}"
made=0 kept=0 failed=0

while IFS= read -r video; do
  rel="${video#"$ROOT"/}"          # capsule-c1/hero.mp4
  project="${rel%%/*}"
  base="$(basename "${rel#*/}")"
  base="${base%.*}"
  case "$project" in posters|clips) continue ;; esac

  mkdir -p "$OUT/$project"
  dest="$OUT/$project/$base.mp4"
  if [ -f "$dest" ] && [ "$FORCE" != "--force" ]; then
    kept=$((kept + 1))
    continue
  fi

  # `main` profile and yuv420p rather than whatever the master happened to be:
  # a 10-bit or high-profile stream is exactly the kind of thing a phone
  # refuses to decode in software, and a card that will not play is worse than
  # one that is slightly soft.
  if ffmpeg -nostdin -v error -i "$video" -an \
    -vf "scale=$WIDTH:-2:flags=lanczos" \
    -c:v libx264 -profile:v main -crf "$CRF" -preset slow \
    -pix_fmt yuv420p -movflags +faststart -y "$dest" 2>/dev/null && [ -s "$dest" ]; then
    made=$((made + 1))
  else
    echo "  FAILED: $rel"
    rm -f "$dest"
    failed=$((failed + 1))
  fi
done < <(find "$ROOT" -name '*.mp4' -not -path "*/posters/*" -not -path "*/clips/*" | sort)

total=$(du -sh "$OUT" 2>/dev/null | cut -f1)
echo "field clips written: $made   kept: $kept   failed: $failed   total: ${total:-0}"
