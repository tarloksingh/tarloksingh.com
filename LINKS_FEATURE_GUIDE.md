# Links Feature Guide

## Overview
You can now add clickable links to any section in your portfolio projects. These links appear as clean, highlighted blue text that matches your section text styling.

## How to Add Links

### 1. Add to Section Data
```typescript
{
  id: 'process',
  title: 'Process & Challenges',
  text: 'Your section description...',
  media: {
    images: ['Process.png', 'shelf_label0.png']
  },
  links: [
    {
      type: 'download',
      label: 'Download Design Specs (PDF)',
      url: '/downloads/mecha-station-specs.pdf'
    },
    {
      type: 'external',
      label: 'View Live Demo',
      url: 'https://mecha-station-demo.com'
    },
    {
      type: 'github',
      label: 'Source Code',
      url: 'https://github.com/yourusername/mecha-station'
    }
  ]
}
```

## Link Types

### `download`
- **Purpose**: File downloads (PDFs, ZIPs, etc.)
- **Behavior**: Triggers download when clicked

### `external`
- **Purpose**: External websites
- **Behavior**: Opens in new tab

### `github`
- **Purpose**: GitHub repositories
- **Behavior**: Opens in new tab

### `demo`
- **Purpose**: Live demos or interactive experiences
- **Behavior**: Opens in new tab

## Features
- ✅ **Clean design** - Simple blue underlined links
- ✅ **Matches section text** - Same font, size, and styling
- ✅ **Hover effects** - Darker blue on hover
- ✅ **Download support** - Proper download attributes for files
- ✅ **External links** - Open in new tab
- ✅ **Left-aligned** - Appears below section text

## Examples in Your Projects

### Mecha Station - Process & Challenges
- Download Design Specs (PDF)
- View Live Demo
- Source Code

### Slider Engine - Design
- Try Slider Engine
- GitHub Repository
- Documentation

## Styling
The links appear as:
- Blue underlined text (#007bff)
- Same font styling as section text
- Vertical stack below section content
- Hover effect (darker blue #0056b3)
- Clean, minimal design
