# Project Structure Guide

> **Legacy — describes the previous Vue site, not the current codebase.**
> Kept for reference to the old project data. See `README.md` for how the
> site works now.

## How to Add/Edit Projects

### 1. Basic Project Structure
```typescript
'your-project-id': {
  // Required fields
  title: 'Project Name',
  designerType: 'Your Role',
  companyName: 'Company Name',
  description: 'Project description...',
  roles: ['Role 1', 'Role 2', 'Role 3'],
  designDescription: 'Design process description...',
  
  // Dynamic sections (add/remove as needed)
  sections: [
    {
      id: 'section-name',
      title: 'Section Title',
      text: 'Optional description text'
    }
  ],
  
  // Media (only add what you have)
  media: {
    // Hero media
    heroVideo: 'hero-video.mp4',
    heroVideoLabel: 'Hero Video Label',
    
    // Design section media
    designVideos: ['design1.mp4', 'design2.mp4'],
    designVideoLabels: ['Design Video 1', 'Design Video 2'],
    designImages: ['design1.jpg', 'design2.jpg'],
    designImageLabels: ['Design Image 1', 'Design Image 2'],
    designSilentVideos: ['animation1.mp4'],
    designSilentVideoLabels: ['Animation 1'],
    
    // Section-specific media (only add for sections that have content)
    brandingVideos: ['branding1.mp4'],
    brandingVideoLabels: ['Branding Video 1'],
    brandingImages: ['branding1.jpg'],
    brandingImageLabels: ['Branding Image 1'],
    brandingSilentVideos: ['branding-anim.mp4'],
    brandingSilentVideoLabels: ['Branding Animation'],
    
    challengesVideos: ['challenge1.mp4'],
    challengeVideoLabels: ['Challenge Video 1'],
    challengesImages: ['challenge1.jpg'],
    challengeImageLabels: ['Challenge Image 1'],
    challengesSilentVideos: ['challenge-anim.mp4'],
    challengeSilentVideoLabels: ['Challenge Animation']
  }
}
```

### 2. Section Types

#### Regular Section
```typescript
{
  id: 'features',
  title: 'Key Features',
  text: 'Description of the features...'
}
```

#### Branding Section (with color palette)
```typescript
{
  id: 'branding',
  title: 'Branding',
  showColorPalette: true
}
```

#### Custom Section
```typescript
{
  id: 'user-research',
  title: 'User Research',
  text: 'How we conducted user research...'
}
```

### 3. Media Organization

#### For each section, you can add:
- `videos[]` - Videos with controls and audio
- `silentVideos[]` - Videos without controls, just looping
- `images[]` - Static images
- `videoLabels[]` - Labels for videos
- `silentVideoLabels[]` - Labels for silent videos  
- `imageLabels[]` - Labels for images

#### Media naming convention:
- `brandingVideos` + `brandingVideoLabels`
- `challengesVideos` + `challengeVideoLabels`
- `featuresVideos` + `featuresVideoLabels` (for custom sections)

### 4. Example: Complete Project

```typescript
'my-awesome-project': {
  title: 'My Awesome Project',
  designerType: 'Product Designer',
  companyName: 'My Company',
  description: 'A revolutionary app that changes everything...',
  roles: ['UX Design', 'UI Design', 'Research', 'Prototyping'],
  designDescription: 'The design process focused on user-centered design...',
  
  sections: [
    {
      id: 'research',
      title: 'User Research',
      text: 'We conducted 50+ user interviews to understand pain points...'
    },
    {
      id: 'branding',
      title: 'Branding',
      showColorPalette: true
    },
    {
      id: 'prototyping',
      title: 'Prototyping Process',
      text: 'Created interactive prototypes to test user flows...'
    }
  ],
  
  media: {
    heroVideo: 'hero-demo.mp4',
    heroVideoLabel: 'Product Demo • User Interface • Key Features',
    
    designVideos: ['design-process.mp4'],
    designVideoLabels: ['Design Process Walkthrough'],
    designImages: ['wireframes.jpg', 'mockups.jpg'],
    designImageLabels: ['Initial Wireframes', 'High-Fidelity Mockups'],
    
    brandingVideos: ['brand-animation.mp4'],
    brandingVideoLabels: ['Brand Animation'],
    brandingImages: ['logo-variations.jpg'],
    brandingImageLabels: ['Logo Variations'],
    
    challengesVideos: ['challenge-solution.mp4'],
    challengeVideoLabels: ['Challenge & Solution'],
    challengesImages: ['user-feedback.jpg'],
    challengeImageLabels: ['User Feedback Analysis']
  }
}
```

### 5. Quick Tips

1. **Only add media arrays for sections that have content**
2. **Use descriptive labels for all media**
3. **Keep section IDs simple and consistent**
4. **Add text to sections that need explanation**
5. **Use `showColorPalette: true` only for branding sections**

### 6. Common Section Ideas

- `research` - User Research
- `branding` - Branding (with color palette)
- `features` - Key Features
- `challenges` - Challenges & Solutions
- `process` - Design Process
- `testing` - User Testing
- `results` - Results & Impact
- `technical` - Technical Implementation
