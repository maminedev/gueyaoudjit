import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeProjectSection() {
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('🔍 Starting comprehensive project section analysis with correct selectors...');
        
        // Navigate to the site
        await page.goto('http://localhost:5180', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Navigate to projects section
        console.log('📍 Navigating to projects section...');
        await page.evaluate(() => {
            const projectsSection = document.querySelector('#projects');
            if (projectsSection) {
                projectsSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Create screenshots directory
        const screenshotsDir = path.join(__dirname, 'screenshots');
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir);
        }
        
        // 1. Take screenshot of projects section after fix
        console.log('📸 Taking screenshot of projects section...');
        await page.screenshot({ 
            path: path.join(screenshotsDir, 'projects-section-after-fix.png'),
            fullPage: true
        });
        
        // 2. Measure visibility of first project
        console.log('📏 Measuring first project visibility...');
        const firstProjectVisibility = await page.evaluate(() => {
            const projectsSection = document.querySelector('#projects');
            const firstProject = document.querySelector('.slider-item');
            
            if (!projectsSection || !firstProject) {
                return { error: 'Projects section or first project not found' };
            }
            
            const sectionRect = projectsSection.getBoundingClientRect();
            const projectRect = firstProject.getBoundingClientRect();
            
            // Calculate how much of the project is visible within the viewport
            const viewportHeight = window.innerHeight;
            const visibleTop = Math.max(projectRect.top, 0);
            const visibleBottom = Math.min(projectRect.bottom, viewportHeight);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);
            const totalHeight = projectRect.height;
            const visibilityPercentage = (visibleHeight / totalHeight) * 100;
            
            return {
                sectionRect: {
                    top: sectionRect.top,
                    bottom: sectionRect.bottom,
                    height: sectionRect.height
                },
                projectRect: {
                    top: projectRect.top,
                    bottom: projectRect.bottom,
                    height: projectRect.height,
                    width: projectRect.width
                },
                viewport: {
                    height: viewportHeight,
                    width: window.innerWidth
                },
                visibilityPercentage: Math.round(visibilityPercentage * 100) / 100,
                visibleHeight,
                totalHeight,
                isFullyVisible: visibleHeight === totalHeight,
                isPartiallyVisible: visibleHeight > 0
            };
        });
        
        console.log('First project visibility:', firstProjectVisibility);
        
        // 3. Test dot navigation indicators
        console.log('🔘 Testing dot navigation indicators...');
        const dotNavigation = await page.evaluate(() => {
            // Look for the dot navigation container
            const dotContainer = document.querySelector('.flex.justify-center.gap-3.flex-1');
            const dots = dotContainer ? dotContainer.querySelectorAll('button') : [];
            
            if (!dots.length) {
                return { error: 'No dot indicators found' };
            }
            
            const results = {
                totalDots: dots.length,
                activeDot: null,
                dotsVisible: true,
                dotPositions: [],
                containerRect: dotContainer ? dotContainer.getBoundingClientRect() : null
            };
            
            dots.forEach((dot, index) => {
                const rect = dot.getBoundingClientRect();
                const isActive = dot.classList.contains('bg-blue-400') || dot.style.backgroundColor === 'rgb(96, 165, 250)';
                
                results.dotPositions.push({
                    index,
                    visible: rect.width > 0 && rect.height > 0,
                    position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                    isActive: isActive,
                    classes: dot.className
                });
                
                if (isActive) {
                    results.activeDot = index;
                }
            });
            
            return results;
        });
        
        console.log('Dot navigation analysis:', dotNavigation);
        
        // Test clicking on dots
        if (!dotNavigation.error && dotNavigation.totalDots > 1) {
            console.log('🖱️ Testing dot click functionality...');
            
            // Click on second dot
            const dotSelector = '.flex.justify-center.gap-3.flex-1 button:nth-child(2)';
            await page.click(dotSelector);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const afterDotClick = await page.evaluate(() => {
                const dotContainer = document.querySelector('.flex.justify-center.gap-3.flex-1');
                const dots = dotContainer ? dotContainer.querySelectorAll('button') : [];
                
                for (let i = 0; i < dots.length; i++) {
                    const isActive = dots[i].classList.contains('bg-blue-400') || dots[i].style.backgroundColor === 'rgb(96, 165, 250)';
                    if (isActive) return i;
                }
                return -1;
            });
            
            console.log('Active dot after clicking second dot:', afterDotClick);
        }
        
        // 4. Test responsive behavior across breakpoints
        console.log('📱 Testing responsive behavior...');
        const breakpoints = [
            { name: 'Mobile', width: 375, height: 667 },
            { name: 'Tablet', width: 768, height: 1024 },
            { name: 'Desktop', width: 1200, height: 800 },
            { name: 'Large Desktop', width: 1920, height: 1080 }
        ];
        
        const responsiveResults = {};
        
        for (const breakpoint of breakpoints) {
            console.log(`Testing ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`);
            
            await page.setViewport({ 
                width: breakpoint.width, 
                height: breakpoint.height 
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Take screenshot for this breakpoint
            await page.screenshot({ 
                path: path.join(screenshotsDir, `projects-${breakpoint.name.toLowerCase().replace(' ', '-')}.png`)
            });
            
            const responsiveData = await page.evaluate(() => {
                const projectsSection = document.querySelector('#projects');
                const sliderContainer = document.querySelector('.flex.w-full.lg\\:h-\\[60vh\\]');
                const dots = document.querySelectorAll('.flex.justify-center.gap-3.flex-1 button');
                const arrows = document.querySelectorAll('.rounded-full.cursor-pointer');
                const sliderItems = document.querySelectorAll('.slider-item');
                
                if (!projectsSection) return { error: 'Projects section not found' };
                
                const sectionRect = projectsSection.getBoundingClientRect();
                const sliderRect = sliderContainer ? sliderContainer.getBoundingClientRect() : null;
                
                return {
                    sectionDimensions: {
                        width: sectionRect.width,
                        height: sectionRect.height
                    },
                    sliderDimensions: sliderRect ? {
                        width: sliderRect.width,
                        height: sliderRect.height
                    } : null,
                    dotsVisible: dots.length > 0 && dots[0].getBoundingClientRect().height > 0,
                    arrowsVisible: arrows.length > 0 && arrows[0].getBoundingClientRect().height > 0,
                    dotsCount: dots.length,
                    arrowsCount: arrows.length,
                    sliderItemsCount: sliderItems.length,
                    firstSliderItemVisible: sliderItems.length > 0 ? {
                        rect: sliderItems[0].getBoundingClientRect(),
                        transform: sliderItems[0].style.transform
                    } : null
                };
            });
            
            responsiveResults[breakpoint.name] = responsiveData;
        }
        
        console.log('Responsive test results:', responsiveResults);
        
        // 5. Test arrow navigation functionality
        console.log('➡️ Testing arrow navigation functionality...');
        
        // Reset to desktop view for arrow testing
        await page.setViewport({ width: 1200, height: 800 });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const arrowTest = await page.evaluate(() => {
            const arrows = document.querySelectorAll('.rounded-full.cursor-pointer');
            const leftArrow = arrows[0];
            const rightArrow = arrows[1];
            
            return {
                leftArrowExists: !!leftArrow,
                rightArrowExists: !!rightArrow,
                totalArrows: arrows.length,
                leftArrowVisible: leftArrow ? leftArrow.getBoundingClientRect().height > 0 : false,
                rightArrowVisible: rightArrow ? rightArrow.getBoundingClientRect().height > 0 : false,
                arrowClasses: arrows.length > 0 ? Array.from(arrows).map(arrow => arrow.className) : []
            };
        });
        
        console.log('Arrow navigation elements:', arrowTest);
        
        if (arrowTest.rightArrowExists && arrowTest.rightArrowVisible) {
            console.log('Testing right arrow click...');
            
            // Get initial transform value
            const initialTransform = await page.evaluate(() => {
                const firstSlider = document.querySelector('.slider-item');
                return firstSlider ? firstSlider.style.transform : '';
            });
            
            // Click right arrow
            await page.click('.rounded-full.cursor-pointer:nth-child(2)');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const afterRightClick = await page.evaluate(() => {
                const firstSlider = document.querySelector('.slider-item');
                const dotContainer = document.querySelector('.flex.justify-center.gap-3.flex-1');
                const dots = dotContainer ? dotContainer.querySelectorAll('button') : [];
                
                let activeDot = -1;
                for (let i = 0; i < dots.length; i++) {
                    const isActive = dots[i].classList.contains('bg-blue-400') || dots[i].style.backgroundColor === 'rgb(96, 165, 250)';
                    if (isActive) {
                        activeDot = i;
                        break;
                    }
                }
                
                return {
                    newTransform: firstSlider ? firstSlider.style.transform : '',
                    activeDot: activeDot
                };
            });
            
            console.log('Initial transform:', initialTransform);
            console.log('After right arrow click:', afterRightClick);
        }
        
        // 6. Generate comprehensive analysis report
        console.log('📊 Generating analysis report...');
        
        const finalAnalysis = {
            timestamp: new Date().toISOString(),
            firstProjectVisibility: firstProjectVisibility,
            dotNavigation: dotNavigation,
            responsiveBehavior: responsiveResults,
            arrowNavigation: arrowTest,
            improvements: {
                previousVisibilityIssue: '28.3%',
                currentVisibility: firstProjectVisibility.visibilityPercentage ? `${firstProjectVisibility.visibilityPercentage}%` : 'Unable to measure',
                improvementCalculation: firstProjectVisibility.visibilityPercentage ? 
                    `${Math.round((firstProjectVisibility.visibilityPercentage - 28.3) * 100) / 100}% improvement` : 
                    'Unable to calculate',
                isFullyVisible: firstProjectVisibility.isFullyVisible,
                isPartiallyVisible: firstProjectVisibility.isPartiallyVisible
            },
            uiElementsFound: {
                projectCards: '.slider-item',
                dotNavigation: '.flex.justify-center.gap-3.flex-1 button',
                arrowNavigation: '.rounded-full.cursor-pointer'
            }
        };
        
        // Save analysis report
        fs.writeFileSync(
            path.join(__dirname, 'project-analysis-report.json'),
            JSON.stringify(finalAnalysis, null, 2)
        );
        
        console.log('✅ Analysis complete! Report saved to project-analysis-report.json');
        console.log('\n📋 SUMMARY:');
        console.log(`- First project visibility: ${finalAnalysis.improvements.currentVisibility}`);
        console.log(`- Previous issue: ${finalAnalysis.improvements.previousVisibilityIssue}`);
        console.log(`- Improvement: ${finalAnalysis.improvements.improvementCalculation}`);
        console.log(`- Is fully visible: ${finalAnalysis.improvements.isFullyVisible}`);
        console.log(`- Dot indicators: ${dotNavigation.error ? 'Not found' : `${dotNavigation.totalDots} dots available`}`);
        console.log(`- Arrow navigation: ${arrowTest.leftArrowExists && arrowTest.rightArrowExists ? 'Available' : 'Missing elements'}`);
        console.log(`- Screenshots saved in: ${screenshotsDir}`);
        
        return finalAnalysis;
        
    } catch (error) {
        console.error('❌ Error during analysis:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

// Run the analysis
analyzeProjectSection()
    .then(result => {
        console.log('\n🎉 Analysis completed successfully!');
    })
    .catch(error => {
        console.error('💥 Analysis failed:', error);
        process.exit(1);
    });