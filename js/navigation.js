// Add this to your main.js or create a new navigation.js file

document.addEventListener('DOMContentLoaded', function() {
    
    // Project page mapping
    const projectPages = {
        'capsule-c1': 'projects/capsule-c1/capsule-c1.html',
        'mr-takahashi': 'projects/mr-takahashi.html',
        'lovetap': 'projects/lovetap.html',
        'mecha-station': 'projects/mecha-station.html',
        'slider-engine': 'projects/slider-engine.html',
        'plus-one': 'projects/plus-one.html',
        'stitchfam': 'projects/stitchfam.html',
        'adam': 'projects/adam.html',
        'alcoholic-fish': 'projects/alcoholic-fish.html',
        'wyte-card': 'projects/wyte-card.html',
        'block-builder': 'projects/block-builder.html',
        'by-the-people': 'projects/by-the-people.html',
        'gala-reel': 'projects/gala-reel.html'
    };

    // Add click handlers to all project cards
    const projectCards = document.querySelectorAll('.project-card');
    
    projectCards.forEach(card => {
        const projectName = card.getAttribute('data-project');
        const expandButton = card.querySelector('.project-expand');
        
        if (projectName && projectPages[projectName]) {
            // Make the entire card clickable
            card.style.cursor = 'pointer';
            
            // Add click handler to the card
            card.addEventListener('click', function(e) {
                // Prevent navigation if clicking on the expand button specifically
                if (!e.target.closest('.project-expand')) {
                    window.location.href = projectPages[projectName];
                }
            });
            
            // Add click handler to expand button
            if (expandButton) {
                expandButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = projectPages[projectName];
                });
            }
        }
    });

    // Add hover effect for available projects
    projectCards.forEach(card => {
        const projectName = card.getAttribute('data-project');
        
        if (projectName && projectPages[projectName]) {
            card.classList.add('project-available');
        } else {
            card.classList.add('project-coming-soon');
            
            // Add coming soon indicator
            const expandButton = card.querySelector('.project-expand');
            if (expandButton) {
                expandButton.innerHTML = '<span class="expand-icon">Soon</span>';
                expandButton.style.fontSize = '10px';
                expandButton.style.pointerEvents = 'none';
            }
        }
    });

    // Audio Toggle Functionality
    const audioToggle = document.getElementById('audio-toggle');
    const demoVideo = document.getElementById('demo-video');
    
    if (audioToggle && demoVideo) {
        audioToggle.addEventListener('click', function() {
            if (demoVideo.muted) {
                demoVideo.muted = false;
                audioToggle.classList.add('audio-on');
            } else {
                demoVideo.muted = true;
                audioToggle.classList.remove('audio-on');
            }
        });
    }

});