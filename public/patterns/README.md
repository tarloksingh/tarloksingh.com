# `supertile.webp`

The site-wide background pattern (`.site-pattern` in `src/site/tokens.css`).
1440×1080 — two 720×1080 columns side by side, the right one rolled half a
tile-height so the two columns repeat out of phase and the grid doesn't read
as a grid. See the comment on `.site-pattern` for why.

To regenerate from a new source image (ImageMagick, run from this
directory):

```sh
SRC=/path/to/source.png   # ideally a 2:3 portrait, or crop to one first

convert "$SRC" -fuzz 20% -trim +repage \
        -gravity center -crop 92x92%+0+0 +repage \
        -resize 720x1080! tile.png
convert tile.png -roll +0+540 tile_shift.png
convert tile.png tile_shift.png +append supertile.png
convert supertile.png -quality 88 supertile.webp
rm tile.png tile_shift.png supertile.png
```

The `-trim` and the 92% crop are what make the joins invisible, and they are
not optional. A drawing on paper has a lighter border than its middle — this
one measured 204–228 against an interior of 185 — and tiling it puts two of
those borders back to back, which reads as a pale gap running through the
pattern every repeat. Trimming takes off the blank margin; the crop then goes
far enough *into* the art that the new edges land at the interior's own
density. Measured on this source, 3% was already enough and 4% has margin.

Do not try to fix this by compositing the tile with a rolled copy of itself
(`-compose darken`). It does close the seam, but it lays every drawing over a
ghost of another one and the artwork stops being readable — which is the whole
reason for using this image.

## Checking the tile is actually seamless

`background-repeat` only ever looks seamless if the file's own edges match —
CSS can't paper over a real gap. To check both joins directly (not just by
eye at low opacity, where a real gap and a sparse patch of the art look
alike):

```sh
Eyeballing it at 4% opacity is useless — a real gap and a sparse patch of the
art look identical. Measure instead. Mean brightness of thin strips either
side of each join should sit within a few levels of each other and of the
whole image; a spike is a seam.

```sh
mean() { convert supertile.webp -crop "$1" +repage -format "%[fx:int(mean*255)]\n" info:; }

convert supertile.webp -format "whole %[fx:int(mean*255)]\n" info:

# the internal join, where the two columns meet (x = tile width, 720 above)
for x in 690 710 718 722 730 750; do echo -n "x=$x "; mean "4x1080+$x+0"; done

# the wrap join: the right edge, then the left edge it will sit against
for x in 1410 1436 0 30; do echo -n "x=$x "; mean "4x1080+$x+0"; done

# the vertical wrap: the bottom edge, then the top edge
for y in 1050 1076 0 30; do echo -n "y=$y "; mean "1440x4+0+$y"; done
```

For reference, the shipped tile reads ~180–190 at every join against a whole
image of ~182. The version before the crop spiked to 243 at the internal
join, which was visible.
