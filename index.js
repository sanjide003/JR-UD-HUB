// Enhanced Shopping App with Premium Animations - index.js

import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    query, 
    where, 
    limit, 
    orderBy, 
    setLogLevel 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { loadSiteSettings, optimizeImage } from './common.js'; 
import { addToCart, isItemInCart, removeFromCart } from './cart.js';

setLogLevel('Debug');

document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings();
    initPageLoader();
    loadHomeBanner(); 
    loadHeroSlider();
    loadTopSellers();
    loadHomeCategories();
    
    setupScrollReveal();
    setupParallaxEffects();
    setupFloatingElements();
    document.documentElement.style.scrollBehavior = 'smooth';
});

/**
 * Page Loader Animation
 */
function initPageLoader() {
    const loader = document.createElement('div');
    loader.className = 'page-loader';
    loader.innerHTML = `
        <div class="loader-content">
            <div class="loader-spinner"></div>
            <div class="loader-text">Al Ambar</div>
        </div>
    `;
    document.body.appendChild(loader);
    
    window.addEventListener('load', () => {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 500);
        }, 800);
    });
}

/**
 * Enhanced Scroll Reveal Animation
 */
function setupScrollReveal() {
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -100px 0px',
        threshold: [0, 0.1, 0.5]
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.delay || 0;
                setTimeout(() => {
                    entry.target.classList.add('revealed');
                }, delay);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const sections = document.querySelectorAll('.home-section, .hero-text-section');
    sections.forEach((section, index) => {
        section.classList.add('scroll-reveal');
        section.dataset.delay = index * 100;
        observer.observe(section);
    });
}

/**
 * Parallax Effects
 */
function setupParallaxEffects() {
    let ticking = false;
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrolled = window.pageYOffset;
                
                // Hero parallax
                const hero = document.querySelector('.hero-slider-new');
                if (hero) {
                    hero.style.transform = `translateY(${scrolled * 0.5}px)`;
                }
                
                // Category grid subtle parallax
                const categorySection = document.querySelector('.home-category-grid-wrapper');
                if (categorySection) {
                    const rect = categorySection.getBoundingClientRect();
                    if (rect.top < window.innerHeight && rect.bottom > 0) {
                        const offset = (window.innerHeight - rect.top) * 0.1;
                        categorySection.style.transform = `translateY(${-offset}px)`;
                    }
                }
                
                ticking = false;
            });
            ticking = true;
        }
    });
}

/**
 * Floating Elements Animation
 */
function setupFloatingElements() {
    const floatingShapes = document.createElement('div');
    floatingShapes.className = 'floating-shapes';
    
    for (let i = 0; i < 5; i++) {
        const shape = document.createElement('div');
        shape.className = 'floating-shape';
        shape.style.left = `${Math.random() * 100}%`;
        shape.style.animationDelay = `${Math.random() * 5}s`;
        shape.style.animationDuration = `${15 + Math.random() * 10}s`;
        floatingShapes.appendChild(shape);
    }
    
    document.body.appendChild(floatingShapes);
}

/**
 * Home Banner with Animation
 */
async function loadHomeBanner() {
    const bannerContainer = document.getElementById('home-top-banner');
    if (!bannerContainer) return;

    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().homeBannerUrl) {
            const bannerUrl = docSnap.data().homeBannerUrl;
            const optimizedUrl = optimizeImage(bannerUrl, 1200, 85);
            
            bannerContainer.innerHTML = `
                <div class="banner-wrapper animate-fade-in">
                    <img src="${optimizedUrl}" alt="Special Offer Banner" loading="lazy">
                    <div class="banner-overlay"></div>
                </div>
            `;
            bannerContainer.style.display = 'block';
        } else {
            bannerContainer.style.display = 'none';
        }
    } catch (error) {
        console.error("Error loading home banner: ", error);
        bannerContainer.style.display = 'none';
    }
}

/**
 * Enhanced Hero Slider
 */
