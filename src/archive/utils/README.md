# Animation Library

A reusable collection of GSAP-powered animations for web projects.

## Installation

1. Copy the `animations.ts` file to your project
2. Install GSAP: `npm install gsap`
3. Import and use the animations

## Available Animations

### 1. Letter-by-Letter Animation

Animates text character by character with highlight effects.

```typescript
import { letterByLetterAnimation } from "./animations";

// Basic usage
await letterByLetterAnimation(element);

// Custom options
await letterByLetterAnimation(element, {
  duration: 0.6,
  delay: 0.1,
  highlightColor: "#ff6b6b",
  returnColor: "#333",
});
```

### 2. Rotating Text Animation

Creates a rotating text effect with entrance/exit animations.

```typescript
import { rotatingTextAnimation } from "./animations";

// Start animation
const stopAnimation = rotatingTextAnimation(element, {
  words: ["design", "develop", "deploy"],
  cycleDelay: 3.0,
});

// Stop animation when needed
stopAnimation();
```

### 3. Fade In Animation

Simple fade-in effect for elements.

```typescript
import { fadeInAnimation } from "./animations";

await fadeInAnimation(element, {
  duration: 0.8,
  startY: 30,
});
```

### 4. Stagger Animation

Animates multiple elements with staggered timing.

```typescript
import { staggerAnimation } from "./animations";

const elements = document.querySelectorAll(".item");
await staggerAnimation(Array.from(elements), {
  delay: 0.1,
});
```

### 5. Typewriter Animation

Creates a typewriter effect.

```typescript
import { typewriterAnimation } from "./animations";

await typewriterAnimation(element, {
  delay: 0.05,
});
```

## Configuration Options

### LetterAnimationOptions

- `duration`: Animation duration in seconds (default: 0.4)
- `delay`: Delay between elements in seconds (default: 0.08)
- `ease`: GSAP easing function (default: "power2.out")
- `startY`: Starting Y position (default: 20)
- `highlightColor`: Highlight color (default: '#32CD32')
- `returnColor`: Return color (default: '#000000')

### RotatingTextOptions

- `words`: Array of words to rotate through
- `cycleDelay`: Pause between words in seconds (default: 2.0)
- `letterDelay`: Delay between letters in seconds (default: 0.08)
- `highlightColor`: Highlight color (default: '#32CD32')
- `returnColor`: Return color (default: '#000000')

## Usage Examples

### Vue 3 Composition API

```vue
<script setup>
import { onMounted, ref } from "vue";
import { letterByLetterAnimation } from "@/utils/animations";

const titleRef = ref();

onMounted(async () => {
  if (titleRef.value) {
    await letterByLetterAnimation(titleRef.value);
  }
});
</script>

<template>
  <h1 ref="titleRef">Animated Title</h1>
</template>
```

### React

```tsx
import { useEffect, useRef } from "react";
import { letterByLetterAnimation } from "./animations";

function AnimatedTitle() {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (titleRef.current) {
      letterByLetterAnimation(titleRef.current);
    }
  }, []);

  return <h1 ref={titleRef}>Animated Title</h1>;
}
```

### Vanilla JavaScript

```javascript
import { letterByLetterAnimation } from "./animations";

document.addEventListener("DOMContentLoaded", async () => {
  const title = document.querySelector(".title");
  if (title) {
    await letterByLetterAnimation(title);
  }
});
```

## Customization

You can easily customize the default options by modifying the `defaultLetterOptions` and `defaultRotatingOptions` objects in the animations file.

## Dependencies

- GSAP (GreenSock Animation Platform)
- TypeScript (for type definitions)

## Browser Support

Works in all modern browsers that support ES6+ and CSS transforms.
