# Complete Data-Driven Portfolio Guide

## 🎯 Overview
Your portfolio is now **100% data-driven**. Everything is controlled from the JSON - sections, media, text, and layout. No HTML changes needed!

## 📋 Project Structure

### Basic Project Template
```typescript
'your-project-id': {
  // ===== REQUIRED FIELDS =====
  title: 'Project Name',
  designerType: 'Your Role',
  companyName: 'Company Name',
  description: 'Project description...',
  roles: ['Role 1', 'Role 2', 'Role 3'],
  designDescription: 'Design process description...',
  
  // ===== DYNAMIC SECTIONS =====
  sections: [
    {
      id: 'section-name',
      title: 'Section Title',
      text: 'Optional description text',
      showColorPalette: true, // Only for branding sections
      media: {
        videos: ['video1.mp4', 'video2.mp4'],
        videoLabels: ['Video 1 Label', 'Video 2 Label'],
        silentVideos: ['silent1.mp4'],
        silentVideoLabels: ['Silent Video Label'],
        images: ['image1.jpg', 'image2.jpg'],
        imageLabels: ['Image 1 Label', 'Image 2 Label']
      }
    }
  ],
  
  // ===== HERO MEDIA =====
  media: {
    heroVideo: 'hero-video.mp4',
    heroVideoLabel: 'Hero Video Label',
    // OR
    heroImage: 'hero-image.jpg',
    heroImageLabel: 'Hero Image Label'
  }
}
```

## 🎨 Section Types

### 1. Regular Section (with text and media)
```typescript
{
  id: 'features',
  title: 'Key Features',
  text: 'Description of the features and how they work...',
  media: {
    videos: ['feature-demo.mp4'],
    videoLabels: ['Feature Demo'],
    images: ['feature1.jpg', 'feature2.jpg'],
    imageLabels: ['Feature 1', 'Feature 2']
  }
}
```

### 2. Branding Section (with color palette)
```typescript
{
  id: 'branding',
  title: 'Branding',
  showColorPalette: true,
  media: {
    silentVideos: ['brand-animation.mp4'],
    silentVideoLabels: ['Brand Animation'],
    images: ['logo-variations.jpg'],
    imageLabels: ['Logo Variations']
  }
}
```

### 3. Text-Only Section
```typescript
{
  id: 'research',
  title: 'User Research',
  text: 'We conducted 50+ user interviews to understand pain points...'
  // No media = no media section shown
}
```

### 4. Media-Only Section
```typescript
{
  id: 'gallery',
  title: 'Design Gallery',
  media: {
    images: ['design1.jpg', 'design2.jpg', 'design3.jpg'],
    imageLabels: ['Design 1', 'Design 2', 'Design 3']
  }
  // No text = no description shown
}
```

## 🎬 Media Types

### Videos (with controls and audio)
```typescript
media: {
  videos: ['demo.mp4', 'walkthrough.mp4'],
  videoLabels: ['Product Demo', 'User Walkthrough']
}
```

### Silent Videos (looping, no controls)
```typescript
media: {
  silentVideos: ['animation.mp4', 'process.mp4'],
  silentVideoLabels: ['Loading Animation', 'Design Process']
}
```

### Images
```typescript
media: {
  images: ['screenshot1.jpg', 'mockup1.jpg'],
  imageLabels: ['Mobile Screenshot', 'Desktop Mockup']
}
```

## 📝 Complete Example