async function loadHeroSlider() {
    const sliderWrapper = document.getElementById('hero-slider-wrapper');
    if (!sliderWrapper) return;
    
    try {
        const q = query(collection(db, "heroSlides"), orderBy("order"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            sliderWrapper.innerHTML = `
                <div class="swiper-slide">
                    <img src="https://placehold.co/600x800/000000/D4AF37?text=Al+Ambar" alt="Placeholder">
                    <div class="slide-overlay"></div>
                </div>
            `;
        } else {
            sliderWrapper.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const slide = doc.data();
                const slideEl = document.createElement('div');
                slideEl.className = 'swiper-slide';

                let isVideo = slide.type === 'video';
                let videoId = '';
                let embedUrl = '';
                let finalUrl = slide.url;

                if (isVideo && slide.url.includes('drive.google.com') && slide.url.includes('/d/')) {
                    try {
                        const id = slide.url.split('/d/')[1].split('/')[0];
                        finalUrl = `https://drive.google.com/uc?export=download&id=${id}`;
                    } catch(e) {}
                } 
                else if (slide.url.includes('youtube.com/watch?v=')) {
                    videoId = new URL(slide.url).searchParams.get('v');
                    isVideo = true;
                }
                else if (slide.url.includes('youtube.com/shorts/')) {
                    videoId = new URL(slide.url).pathname.split('/shorts/')[1];
                    isVideo = true;
                }

                if (videoId) {
                    embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&showinfo=0&playsinline=1&autoplay=1`;
                }

                if (slide.type === 'image') {
                    const optimizedHeroImg = optimizeImage(slide.url, 800, 85);
                    slideEl.innerHTML = `
                        <img src="${optimizedHeroImg}" alt="Hero Image" loading="lazy" class="hero-image-enhanced">
                        <div class="slide-overlay"></div>
                        <div class="slide-content-overlay">
                            <div class="slide-text animate-slide-up"></div>
                        </div>
                    `;
                }
                else if (isVideo && embedUrl) {
                    slideEl.innerHTML = `
                        <iframe class="hero-video-iframe" src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
                        <div class="slide-overlay"></div>
                    `;
                }
                else if (isVideo) {
                    slideEl.innerHTML = `
                        <video class="hero-video-element" src="${finalUrl}" autoplay muted loop playsinline preload="auto"></video>
                        <div class="slide-overlay"></div>
                    `;
                }
                
                sliderWrapper.appendChild(slideEl);
            });
        }

        const heroSwiper = new Swiper('.hero-slider-new', {
            loop: true, 
            effect: 'creative',
            creativeEffect: {
                prev: {
                    translate: ['-100%', 0, -500],
                    opacity: 0,
                },
                next: {
                    translate: ['100%', 0, -500],
                    opacity: 0,
                },
            },
            allowTouchMove: true,
            speed: 1500,
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
            },
            pagination: {
                el: '.hero-pagination-dots',
                clickable: true,
                renderBullet: function (index, className) {
                    return `<span class="${className}"><span class="bullet-inner"></span></span>`;
                },
            },
            on: {
                slideChange: function() {
                    pauseInactiveVideos();
                    animateSlideContent();
                }
            }
        });

        const firstSlideVideo = document.querySelector('.hero-video-element');
        if (firstSlideVideo) {
            firstSlideVideo.muted = true; 
            firstSlideVideo.play().catch(e => console.log("Initial play failed:", e));
        }

        setupSmartVideoAutoplay();
        animateSlideContent();

    } catch (error) { 
        console.error("Error loading hero slider: ", error); 
    }
}

function animateSlideContent() {
    const activeSlide = document.querySelector('.swiper-slide-active .slide-content-overlay');
    if (activeSlide) {
        activeSlide.style.animation = 'slideUpFade 1s ease-out forwards';
    }
}

function pauseInactiveVideos() {
    const videos = document.querySelectorAll('.hero-video-element');
    videos.forEach(video => {
        const slide = video.closest('.swiper-slide');
        if (!slide.classList.contains('swiper-slide-active')) {
            video.pause();
        } else {
            video.play().catch(e => console.log("Play failed:", e));
        }
    });
}

function setupSmartVideoAutoplay() {
    const videos = document.querySelectorAll('.hero-video-element, .hero-video-iframe');
    const observerOptions = { root: null, rootMargin: '0px', threshold: 0.25 };

    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const element = entry.target;
            const isYouTube = element.tagName === 'IFRAME';

            if (entry.isIntersecting) {
                if (isYouTube) {
                    element.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                } else {
                    element.play().catch(e => console.log("Autoplay prevented:", e));
                }
            } else {
                if (isYouTube) {
                    element.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                } else {
                    element.pause();
                }
            }
        });
    }, observerOptions);

    videos.forEach(video => {
        videoObserver.observe(video);
    });
}

/**
 * Enhanced Top Sellers with Premium Animations
 */
async function loadTopSellers() {
    const grid = document.getElementById("top-sellers-grid");
    if (!grid) return;
    
    showEnhancedSkeletonLoader(grid, 5);
    
    try {
        const q = query(collection(db, "products"), where("featured", "==", true), limit(10));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            grid.innerHTML = '<p class="no-products-message">No featured products found.</p>'; 
            return;
        }
        
        grid.innerHTML = '';
        let delay = 0;
        
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;
            const card = document.createElement('div');
            card.className = 'swiper-slide product-card-enhanced';
            card.style.setProperty('--delay', `${delay}ms`);
            delay += 100;
            
            const rawImage = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';
            const imageUrl = optimizeImage(rawImage, 400, 80);
            
            const isInCart = isItemInCart(productId);
            const buttonText = isInCart ? "Remove" : "Cart";
            const buttonClass = isInCart ? "btn-primary-new added-to-cart" : "btn-secondary-new"; 
            
            card.innerHTML = `
                <div class="product-card-inner">
                    <a href="product.html?id=${productId}" class="product-image-wrapper">
                        <img src="${imageUrl}" 
                             alt="${product.name}" 
                             class="product-image-enhanced"
                             loading="lazy" 
                             onerror="this.src='https://placehold.co/400x400/1e1e1e/D4AF37?text=Error'">
                        <div class="product-image-overlay">
                            <span class="quick-view-text">Quick View</span>
                        </div>
                    </a>
                    <div class="product-info-enhanced">
                        <div class="product-name-enhanced">${product.name}</div>
                        <div class="product-price-wrapper">
                            <span class="product-price-enhanced">₹${product.price || 0}</span>
                            ${product.mrp && product.mrp > product.price ? 
                                `<span class="product-mrp">₹${product.mrp}</span>` : ''}
                        </div>
                        <div class="product-buttons-enhanced">
                            <button class="btn ${buttonClass} btn-add-to-cart btn-enhanced"
                                data-id="${productId}"
                                data-name="${product.name}"
                                data-price="${product.price}"
                                data-mrp="${product.mrp}"
                                data-image="${imageUrl}"
                                data-size="${product.size || ''}">
                                <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                                    <line x1="3" y1="6" x2="21" y2="6"></line>
                                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                                </svg>
                                <span>${buttonText}</span>
                            </button>
                            <a href="product.html?id=${productId}" class="btn btn-primary-new btn-enhanced">
                                <span>View</span>
                            </a>
                        </div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        const autoplayDelay = 4000; 
        new Swiper('.top-sellers-swiper-new', {
            loop: true,
            autoplay: { delay: autoplayDelay, disableOnInteraction: false },
            speed: 800,
            slidesPerView: 1, 
            spaceBetween: 30,
            centeredSlides: true,
            effect: 'coverflow',
            coverflowEffect: {
                rotate: 0,
                stretch: 0,
                depth: 100,
                modifier: 2,
                slideShadows: false,
            },
            pagination: { 
                el: '.top-sellers-pagination-new', 
                clickable: true,
                renderBullet: function (index, className) {
                    return `<span class="${className}"><span class="pagination-progress"></span></span>`;
                }
            },
            on: {
                init: function (swiper) { 
                    updateProgressAnimation(swiper, autoplayDelay);
                },
                slideChangeTransitionStart: function (swiper) {
                    resetAllProgress(swiper);
                    updateProgressAnimation(swiper, autoplayDelay);
                }
            },
            breakpoints: { 
                640: { slidesPerView: 2, spaceBetween: 20, centeredSlides: false, effect: 'slide' }, 
                900: { slidesPerView: 4, spaceBetween: 20, centeredSlides: false, effect: 'slide' }, 
                1200: { slidesPerView: 5, spaceBetween: 20, centeredSlides: false, effect: 'slide' } 
            }
        });
        
    } catch (error) { 
        console.error("Error loading top sellers: ", error); 
        grid.innerHTML = '<p>Error loading products.</p>'; 
    }
}

function updateProgressAnimation(swiper, delay) {
    const activeBullet = swiper.pagination.bullets[swiper.realIndex];
    if (activeBullet) {
        const progressEl = activeBullet.querySelector('.pagination-progress');
        if (progressEl) {
            progressEl.style.animation = `progress-fill ${delay / 1000}s linear forwards`;
        }
    }
}

function resetAllProgress(swiper) {
    swiper.pagination.bullets.forEach(bullet => {
        const progressEl = bullet.querySelector('.pagination-progress');
        if (progressEl) {
            progressEl.style.animation = 'none';
            void progressEl.offsetWidth;
            progressEl.style.transform = 'scaleX(0)';
        }
    });
}

function showEnhancedSkeletonLoader(container, count = 5) {
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'swiper-slide skeleton-card';
        skeleton.innerHTML = `
            <div class="skeleton skeleton-image" style="width: 100%; aspect-ratio: 4/5; margin-bottom: 1rem; border-radius: 12px;"></div>
            <div style="padding: 0 0.75rem;">
                <div class="skeleton" style="height: 20px; width: 80%; margin-bottom: 0.75rem; border-radius: 4px;"></div>
                <div class="skeleton" style="height: 24px; width: 50%; margin-bottom: 1rem; border-radius: 4px;"></div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                    <div class="skeleton" style="height: 42px; border-radius: 8px;"></div>
                    <div class="skeleton" style="height: 42px; border-radius: 8px;"></div>
                </div>
            </div>
        `;
        container.appendChild(skeleton);
    }
}

/**
 * Enhanced Category Grid with Improved Animations
 */
async function loadHomeCategories() {
    const container = document.getElementById("category-grid-home");
    if (!container) return;

    try {
        const catQuery = query(collection(db, "categories"));
        const catSnapshot = await getDocs(catQuery); 

        if (catSnapshot.empty) {
            container.innerHTML = '<p>No categories to show.</p>'; 
            return;
        }

        const categories = [];
        catSnapshot.forEach((doc) => {
            categories.push({
                id: doc.id,
                ...doc.data()
            });
        });

        container.className = 'home-category-grid-wrapper enhanced-wrapper';
        container.innerHTML = `
            <div class="category-grid-canvas enhanced-canvas" id="category-canvas"></div>
            <div class="category-scroll-hint enhanced-hint">
                <svg class="hint-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 15l7-7 7 7"/>
                </svg>
                Drag to explore categories
            </div>
        `;

        initEnhancedWatchStyleGrid(categories);

    } catch (error) { 
        console.error("Error loading home categories: ", error); 
        container.innerHTML = '<p>Error loading categories.</p>';
    }
}

function initEnhancedWatchStyleGrid(categories) {
    const canvas = document.getElementById('category-canvas');
    if (!canvas) return;

    const isMobile = window.innerWidth <= 768;
    const itemSize = isMobile ? 100 : 130;
    const centerSize = isMobile ? 140 : 180;
    const spacing = isMobile ? 30 : 40;

    const positions = calculateHoneycombPositions(categories.length, itemSize, spacing);
    
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    positions.forEach(pos => {
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
    });
    
    const boundaryPadding = itemSize * 1.5;
    minX -= boundaryPadding;
    maxX += boundaryPadding;
    minY -= boundaryPadding;
    maxY += boundaryPadding;
    
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let velocityX = 0;
    let velocityY = 0;
    let lastUpdateTime = Date.now();
    let animationFrameId = null;

    categories.forEach((category, index) => {
        const item = document.createElement('div');
        item.className = 'category-item-watch enhanced-category-item';
        item.style.width = `${itemSize}px`;
        item.style.height = `${itemSize}px`;
        
        const imageUrl = optimizeImage(category.imageUrl || '', 300, 80);
        
        item.innerHTML = `
            <a href="categories.html?filter=${category.id}" class="category-card-watch enhanced-category-card" style="background-image: url('${imageUrl}')">
                <div class="category-card-overlay"></div>
                <h3 class="category-name-enhanced">${category.name}</h3>
                <div class="category-shine"></div>
            </a>
        `;
        
        item.dataset.index = index;
        canvas.appendChild(item);
    });

    const items = canvas.querySelectorAll('.category-item-watch');
    const canvasRect = canvas.getBoundingClientRect();
    const centerX = canvasRect.width / 2;
    const centerY = canvasRect.height / 2;

    function constrainToBounds(x, y) {
        const elasticity = 0.3;
        let constrainedX = x;
        let constrainedY = y;
        
        if (x > -minX) {
            const overflow = x - (-minX);
            constrainedX = -minX + overflow * elasticity;
        } else if (x < -maxX) {
            const overflow = x - (-maxX);
            constrainedX = -maxX + overflow * elasticity;
        }
        
        if (y > -minY) {
            const overflow = y - (-minY);
            constrainedY = -minY + overflow * elasticity;
        } else if (y < -maxY) {
            const overflow = y - (-maxY);
            constrainedY = -maxY + overflow * elasticity;
        }
        
        return { x: constrainedX, y: constrainedY };
    }

    let updateScheduled = false;
    
    function scheduleUpdate() {
        if (updateScheduled) return;
        updateScheduled = true;
        
        animationFrameId = requestAnimationFrame(() => {
            updatePositions();
            updateScheduled = false;
        });
    }

    function updatePositions() {
        const now = Date.now();
        const deltaTime = now - lastUpdateTime;
        
        if (deltaTime < 16) return;
        lastUpdateTime = now;

        let closestItem = null;
        let minDistance = Infinity;

        items.forEach((item, index) => {
            const pos = positions[index];
            const x = pos.x + offsetX;
            const y = pos.y + offsetY;
            
            const distance = Math.sqrt(x * x + y * y);

            if (distance < minDistance) {
                minDistance = distance;
                closestItem = item;
            }

            const maxDistance = 400;
            const scale = Math.max(0.65, 1 - Math.min(distance / 350, 1));
            const opacity = Math.max(0.4, 1 - Math.min(distance / maxDistance, 1));
            const blur = Math.min(distance / 100, 3);
            
            item.style.transform = `translate3d(${centerX + x}px, ${centerY + y}px, 0) translate(-50%, -50%) scale(${scale})`;
            item.style.opacity = opacity;
            item.style.filter = `blur(${blur}px)`;
            item.style.zIndex = Math.floor((1 - scale) * 100);
            
            if (item.classList.contains('center')) {
                item.classList.remove('center');
            }
        });

        if (closestItem) {
            closestItem.classList.add('center');
            const centerScale = centerSize / itemSize;
            const pos = positions[parseInt(closestItem.dataset.index)];
            const x = pos.x + offsetX;
            const y = pos.y + offsetY;
            closestItem.style.transform = `translate3d(${centerX + x}px, ${centerY + y}px, 0) translate(-50%, -50%) scale(${centerScale})`;
            closestItem.style.opacity = 1;
            closestItem.style.filter = 'blur(0px)';
            closestItem.style.zIndex = 1000;
        }
    }

    let lastMoveTime = 0;
    
    function handleStart(e) {
        isDragging = true;
        const point = e.touches ? e.touches[0] : e;
        startX = point.clientX - currentX;
        startY = point.clientY - currentY;
        velocityX = 0;
        velocityY = 0;
        canvas.style.cursor = 'grabbing';
        canvas.classList.add('dragging');
        
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    function handleMove(e) {
        if (!isDragging) return;
        
        const now = Date.now();
        if (now - lastMoveTime < 16) return;
        lastMoveTime = now;
        
        e.preventDefault();
        
        const point = e.touches ? e.touches[0] : e;
        let newX = point.clientX - startX;
        let newY = point.clientY - startY;
        
        const constrained = constrainToBounds(newX, newY);
        newX = constrained.x;
        newY = constrained.y;
        
        velocityX = newX - currentX;
        velocityY = newY - currentY;
        
        currentX = newX;
        currentY = newY;
        offsetX = currentX;
        offsetY = currentY;
        
        scheduleUpdate();
    }

    function handleEnd() {
        isDragging = false;
        canvas.style.cursor = 'grab';
        canvas.classList.remove('dragging');
        
        function animate() {
            const friction = 0.95;
            const snapStrength = 0.1;
            
            let needsSnap = false;
            let targetX = offsetX;
            let targetY = offsetY;
            
            if (offsetX > -minX) {
                targetX = -minX;
                needsSnap = true;
            } else if (offsetX < -maxX) {
                targetX = -maxX;
                needsSnap = true;
            }
            
            if (offsetY > -minY) {
                targetY = -minY;
                needsSnap = true;
            } else if (offsetY < -maxY) {
                targetY = -maxY;
                needsSnap = true;
            }
            
            if (needsSnap) {
                offsetX += (targetX - offsetX) * snapStrength;
                offsetY += (targetY - offsetY) * snapStrength;
                currentX = offsetX;
                currentY = offsetY;
                
                scheduleUpdate();
                
                if (Math.abs(offsetX - targetX) > 1 || Math.abs(offsetY - targetY) > 1) {
                    animationFrameId = requestAnimationFrame(animate);
                } else {
                    offsetX = targetX;
                    offsetY = targetY;
                    currentX = offsetX;
                    currentY = offsetY;
                    scheduleUpdate();
                    animationFrameId = null;
                }
            }
            else if (Math.abs(velocityX) > 0.3 || Math.abs(velocityY) > 0.3) {
                velocityX *= friction;
                velocityY *= friction;
                
                let newOffsetX = offsetX + velocityX;
                let newOffsetY = offsetY + velocityY;
                
                if (newOffsetX > -minX || newOffsetX < -maxX) {
                    velocityX *= -0.3;
                    newOffsetX = Math.max(-maxX, Math.min(-minX, newOffsetX));
                }
                if (newOffsetY > -minY || newOffsetY < -maxY) {
                    velocityY *= -0.3;
                    newOffsetY = Math.max(-maxY, Math.min(-minY, newOffsetY));
                }
                
                offsetX = newOffsetX;
                offsetY = newOffsetY;
                currentX = offsetX;
                currentY = offsetY;
                
                scheduleUpdate();
                animationFrameId = requestAnimationFrame(animate);
            } else {
                animationFrameId = null;
            }
        }
        animate();
    }

    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('mouseleave', handleEnd);
    
    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    canvas.addEventListener('touchend', handleEnd);

    updatePositions();

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const newRect = canvas.getBoundingClientRect();
            scheduleUpdate();
        }, 100);
    });
}

