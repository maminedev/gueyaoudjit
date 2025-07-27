import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function manualCarouselTest() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();
    
    const screenshotsDir = path.join(__dirname, 'manual-carousel-test');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir);
    }

    try {
        console.log('🔍 Navigating to localhost:5181...');
        await page.goto('http://localhost:5181', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });

        await wait(3000);

        // Navigate to projects section
        console.log('📍 Scrolling to projects section...');
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight / 2);
        });
        await wait(2000);

        // Take initial screenshot
        console.log('📸 Taking full page screenshot...');
        await page.screenshot({
            path: path.join(screenshotsDir, 'full-page.png'),
            fullPage: true
        });

        // Find and interact with the carousel
        console.log('🎠 Looking for carousel elements...');
        const carouselInfo = await page.evaluate(() => {
            // Check if slider items exist
            const sliderItems = document.querySelectorAll('.slider-item');
            const navigationDots = document.querySelectorAll('button[aria-label*="Go to project"]');
            const prevButton = document.querySelector('img[alt="left"]');
            const nextButton = document.querySelector('img[alt="Right"]');
            
            // Get viewport info
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // Get carousel container position
            const carouselContainer = document.querySelector('#projects');
            let carouselRect = null;
            if (carouselContainer) {
                const rect = carouselContainer.getBoundingClientRect();
                carouselRect = {
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                };
            }
            
            return {
                sliderItemsCount: sliderItems.length,
                navigationDotsCount: navigationDots.length,
                hasPrevButton: !!prevButton,
                hasNextButton: !!nextButton,
                viewportWidth,
                viewportHeight,
                carouselRect
            };
        });

        console.log('Carousel info:', carouselInfo);

        // Scroll specifically to the projects section
        await page.evaluate(() => {
            const projectsSection = document.querySelector('#projects');
            if (projectsSection) {
                projectsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        await wait(3000);

        // Take projects section focused screenshot
        console.log('📸 Taking projects section screenshot...');
        await page.screenshot({
            path: path.join(screenshotsDir, 'projects-section.png'),
            fullPage: false
        });

        // Try clicking navigation dots if they exist
        if (carouselInfo.navigationDotsCount > 0) {
            console.log('🎯 Testing navigation dots...');
            for (let i = 0; i < Math.min(carouselInfo.navigationDotsCount, 4); i++) {
                console.log(`Clicking dot ${i + 1}...`);
                
                await page.evaluate((dotIndex) => {
                    const dots = document.querySelectorAll('button[aria-label*="Go to project"]');
                    if (dots[dotIndex]) {
                        dots[dotIndex].click();
                    }
                }, i);
                
                await wait(2000); // Wait for animation
                
                await page.screenshot({
                    path: path.join(screenshotsDir, `carousel-state-${i + 1}.png`),
                    fullPage: false
                });
            }
        }

        // Try using next button
        if (carouselInfo.hasNextButton) {
            console.log('➡️ Testing next button...');
            await page.evaluate(() => {
                const nextButton = document.querySelector('img[alt="Right"]');
                if (nextButton && nextButton.closest('div')) {
                    nextButton.closest('div').click();
                }
            });
            await wait(2000);
            
            await page.screenshot({
                path: path.join(screenshotsDir, 'after-next-click.png'),
                fullPage: false
            });
        }

        // Test hover effects
        console.log('✨ Testing hover effects...');
        await page.evaluate(() => {
            const sliderItems = document.querySelectorAll('.slider-item');
            if (sliderItems.length > 0) {
                sliderItems[0].dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            }
        });
        await wait(500);
        
        await page.screenshot({
            path: path.join(screenshotsDir, 'hover-effect.png'),
            fullPage: false
        });

        // Get detailed carousel analysis
        console.log('🔍 Getting detailed carousel analysis...');
        const detailedAnalysis = await page.evaluate(() => {
            const analysis = {
                carouselStructure: {},
                sliderItems: [],
                navigation: {},
                styling: {}
            };

            // Analyze slider items
            const sliderItems = document.querySelectorAll('.slider-item');
            sliderItems.forEach((item, index) => {
                const img = item.querySelector('img');
                const title = item.querySelector('h3');
                const description = item.querySelector('p');
                const button = item.querySelector('button');
                
                analysis.sliderItems.push({
                    index,
                    visible: item.offsetWidth > 0 && item.offsetHeight > 0,
                    hasImage: !!img,
                    imageAlt: img?.alt || '',
                    hasTitle: !!title,
                    title: title?.textContent || '',
                    hasDescription: !!description,
                    description: description?.textContent || '',
                    hasButton: !!button,
                    buttonText: button?.textContent || '',
                    styles: {
                        width: getComputedStyle(item).width,
                        height: getComputedStyle(item).height,
                        borderRadius: getComputedStyle(item).borderRadius,
                        transform: getComputedStyle(item).transform
                    }
                });
            });

            // Analyze navigation
            const dots = document.querySelectorAll('button[aria-label*="Go to project"]');
            const prevBtn = document.querySelector('img[alt="left"]');
            const nextBtn = document.querySelector('img[alt="Right"]');
            
            analysis.navigation = {
                dotsCount: dots.length,
                hasPrevButton: !!prevBtn,
                hasNextButton: !!nextBtn,
                dotsVisible: Array.from(dots).every(dot => dot.offsetWidth > 0)
            };

            // Analyze carousel container
            const carouselContainer = document.querySelector('#projects');
            if (carouselContainer) {
                analysis.carouselStructure = {
                    found: true,
                    className: carouselContainer.className,
                    childrenCount: carouselContainer.children.length,
                    styles: {
                        height: getComputedStyle(carouselContainer).height,
                        position: getComputedStyle(carouselContainer).position,
                        overflow: getComputedStyle(carouselContainer).overflow
                    }
                };
            }

            return analysis;
        });

        // Save analysis
        const reportPath = path.join(screenshotsDir, 'manual-carousel-analysis.json');
        fs.writeFileSync(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            carouselInfo,
            detailedAnalysis
        }, null, 2));

        console.log('✅ Manual carousel test completed!');
        console.log(`📊 Found ${carouselInfo.sliderItemsCount} slider items`);
        console.log(`🎯 Found ${carouselInfo.navigationDotsCount} navigation dots`);
        console.log(`📸 Screenshots saved to: ${screenshotsDir}`);

    } catch (error) {
        console.error('❌ Error during manual test:', error);
    }

    await browser.close();
}

// Run the test
manualCarouselTest();