```typescript
'my-awesome-project': {
  // Basic Info
  title: 'My Awesome Project',
  designerType: 'Product Designer',
  companyName: 'My Company',
  description: 'A revolutionary app that changes everything...',
  roles: ['UX Design', 'UI Design', 'Research', 'Prototyping'],
  designDescription: 'The design process focused on user-centered design...',
  
  // Dynamic Sections
  sections: [
    {
      id: 'research',
      title: 'User Research',
      text: 'We conducted 50+ user interviews to understand pain points and validate our assumptions.',
      media: {
        images: ['research1.jpg', 'research2.jpg'],
        imageLabels: ['User Interview Setup', 'Research Findings']
      }
    },
    {
      id: 'branding',
      title: 'Branding',
      showColorPalette: true,
      media: {
        silentVideos: ['brand-animation.mp4'],
        silentVideoLabels: ['Brand Animation'],
        images: ['logo-variations.jpg', 'color-palette.jpg'],
        imageLabels: ['Logo Variations', 'Color Palette']
      }
    },
    {
      id: 'features',
      title: 'Key Features',
      text: 'The app includes three main features that solve core user problems.',
      media: {
        videos: ['feature-demo.mp4'],
        videoLabels: ['Feature Demo'],
        images: ['feature1.jpg', 'feature2.jpg', 'feature3.jpg'],
        imageLabels: ['Feature 1', 'Feature 2', 'Feature 3']
      }
    },
    {
      id: 'challenges',
      title: 'Challenges & Solutions',
      text: 'The main challenge was balancing simplicity with powerful features.',
      media: {
        images: ['challenge1.jpg', 'solution1.jpg'],
        imageLabels: ['The Challenge', 'Our Solution']
      }
    },
    {
      id: 'results',
      title: 'Results',
      text: 'The project resulted in a 40% increase in user engagement.',
      media: {
        images: ['results-chart.jpg'],
        imageLabels: ['Engagement Metrics']
      }
    }
  ],
  
  // Hero Media
  media: {
    heroVideo: 'hero-demo.mp4',
    heroVideoLabel: 'Product Demo • Key Features • User Interface'
  }
}
```

## 🚀 How to Add New Projects

### Step 1: Copy the template
```typescript
'new-project-id': {
  title: 'New Project',
  designerType: 'Your Role',
  companyName: 'Company',
  description: 'Description...',
  roles: ['Role 1', 'Role 2'],
  designDescription: 'Design process...',
  sections: [],
  media: {}
}
```

### Step 2: Add sections
```typescript
sections: [
  {
    id: 'section1',
    title: 'Section 1',
    text: 'Description...',
    media: {
      images: ['image1.jpg'],
      imageLabels: ['Image 1']
    }
  }
]
```

### Step 3: Add hero media
```typescript
media: {
  heroVideo: 'hero.mp4',
  heroVideoLabel: 'Hero Video Label'
}
```

## 🎯 Benefits

✅ **100% Data-Driven** - Everything controlled from JSON
✅ **No HTML Changes** - Add projects without touching templates
✅ **Flexible Sections** - Add/remove sections as needed
✅ **Media Control** - Place media exactly where you want it
✅ **Scalable** - Easy to add new projects and sections
✅ **Clean Structure** - Only include what you actually use

## 📁 File Organization

```
src/assets/
├── project-1/
│   ├── hero-video.mp4
│   ├── image1.jpg
│   └── video1.mp4
├── project-2/
│   ├── hero-image.jpg
│   ├── design1.jpg
│   └── demo.mp4
└── project-3/
    ├── hero.mp4
    └── gallery1.jpg
```

## 🔧 Quick Tips

1. **Section IDs** - Use simple, descriptive names (no spaces)
2. **Media Labels** - Always provide descriptive labels
3. **File Names** - Use descriptive names for your media files
4. **Empty Sections** - Don't include `media` if section has no media
5. **Text Only** - Don't include `text` if section has no description

## 🎨 Common Section Ideas

- `research` - User Research
- `branding` - Branding (with color palette)
- `features` - Key Features
- `process` - Design Process
- `challenges` - Challenges & Solutions
- `testing` - User Testing
- `results` - Results & Impact
- `gallery` - Design Gallery
- `technical` - Technical Implementation
- `future` - Future Plans

Now you have complete control over your portfolio content from the JSON! 🎯✨