function calculateHoneycombPositions(count, size, spacing) {
    const positions = [];
    const radius = size + spacing;
    
    positions.push({ x: 0, y: 0 });
    
    let itemCount = 1;
    let ring = 1;
    
    while (itemCount < count) {
        const itemsInRing = ring * 6;
        const angleStep = (Math.PI * 2) / itemsInRing;
        const ringRadius = ring * radius;
        
        for (let i = 0; i < itemsInRing && itemCount < count; i++) {
            const angle = i * angleStep;
            positions.push({
                x: Math.cos(angle) * ringRadius,
                y: Math.sin(angle) * ringRadius
            });
            itemCount++;
        }
        ring++;
    }
    
    return positions;
}

/**
 * Enhanced Cart Interactions
 */
const topSellersGrid = document.getElementById("top-sellers-grid");
if (topSellersGrid) {
    topSellersGrid.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-add-to-cart');
        if (!button) return;
        e.preventDefault(); 
        
        const id = button.dataset.id;
        const buttonText = button.querySelector('span');

        createEnhancedRipple(e, button);

        if (button.classList.contains('added-to-cart')) {
            removeFromCart(id);
            button.classList.remove('added-to-cart');
            button.classList.remove('btn-primary-new');
            button.classList.add('btn-secondary-new'); 
            if (buttonText) buttonText.textContent = 'Cart';
            showEnhancedToast('Removed from cart', 'remove');
        } else {
            const product = {
                id: id, 
                name: button.dataset.name,
                price: parseFloat(button.dataset.price),
                mrp: parseFloat(button.dataset.mrp),
                image: button.dataset.image,
                size: button.dataset.size 
            };
            addToCart(id, product);
            button.classList.add('added-to-cart');
            button.classList.add('btn-primary-new');
            button.classList.remove('btn-secondary-new'); 
            if (buttonText) buttonText.textContent = 'Remove';
            showEnhancedToast('Added to cart!', 'success');
        }
    });
}

