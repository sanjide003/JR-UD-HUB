// index.js - Video & Animation Fix

import { db } from './firebase-config.js';
import { 
    collection, getDocs, doc, getDoc, query, orderBy, setLogLevel 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { loadSiteSettings, optimizeImage } from './common.js'; 

setLogLevel('Silent');

document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings();
    loadHeroSlider();
    // ... (മറ്റ് ലോഡിംഗ് ഫംഗ്ഷനുകൾ പഴയതുപോലെ) ...
    // Note: താഴെയുള്ളവ പഴയതുപോലെ നിലനിർത്തുക
    setupScrollAnimations();
});

function setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
}

async function loadHeroSlider() {
    const wrapper = document.getElementById('hero-slider-wrapper');
    if (!wrapper) return;
    
    try {
        const q = query(collection(db, "heroSlides"), orderBy("order"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            wrapper.innerHTML = `<div class="swiper-slide"><img src="https://placehold.co/800x600/121212/D4AF37?text=JR-UD-HUB" alt="Hero"></div>`;
        } else {
            wrapper.innerHTML = '';
            snapshot.forEach((doc) => {
                const s = doc.data();
                const slide = document.createElement('div');
                slide.className = 'swiper-slide';

                if (s.type === 'video') {
                    let videoHtml = '';
                    
                    // 1. YouTube (Standard & Shorts)
                    if(s.url.includes('youtube') || s.url.includes('youtu.be')) {
                        let vidId = '';
                        if(s.url.includes('v=')) vidId = s.url.split('v=')[1].split('&')[0];
                        else if(s.url.includes('shorts/')) vidId = s.url.split('shorts/')[1].split('?')[0];
                        else vidId = s.url.split('/').pop();
                        
                        videoHtml = `<iframe src="https://www.youtube.com/embed/${vidId}?autoplay=1&mute=1&loop=1&playlist=${vidId}&controls=0&playsinline=1&rel=0" frameborder="0" allow="autoplay; encrypted-media" style="width:100%;height:100%;pointer-events:none;"></iframe>`;
                    } 
                    // 2. Google Drive Video
                    else if (s.url.includes('drive.google.com')) {
                        let id = '';
                        if(s.url.includes('/d/')) id = s.url.split('/d/')[1].split('/')[0];
                        if(id) {
                            // Drive Preview Link inside iframe
                            videoHtml = `<iframe src="https://drive.google.com/file/d/${id}/preview" style="width:100%;height:100%;border:0;"></iframe>`;
                        }
                    }
                    // 3. Direct MP4
                    else {
                        videoHtml = `<video src="${s.url}" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;"></video>`;
                    }
                    slide.innerHTML = videoHtml;
                } else {
                    slide.innerHTML = `<img src="${optimizeImage(s.url, 1200, 90)}" alt="Slide" loading="lazy">`;
                }
                wrapper.appendChild(slide);
            });
        }

        new Swiper('.hero-slider-new', {
            loop: true,
            speed: 1000,
            autoplay: { delay: 5000, disableOnInteraction: false },
            pagination: { el: '.hero-pagination-dots', clickable: true },
            effect: 'fade',
            fadeEffect: { crossFade: true }
        });

    } catch (error) { console.error("Slider Error", error); }
}