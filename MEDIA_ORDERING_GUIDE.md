# Media Ordering Control Guide

> **Legacy — describes the previous Vue site, not the current codebase.**
> Kept for reference to the old project data. See `README.md` for how the
> site works now.

## Overview
You can now control the order of videos and images within each section using the `mediaOrder` property in the layout configuration.

## Available Options

### `mediaOrder: 'videos-first'` (Default)
- Videos (with controls) appear first
- Silent videos appear second  
- Images appear last

### `mediaOrder: 'images-first'`
- Images appear first
- Videos (with controls) appear second
- Silent videos appear last

### `mediaOrder: 'mixed'` (Future Enhancement)
- Currently same as `videos-first`
- Future: Allow custom ordering of individual media items

## Usage Examples

### Images Before Videos (Mr. Takahashi Process Section)
```typescript
{
  id: 'process',
  title: 'Process',
  text: 'Your section description...',
  layout: {
    mediaPosition: 'below-text',
    mediaOrder: 'images-first' // Images will appear before videos
  },
  media: {
    silentVideos: ['Process_1.mp4', 'Process_2.mp4'],
    silentVideoLabels: ['• App intro', '• Lesson view'],
    images: ['Process_00.webp', 'Process_0.webp', 'Process_2.webp'],
    imageLabels: ['• App intro', '• Lesson view', '• Sign up Design']
  }
}
```

### Default Order (Videos First)
```typescript
{
  id: 'design',
  title: 'Design',
  text: 'Your section description...',
  layout: {
    mediaPosition: 'below-text'
    // mediaOrder defaults to 'videos-first'
  },
  media: {
    silentVideos: ['Design_1.mp4', 'Design_2.mp4'],
    images: ['Design_3.jpg', 'Design_4.jpg']
  }
}
```

## Media Rendering Order

### With `mediaOrder: 'images-first'`:
1. **Images** (all images first)
2. **Videos with controls** (all videos with controls)
3. **Silent videos** (all silent videos)

### With `mediaOrder: 'videos-first'` (default):
1. **Videos with controls** (all videos with controls)
2. **Silent videos** (all silent videos)  
3. **Images** (all images)

## Benefits
- ✅ **Flexible content flow** - Control visual hierarchy
- ✅ **Better storytelling** - Show images before videos or vice versa
- ✅ **Consistent ordering** - All videos together, all images together
- ✅ **Easy to configure** - Just add one property to your layout

## Current Implementation
The Mr. Takahashi "Process" section now uses `images-first` ordering, so the images will appear before the videos in that section!