function createEnhancedRipple(event, button) {
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.className = 'enhanced-ripple';
    ripple.style.cssText = `
        position: absolute; width: ${size}px; height: ${size}px;
        left: ${x}px; top: ${y}px; border-radius: 50%;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0) 70%);
        transform: scale(0); pointer-events: none;
        animation: enhanced-ripple 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

function showEnhancedToast(message, type = 'success') {
    const existingToast = document.querySelector('.enhanced-toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `enhanced-toast toast-${type}`;
    
    const icon = type === 'success' 
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <span class="toast-message">${message}</span>
    `;
    
    toast.style.cssText = `
        position: fixed; bottom: 100px; left: 50%; 
        transform: translateX(-50%) translateY(100px);
        background: ${type === 'success' ? 'var(--primary-gold)' : '#ff4444'};
        color: ${type === 'success' ? 'var(--bg-color)' : '#ffffff'};
        padding: 16px 28px; border-radius: 12px; font-weight: 600;
        z-index: 10000; opacity: 0; display: flex; align-items: center; gap: 12px;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0) scale(1)';
    }, 10);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(100px) scale(0.8)';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// Enhanced Styles
const enhancedStyles = document.createElement('style');
enhancedStyles.textContent = `
    /* Page Loader */
    .page-loader {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        transition: opacity 0.5s ease;
    }
    
    .loader-content {
        text-align: center;
    }
    
    .loader-spinner {
        width: 60px;
        height: 60px;
        border: 3px solid rgba(212, 175, 55, 0.2);
        border-top-color: var(--primary-gold);
        border-radius: 50%;
        animation: spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
        margin: 0 auto 20px;
    }
    
    .loader-text {
        color: var(--primary-gold);
        font-size: 1.5rem;
        font-weight: 700;
        letter-spacing: 2px;
        animation: pulse 2s ease-in-out infinite;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    
    /* Floating Shapes */
    .floating-shapes {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
        overflow: hidden;
    }
    
    .floating-shape {
        position: absolute;
        width: 200px;
        height: 200px;
        background: radial-gradient(circle, rgba(212, 175, 55, 0.05) 0%, transparent 70%);
        border-radius: 50%;
        animation: float 20s infinite ease-in-out;
    }
    
    @keyframes float {
        0%, 100% {
            transform: translate(0, 0) scale(1);
        }
        25% {
            transform: translate(100px, -100px) scale(1.2);
        }
        50% {
            transform: translate(-50px, -200px) scale(0.8);
        }
        75% {
            transform: translate(-150px, -100px) scale(1.1);
        }
    }
    
    /* Scroll Reveal */
    .scroll-reveal {
        opacity: 0;
        transform: translateY(50px);
        transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .scroll-reveal.revealed {
        opacity: 1;
        transform: translateY(0);
    }
    
    /* Hero Enhancements */
    .hero-image-enhanced {
        transition: transform 8s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .swiper-slide-active .hero-image-enhanced {
        transform: scale(1.05);
    }
    
    .slide-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.3) 100%);
        pointer-events: none;
    }
    
    .slide-content-overlay {
        position: absolute;
        bottom: 40px;
        left: 40px;
        right: 40px;
        z-index: 10;
    }
    
    @keyframes slideUpFade {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    /* Enhanced Pagination */
    .hero-pagination-dots .swiper-pagination-bullet {
        width: 40px;
        height: 4px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.3);
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
    }
    
    .hero-pagination-dots .swiper-pagination-bullet-active {
        background: var(--primary-gold);
        width: 60px;
    }
    
    .bullet-inner {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        background: var(--primary-gold);
        transform: scaleX(0);
        transform-origin: left;
    }
    
    /* Product Cards Enhanced */
    .product-card-enhanced {
        opacity: 0;
        transform: translateY(30px);
        animation: cardFadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        animation-delay: var(--delay);
    }
    
    @keyframes cardFadeIn {
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .product-card-inner {
        background: rgba(255, 255, 255, 0.03);
        border-radius: 16px;
        overflow: hidden;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .product-card-inner:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        border-color: rgba(212, 175, 55, 0.3);
    }
    
    .product-image-wrapper {
        position: relative;
        overflow: hidden;
        aspect-ratio: 4/5;
        display: block;
    }
    
    .product-image-enhanced {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .product-card-inner:hover .product-image-enhanced {
        transform: scale(1.1);
    }
    
    .product-image-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.8) 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.4s ease;
    }
    
    .product-card-inner:hover .product-image-overlay {
        opacity: 1;
    }
    
    .quick-view-text {
        color: var(--primary-gold);
        font-weight: 600;
        font-size: 1rem;
        text-transform: uppercase;
        letter-spacing: 2px;
    }
    
    .product-info-enhanced {
        padding: 1.5rem;
    }
    
    .product-name-enhanced {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-color);
        margin-bottom: 0.75rem;
        line-height: 1.4;
    }
    
    .product-price-wrapper {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
    }
    
    .product-price-enhanced {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--primary-gold);
    }
    
    .product-mrp {
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.4);
        text-decoration: line-through;
    }
    
    .product-buttons-enhanced {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
    }
    
    .btn-enhanced {
        position: relative;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-weight: 600;
        padding: 12px 20px;
        border-radius: 10px;
    }
    
    .btn-enhanced:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(212, 175, 55, 0.3);
    }
    
    @keyframes enhanced-ripple {
        to {
            transform: scale(2.5);
            opacity: 0;
        }
    }
    
    /* Enhanced Category Grid */
    .enhanced-wrapper {
        position: relative;
    }
    
    .enhanced-canvas {
        cursor: grab;
        transition: filter 0.3s ease;
    }
    
    .enhanced-canvas.dragging {
        cursor: grabbing;
    }
    
    .enhanced-category-item {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        will-change: transform, opacity, filter;
    }
    
    .enhanced-category-card {
        position: relative;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        border: 2px solid rgba(255, 255, 255, 0.1);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .enhanced-category-item.center .enhanced-category-card {
        box-shadow: 0 20px 60px rgba(212, 175, 55, 0.4), 
                    0 0 0 3px var(--primary-gold);
    }
    
    .category-card-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.7) 100%);
        transition: opacity 0.3s ease;
    }
    
    .enhanced-category-item.center .category-card-overlay {
        opacity: 0.4;
    }
    
    .category-name-enhanced {
        position: relative;
        z-index: 2;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        transition: all 0.3s ease;
    }
    
    .enhanced-category-item.center .category-name-enhanced {
        transform: scale(1.1);
        text-shadow: 0 4px 12px rgba(0, 0, 0, 0.8);
    }
    
    .category-shine {
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.2) 50%, transparent 70%);
        transform: translateX(-100%);
        transition: transform 0.6s ease;
    }
    
    .enhanced-category-item.center .category-shine {
        transform: translateX(100%);
    }
    
    .enhanced-hint {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        animation: hintBounce 2s ease-in-out infinite;
    }
    
    .hint-icon {
        animation: arrowBounce 1.5s ease-in-out infinite;
    }
    
    @keyframes hintBounce {
        0%, 100% {
            opacity: 0.6;
        }
        50% {
            opacity: 1;
        }
    }
    
    @keyframes arrowBounce {
        0%, 100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-5px);
        }
    }
    
    /* Enhanced Skeleton */
    .skeleton {
        background: linear-gradient(90deg, 
            rgba(255, 255, 255, 0.03) 0%, 
            rgba(255, 255, 255, 0.08) 50%, 
            rgba(255, 255, 255, 0.03) 100%);
        background-size: 200% 100%;
        animation: shimmer 1.5s ease-in-out infinite;
    }
    
    @keyframes shimmer {
        0% {
            background-position: -200% 0;
        }
        100% {
            background-position: 200% 0;
        }
    }
    
    /* Banner Animation */
    .banner-wrapper {
        position: relative;
        overflow: hidden;
    }
    
    .animate-fade-in {
        animation: fadeInScale 1s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    @keyframes fadeInScale {
        from {
            opacity: 0;
            transform: scale(0.95);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
    
    .banner-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, transparent 100%);
        pointer-events: none;
    }
    
    /* Toast Icon Styles */
    .toast-icon {
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .toast-icon svg {
        animation: iconPop 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }
    
    @keyframes iconPop {
        0% {
            transform: scale(0) rotate(-180deg);
        }
        50% {
            transform: scale(1.2) rotate(10deg);
        }
        100% {
            transform: scale(1) rotate(0deg);
        }
    }
    
    /* Progress Fill Animation */
    @keyframes progress-fill {
        from {
            transform: scaleX(0);
        }
        to {
            transform: scaleX(1);
        }
    }
    
    /* Responsive Adjustments */
    @media (max-width: 768px) {
        .product-card-inner {
            border-radius: 12px;
        }
        
        .product-info-enhanced {
            padding: 1rem;
        }
        
        .product-name-enhanced {
            font-size: 0.9rem;
        }
        
        .product-price-enhanced {
            font-size: 1.1rem;
        }
        
        .btn-enhanced {
            padding: 10px 16px;
            font-size: 0.9rem;
        }
        
        .slide-content-overlay {
            bottom: 20px;
            left: 20px;
            right: 20px;
        }
    }
`;
document.head.appendChild(enhancedStyles);