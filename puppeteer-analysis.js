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
        console.log('🔍 Starting comprehensive project section analysis...');
        
        // Navigate to the site
        await page.goto('http://localhost:5180', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for animations
        
        // Navigate to projects section
        console.log('📍 Navigating to projects section...');
        await page.click('a[href="#projects"]');
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
            const firstProject = document.querySelector('.project-card');
            
            if (!projectsSection || !firstProject) {
                return { error: 'Projects section or first project not found' };
            }
            
            const sectionRect = projectsSection.getBoundingClientRect();
            const projectRect = firstProject.getBoundingClientRect();
            
            // Calculate how much of the project is visible
            const visibleTop = Math.max(projectRect.top, sectionRect.top);
            const visibleBottom = Math.min(projectRect.bottom, sectionRect.bottom);
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
                    height: projectRect.height
                },
                visibilityPercentage: Math.round(visibilityPercentage * 100) / 100,
                visibleHeight,
                totalHeight
            };
        });
        
        console.log('First project visibility:', firstProjectVisibility);
        
        // 3. Test dot navigation indicators
        console.log('🔘 Testing dot navigation indicators...');
        const dotNavigation = await page.evaluate(() => {
            const dots = document.querySelectorAll('.dot-indicator');
            const carousel = document.querySelector('.projects-carousel');
            
            if (!dots.length) {
                return { error: 'No dot indicators found' };
            }
            
            const results = {
                totalDots: dots.length,
                activeDot: null,
                dotsVisible: true,
                dotPositions: []
            };
            
            dots.forEach((dot, index) => {
                const rect = dot.getBoundingClientRect();
                results.dotPositions.push({
                    index,
                    visible: rect.width > 0 && rect.height > 0,
                    position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
                });
                
                if (dot.classList.contains('active')) {
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
            await page.click('.dot-indicator:nth-child(2)');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const afterDotClick = await page.evaluate(() => {
                const activeDot = document.querySelector('.dot-indicator.active');
                return activeDot ? Array.from(document.querySelectorAll('.dot-indicator')).indexOf(activeDot) : -1;
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
                const carousel = document.querySelector('.projects-carousel');
                const dots = document.querySelectorAll('.dot-indicator');
                const arrows = document.querySelectorAll('.carousel-arrow');
                
                if (!projectsSection) return { error: 'Projects section not found' };
                
                const sectionRect = projectsSection.getBoundingClientRect();
                const carouselRect = carousel ? carousel.getBoundingClientRect() : null;
                
                return {
                    sectionDimensions: {
                        width: sectionRect.width,
                        height: sectionRect.height
                    },
                    carouselDimensions: carouselRect ? {
                        width: carouselRect.width,
                        height: carouselRect.height
                    } : null,
                    dotsVisible: dots.length > 0 && dots[0].getBoundingClientRect().height > 0,
                    arrowsVisible: arrows.length > 0 && arrows[0].getBoundingClientRect().height > 0,
                    dotsCount: dots.length,
                    arrowsCount: arrows.length
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
            const leftArrow = document.querySelector('.carousel-arrow.left, .carousel-arrow[data-direction="left"]');
            const rightArrow = document.querySelector('.carousel-arrow.right, .carousel-arrow[data-direction="right"]');
            
            return {
                leftArrowExists: !!leftArrow,
                rightArrowExists: !!rightArrow,
                leftArrowVisible: leftArrow ? leftArrow.getBoundingClientRect().height > 0 : false,
                rightArrowVisible: rightArrow ? rightArrow.getBoundingClientRect().height > 0 : false
            };
        });
        
        console.log('Arrow navigation elements:', arrowTest);
        
        if (arrowTest.rightArrowExists && arrowTest.rightArrowVisible) {
            console.log('Testing right arrow click...');
            await page.click('.carousel-arrow.right, .carousel-arrow[data-direction="right"]');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const afterRightClick = await page.evaluate(() => {
                const activeDot = document.querySelector('.dot-indicator.active');
                return activeDot ? Array.from(document.querySelectorAll('.dot-indicator')).indexOf(activeDot) : -1;
            });
            
            console.log('Active slide after right arrow click:', afterRightClick);
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
                    'Unable to calculate'
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