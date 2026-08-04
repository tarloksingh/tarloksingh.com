# Layout Control Guide

> **Legacy — describes the previous Vue site, not the current codebase.**
> Kept for reference to the old project data. See `README.md` for how the
> site works now.

## 🎯 Complete Layout Control from JSON

You now have **complete control** over section layout from the JSON! No HTML changes needed.

## 📐 Layout Options

### Media Position Options
```typescript
layout: {
  mediaPosition: 'above-title' | 'below-title' | 'above-text' | 'below-text' | 'above-color-palette' | 'below-color-palette'
}
```

### Text Position Options
```typescript
layout: {
  textPosition: 'above-media' | 'below-media'
}
```

### Color Palette Position Options
```typescript
layout: {
  colorPalettePosition: 'above-media' | 'below-media'
}
```

## 🎨 Layout Examples

### 1. Media Above Title
```typescript
{
  id: 'hero-section',
  title: 'Project Overview',
  layout: {
    mediaPosition: 'above-title'
  },
  media: {
    videos: ['hero-demo.mp4'],
    videoLabels: ['Project Demo']
  }
}
```
**Result:** Video → Title

### 2. Media Below Title
```typescript
{
  id: 'features',
  title: 'Key Features',
  layout: {
    mediaPosition: 'below-title'
  },
  media: {
    images: ['feature1.jpg', 'feature2.jpg'],
    imageLabels: ['Feature 1', 'Feature 2']
  }
}
```
**Result:** Title → Images

### 3. Text Above Media
```typescript
{
  id: 'process',
  title: 'Design Process',
  text: 'Here\'s how we approached the design...',
  layout: {
    textPosition: 'above-media'
  },
  media: {
    videos: ['process-walkthrough.mp4'],
    videoLabels: ['Process Walkthrough']
  }
}
```
**Result:** Title → Text → Video

### 4. Text Below Media
```typescript
{
  id: 'gallery',
  title: 'Design Gallery',
  text: 'These designs showcase our creative process...',
  layout: {
    textPosition: 'below-media'
  },
  media: {
    images: ['design1.jpg', 'design2.jpg'],
    imageLabels: ['Design 1', 'Design 2']
  }
}
```
**Result:** Title → Images → Text

### 5. Color Palette Above Media
```typescript
{
  id: 'branding',
  title: 'Branding',
  showColorPalette: true,
  layout: {
    colorPalettePosition: 'above-media'
  },
  media: {
    images: ['logo-variations.jpg'],
    imageLabels: ['Logo Variations']
  }
}
```
**Result:** Title → Color Palette → Images

### 6. Color Palette Below Media
```typescript
{
  id: 'branding',
  title: 'Branding',
  showColorPalette: true,
  layout: {
    colorPalettePosition: 'below-media'
  },
  media: {
    images: ['brand-guidelines.jpg'],
    imageLabels: ['Brand Guidelines']
  }
}
```
**Result:** Title → Images → Color Palette

## 🎯 Complete Layout Combinations

### Media Above Everything
```typescript
{
  id: 'hero-content',
  title: 'Project Hero',
  text: 'This project showcases...',
  layout: {
    mediaPosition: 'above-title'
  },
  media: {
    videos: ['hero-video.mp4'],
    videoLabels: ['Hero Video']
  }
}
```
**Result:** Video → Title → Text

### Media Below Everything
```typescript
{
  id: 'conclusion',
  title: 'Project Conclusion',
  text: 'In summary, this project...',
  layout: {
    mediaPosition: 'below-text'
  },
  media: {
    images: ['final-result.jpg'],
    imageLabels: ['Final Result']
  }
}
```
**Result:** Title → Text → Images

### Text Above Media
```typescript
{
  id: 'explanation',
  title: 'How It Works',
  text: 'The system works by...',
  layout: {
    textPosition: 'above-media'
  },
  media: {
    videos: ['how-it-works.mp4'],
    videoLabels: ['How It Works Demo']
  }
}
```
**Result:** Title → Text → Video

### Text Below Media
```typescript
{
  id: 'showcase',
  title: 'Design Showcase',
  text: 'These designs represent...',
  layout: {
    textPosition: 'below-media'
  },
  media: {
    images: ['showcase1.jpg', 'showcase2.jpg'],
    imageLabels: ['Showcase 1', 'Showcase 2']
  }
}
```
**Result:** Title → Images → Text

## 🚀 Real-World Examples

### Portfolio Project Structure
```typescript
sections: [
  {
    id: 'hero',
    title: 'Project Overview',
    layout: {
      mediaPosition: 'above-title'
    },
    media: {
      videos: ['hero-demo.mp4'],
      videoLabels: ['Project Demo']
    }
  },
  {
    id: 'research',
    title: 'User Research',
    text: 'We conducted 50+ user interviews...',
    layout: {
      textPosition: 'above-media'
    },
    media: {
      images: ['research1.jpg', 'research2.jpg'],
      imageLabels: ['Research Setup', 'Findings']
    }
  },
  {
    id: 'branding',
    title: 'Branding',
    showColorPalette: true,
    layout: {
      colorPalettePosition: 'above-media'
    },
    media: {
      images: ['logo-variations.jpg'],
      imageLabels: ['Logo Variations']
    }
  },
  {
    id: 'features',
    title: 'Key Features',
    text: 'The app includes three main features...',
    layout: {
      mediaPosition: 'below-text'
    },
    media: {
      videos: ['feature-demo.mp4'],
      videoLabels: ['Feature Demo']
    }
  },
  {
    id: 'gallery',
    title: 'Design Gallery',
    text: 'These designs showcase our creative process...',
    layout: {
      textPosition: 'below-media'
    },
    media: {
      images: ['design1.jpg', 'design2.jpg', 'design3.jpg'],
      imageLabels: ['Design 1', 'Design 2', 'Design 3']
    }
  }
]
```

## 🎨 Layout Patterns

### 1. Hero Section Pattern
```typescript
layout: {
  mediaPosition: 'above-title'
}
```
**Use for:** Project intros, hero content

### 2. Explanation Pattern
```typescript
layout: {
  textPosition: 'above-media'
}
```
**Use for:** Explaining concepts before showing media

### 3. Showcase Pattern
```typescript
layout: {
  textPosition: 'below-media'
}
```
**Use for:** Showing media first, then explaining

### 4. Branding Pattern
```typescript
layout: {
  colorPalettePosition: 'above-media'
}
```
**Use for:** Branding sections with color palettes

### 5. Gallery Pattern
```typescript
layout: {
  mediaPosition: 'below-title'
}
```
**Use for:** Image galleries, design showcases

## 🔧 Quick Tips

1. **No layout specified** = Default layout (Title → Text → Color Palette → Media)
2. **Mix and match** - Combine different layout options
3. **Test different layouts** - Try different combinations to see what works best
4. **Consistent patterns** - Use similar layouts for similar content types
5. **Mobile responsive** - All layouts work on mobile and desktop

## 🎯 Benefits

✅ **Complete Control** - Layout everything from JSON
✅ **No HTML Changes** - Add new layouts without touching templates
✅ **Flexible** - Mix and match layout options
✅ **Consistent** - Use patterns across projects
✅ **Easy to Update** - Change layouts instantly from JSON

Now you have complete control over section layout from the JSON! 🎯✨
