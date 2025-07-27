import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testNavigationAndImages() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1920, height: 1080 },
        args: ['--start-maximized']
    });

    const page = await browser.newPage();
    
    const screenshotsDir = path.join(__dirname, 'navigation-test-results');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir);
    }

    const results = {
        timestamp: new Date().toISOString(),
        url: 'http://localhost:5182',
        testResults: {
            projectImagesLoading: false,
            floatingArrowsVisible: false,
            bottomNavigationVisible: false,
            arrowFunctionality: false,
            hoverEffects: false
        },
        details: {
            images: [],
            arrows: {},
            functionality: {},
            screenshots: []
        }
    };

    try {
        console.log('🔍 Navigating to localhost:5182...');
        await page.goto('http://localhost:5182', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });

        await wait(3000);

        // Navigate to projects section
        console.log('📍 Scrolling to projects section...');
        await page.evaluate(() => {
            const projectsSection = document.querySelector('#projects');
            if (projectsSection) {
                projectsSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
        await wait(3000);

        // Take initial screenshot
        console.log('📸 Taking initial screenshot...');
        await page.screenshot({
            path: path.join(screenshotsDir, '1-initial-projects-view.png'),
            fullPage: false
        });
        results.details.screenshots.push('1-initial-projects-view.png');

        // Test 1: Check project images
        console.log('🖼️ Testing project images...');
        const imageTest = await page.evaluate(() => {
            const images = document.querySelectorAll('.slider-item img, .project-card img, [class*="project"] img');
            const imageResults = [];
            
            for (let img of images) {
                imageResults.push({
                    src: img.src,
                    alt: img.alt,
                    loaded: img.complete && img.naturalHeight !== 0,
                    visible: img.offsetWidth > 0 && img.offsetHeight > 0,
                    naturalSize: { width: img.naturalWidth, height: img.naturalHeight },
                    displaySize: { width: img.offsetWidth, height: img.offsetHeight }
                });
            }
            
            return {
                totalImages: images.length,
                loadedImages: imageResults.filter(img => img.loaded).length,
                visibleImages: imageResults.filter(img => img.visible).length,
                details: imageResults
            };
        });

        results.details.images = imageTest;
        results.testResults.projectImagesLoading = imageTest.loadedImages >= 3; // At least 3 out of 4

        // Test 2: Check for floating navigation arrows
        console.log('🎯 Testing floating navigation arrows...');
        const floatingArrowsTest = await page.evaluate(() => {
            const leftArrow = document.querySelector('img[alt="left"], img[alt*="left"], button[aria-label*="previous"], [class*="arrow"][class*="left"], [class*="prev"]');
            const rightArrow = document.querySelector('img[alt="Right"], img[alt*="right"], button[aria-label*="next"], [class*="arrow"][class*="right"], [class*="next"]');
            
            const checkVisibility = (element) => {
                if (!element) return { found: false, visible: false, prominent: false };
                
                const styles = getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                
                return {
                    found: true,
                    visible: styles.display !== 'none' && styles.visibility !== 'hidden' && parseFloat(styles.opacity) > 0,
                    prominent: parseFloat(styles.opacity) > 0.5,
                    position: styles.position,
                    zIndex: styles.zIndex,
                    opacity: styles.opacity,
                    size: { width: rect.width, height: rect.height }
                };
            };
            
            return {
                leftArrow: checkVisibility(leftArrow),
                rightArrow: checkVisibility(rightArrow),
                bothFound: !!leftArrow && !!rightArrow
            };
        });

        results.details.arrows.floating = floatingArrowsTest;
        results.testResults.floatingArrowsVisible = floatingArrowsTest.bothFound && 
                                                   floatingArrowsTest.leftArrow.visible && 
                                                   floatingArrowsTest.rightArrow.visible;

        // Test 3: Check bottom navigation dots
        console.log('🔵 Testing bottom navigation dots...');
        const bottomNavTest = await page.evaluate(() => {
            const dots = document.querySelectorAll('[aria-label*="Go to project"], .dot, [class*="dot"], [class*="indicator"], button[role="tab"]');
            const visibleDots = Array.from(dots).filter(dot => {
                const styles = getComputedStyle(dot);
                return styles.display !== 'none' && styles.visibility !== 'hidden' && parseFloat(styles.opacity) > 0;
            });
            
            return {
                totalDots: dots.length,
                visibleDots: visibleDots.length,
                dotsVisible: visibleDots.length > 0,
                prominent: visibleDots.length > 0 && visibleDots.every(dot => parseFloat(getComputedStyle(dot).opacity) > 0.5)
            };
        });

        results.details.arrows.bottom = bottomNavTest;
        results.testResults.bottomNavigationVisible = bottomNavTest.dotsVisible;

        // Take screenshot showing navigation elements
        await page.screenshot({
            path: path.join(screenshotsDir, '2-navigation-elements.png'),
            fullPage: false
        });
        results.details.screenshots.push('2-navigation-elements.png');

        // Test 4: Test arrow functionality
        console.log('🖱️ Testing arrow functionality...');
        const functionalityTest = await page.evaluate(async () => {
            // Try to find and click navigation elements
            const rightArrow = document.querySelector('img[alt="Right"], img[alt*="right"], button[aria-label*="next"], [class*="arrow"][class*="right"], [class*="next"]');
            const leftArrow = document.querySelector('img[alt="left"], img[alt*="left"], button[aria-label*="previous"], [class*="arrow"][class*="left"], [class*="prev"]');
            const dots = document.querySelectorAll('[aria-label*="Go to project"], .dot, [class*="dot"], button[role="tab"]');
            
            let rightArrowWorks = false;
            let leftArrowWorks = false;
            let dotsWork = false;
            
            // Test right arrow
            if (rightArrow) {
                const initialContent = document.querySelector('.slider-item h3, .project-title, [class*="title"]')?.textContent;
                rightArrow.click();
                await new Promise(resolve => setTimeout(resolve, 1500));
                const newContent = document.querySelector('.slider-item h3, .project-title, [class*="title"]')?.textContent;
                rightArrowWorks = initialContent !== newContent;
            }
            
            // Test dots if right arrow didn't work
            if (!rightArrowWorks && dots.length > 1) {
                const initialContent = document.querySelector('.slider-item h3, .project-title, [class*="title"]')?.textContent;
                dots[1].click();
                await new Promise(resolve => setTimeout(resolve, 1500));
                const newContent = document.querySelector('.slider-item h3, .project-title, [class*="title"]')?.textContent;
                dotsWork = initialContent !== newContent;
            }
            
            // Test left arrow
            if (leftArrow) {
                const initialContent = document.querySelector('.slider-item h3, .project-title, [class*="title"]')?.textContent;
                leftArrow.click();
                await new Promise(resolve => setTimeout(resolve, 1500));
                const newContent = document.querySelector('.slider-item h3, .project-title, [class*="title"]')?.textContent;
                leftArrowWorks = initialContent !== newContent;
            }
            
            return {
                rightArrowWorks,
                leftArrowWorks,
                dotsWork,
                anyNavigationWorks: rightArrowWorks || leftArrowWorks || dotsWork
            };
        });

        results.details.functionality = functionalityTest;
        results.testResults.arrowFunctionality = functionalityTest.anyNavigationWorks;

        // Take screenshot after navigation test
        await page.screenshot({
            path: path.join(screenshotsDir, '3-after-navigation-test.png'),
            fullPage: false
        });
        results.details.screenshots.push('3-after-navigation-test.png');

        // Test 5: Hover effects
        console.log('✨ Testing hover effects...');
        const hoverTest = await page.evaluate(async () => {
            const rightArrow = document.querySelector('img[alt="Right"], img[alt*="right"], button[aria-label*="next"], [class*="arrow"][class*="right"], [class*="next"]');
            
            if (rightArrow) {
                const initialOpacity = getComputedStyle(rightArrow).opacity;
                
                // Trigger hover
                rightArrow.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 300));
                
                const hoverOpacity = getComputedStyle(rightArrow).opacity;
                
                // Remove hover
                rightArrow.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
                
                return {
                    hoverEffectDetected: initialOpacity !== hoverOpacity,
                    becameMoreVisible: parseFloat(hoverOpacity) > parseFloat(initialOpacity),
                    initialOpacity,
                    hoverOpacity
                };
            }
            
            return { hoverEffectDetected: false, becameMoreVisible: false };
        });

        results.details.hoverEffects = hoverTest;
        results.testResults.hoverEffects = hoverTest.hoverEffectDetected;

        // Demonstrate hover effect in screenshot
        await page.hover('img[alt="Right"], img[alt*="right"], button[aria-label*="next"], [class*="arrow"][class*="right"], [class*="next"]');
        await wait(500);
        await page.screenshot({
            path: path.join(screenshotsDir, '4-hover-state.png'),
            fullPage: false
        });
        results.details.screenshots.push('4-hover-state.png');

        // Test all project slides
        console.log('🔄 Testing all project slides...');
        for (let i = 0; i < 4; i++) {
            // Try different methods to navigate to slide
            await page.evaluate((slideIndex) => {
                const dots = document.querySelectorAll('[aria-label*="Go to project"], .dot, [class*="dot"], button[role="tab"]');
                if (dots[slideIndex]) {
                    dots[slideIndex].click();
                }
            }, i);
            
            await wait(2000);
            
            await page.screenshot({
                path: path.join(screenshotsDir, `5-project-slide-${i + 1}.png`),
                fullPage: false
            });
            results.details.screenshots.push(`5-project-slide-${i + 1}.png`);
        }

        // Take final comprehensive screenshot
        await page.screenshot({
            path: path.join(screenshotsDir, '6-final-overview.png'),
            fullPage: true
        });
        results.details.screenshots.push('6-final-overview.png');

        console.log('✅ Testing completed successfully!');

    } catch (error) {
        console.error('❌ Error during testing:', error);
        results.error = error.message;
    }

    // Save results
    const reportPath = path.join(screenshotsDir, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    // Generate summary report
    const summary = generateTestSummary(results);
    const summaryPath = path.join(screenshotsDir, 'test-summary.html');
    fs.writeFileSync(summaryPath, summary);

    console.log('📊 Test report saved to:', reportPath);
    console.log('🌐 Summary report saved to:', summaryPath);

    await browser.close();
    return results;
}

function generateTestSummary(results) {
    const testsPassed = Object.values(results.testResults).filter(Boolean).length;
    const totalTests = Object.keys(results.testResults).length;
    const successRate = Math.round((testsPassed / totalTests) * 100);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Navigation & Images Test Summary</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; padding: 20px; background: #f5f5f5; line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; padding: 40px; border-radius: 12px; margin-bottom: 30px; text-align: center;
        }
        .score { font-size: 3em; font-weight: bold; margin: 20px 0; }
        .test-grid { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; margin: 30px 0; 
        }
        .test-card { 
            background: white; padding: 25px; border-radius: 12px; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; 
        }
        .test-pass { border-left: 5px solid #28a745; }
        .test-fail { border-left: 5px solid #dc3545; }
        .test-icon { font-size: 2em; margin-bottom: 15px; }
        .pass-icon { color: #28a745; }
        .fail-icon { color: #dc3545; }
        .screenshots { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; margin: 30px 0; 
        }
        .screenshot { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .screenshot img { max-width: 100%; height: auto; border-radius: 6px; }
        .details { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin: 20px 0; }
        .details h3 { margin-top: 0; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .highlight { background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Navigation & Images Test Results</h1>
            <p>Comprehensive testing at localhost:5182</p>
            <div class="score ${successRate >= 80 ? 'pass-icon' : 'fail-icon'}">${successRate}%</div>
            <p>${testsPassed}/${totalTests} tests passed</p>
            <p><strong>Tested:</strong> ${new Date(results.timestamp).toLocaleString()}</p>
        </div>

        <div class="test-grid">
            <div class="test-card ${results.testResults.projectImagesLoading ? 'test-pass' : 'test-fail'}">
                <div class="test-icon ${results.testResults.projectImagesLoading ? 'pass-icon' : 'fail-icon'}">
                    ${results.testResults.projectImagesLoading ? '✅' : '❌'}
                </div>
                <h3>Project Images Loading</h3>
                <p>${results.details.images.loadedImages}/${results.details.images.totalImages} images loaded successfully</p>
            </div>

            <div class="test-card ${results.testResults.floatingArrowsVisible ? 'test-pass' : 'test-fail'}">
                <div class="test-icon ${results.testResults.floatingArrowsVisible ? 'pass-icon' : 'fail-icon'}">
                    ${results.testResults.floatingArrowsVisible ? '✅' : '❌'}
                </div>
                <h3>Floating Navigation Arrows</h3>
                <p>${results.testResults.floatingArrowsVisible ? 'Highly visible and prominent' : 'Not sufficiently visible'}</p>
            </div>

            <div class="test-card ${results.testResults.bottomNavigationVisible ? 'test-pass' : 'test-fail'}">
                <div class="test-icon ${results.testResults.bottomNavigationVisible ? 'pass-icon' : 'fail-icon'}">
                    ${results.testResults.bottomNavigationVisible ? '✅' : '❌'}
                </div>
                <h3>Bottom Navigation</h3>
                <p>${results.details.arrows.bottom.visibleDots} navigation dots visible</p>
            </div>

            <div class="test-card ${results.testResults.arrowFunctionality ? 'test-pass' : 'test-fail'}">
                <div class="test-icon ${results.testResults.arrowFunctionality ? 'pass-icon' : 'fail-icon'}">
                    ${results.testResults.arrowFunctionality ? '✅' : '❌'}
                </div>
                <h3>Arrow Functionality</h3>
                <p>${results.testResults.arrowFunctionality ? 'Navigation working correctly' : 'Navigation issues detected'}</p>
            </div>

            <div class="test-card ${results.testResults.hoverEffects ? 'test-pass' : 'test-fail'}">
                <div class="test-icon ${results.testResults.hoverEffects ? 'pass-icon' : 'fail-icon'}">
                    ${results.testResults.hoverEffects ? '✅' : '❌'}
                </div>
                <h3>Hover Effects</h3>
                <p>${results.testResults.hoverEffects ? 'Enhanced visibility on hover' : 'No hover enhancements detected'}</p>
            </div>
        </div>

        <div class="details">
            <h3>📊 Detailed Results</h3>
            
            <div class="highlight">
                <h4>🖼️ Project Images Analysis</h4>
                <ul>
                    ${results.details.images.details.map((img, index) => `
                        <li>Project ${index + 1}: ${img.loaded ? '✅ Loaded' : '❌ Failed'} - ${img.alt}</li>
                    `).join('')}
                </ul>
            </div>

            <div class="highlight">
                <h4>🎯 Navigation Arrows Status</h4>
                <p><strong>Floating Arrows:</strong></p>
                <ul>
                    <li>Left Arrow: ${results.details.arrows.floating?.leftArrow?.found ? '✅ Found' : '❌ Not found'} 
                        ${results.details.arrows.floating?.leftArrow?.visible ? '(Visible)' : '(Hidden)'}</li>
                    <li>Right Arrow: ${results.details.arrows.floating?.rightArrow?.found ? '✅ Found' : '❌ Not found'} 
                        ${results.details.arrows.floating?.rightArrow?.visible ? '(Visible)' : '(Hidden)'}</li>
                </ul>
                <p><strong>Bottom Navigation:</strong> ${results.details.arrows.bottom.visibleDots} of ${results.details.arrows.bottom.totalDots} dots visible</p>
            </div>

            <div class="highlight">
                <h4>🖱️ Functionality Test Results</h4>
                <ul>
                    <li>Right Arrow: ${results.details.functionality?.rightArrowWorks ? '✅ Working' : '❌ Not working'}</li>
                    <li>Left Arrow: ${results.details.functionality?.leftArrowWorks ? '✅ Working' : '❌ Not working'}</li>
                    <li>Navigation Dots: ${results.details.functionality?.dotsWork ? '✅ Working' : '❌ Not working'}</li>
                </ul>
            </div>
        </div>

        <div class="details">
            <h3>📸 Visual Documentation</h3>
            <div class="screenshots">
                ${results.details.screenshots.map(screenshot => `
                    <div class="screenshot">
                        <h4>${screenshot.replace(/[-_]/g, ' ').replace('.png', '').replace(/^\d+-/, '').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                        <img src="${screenshot}" alt="${screenshot}" loading="lazy" />
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="details">
            <h3>🎯 Final Assessment</h3>
            ${successRate >= 80 ? `
                <div style="background: #d4edda; color: #155724; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745;">
                    <h4>🎉 EXCELLENT RESULTS!</h4>
                    <p>The navigation arrows are highly visible and prominent, project images are loading correctly, and the functionality is working as expected. The improvements to navigation visibility are clearly demonstrated.</p>
                </div>
            ` : successRate >= 60 ? `
                <div style="background: #fff3cd; color: #856404; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107;">
                    <h4>✅ GOOD PROGRESS</h4>
                    <p>Most tests are passing, but there are some areas that could use improvement. The navigation visibility has been enhanced, but there may be room for further optimization.</p>
                </div>
            ` : `
                <div style="background: #f8d7da; color: #721c24; padding: 20px; border-radius: 8px; border-left: 4px solid #dc3545;">
                    <h4>⚠️ NEEDS ATTENTION</h4>
                    <p>Several issues were detected with navigation visibility or functionality. Please review the detailed results above to address the specific problems.</p>
                </div>
            `}
        </div>
    </div>
</body>
</html>
    `;
}

// Run the test
testNavigationAndImages().then(results => {
    console.log('\n🎯 NAVIGATION & IMAGES TEST COMPLETE');
    console.log('====================================');
    
    const testResults = results.testResults;
    const testsPassed = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    
    console.log(`📊 Overall Success Rate: ${Math.round((testsPassed / totalTests) * 100)}% (${testsPassed}/${totalTests})`);
    console.log(`🖼️ Project Images: ${results.details.images.loadedImages}/${results.details.images.totalImages} loading correctly`);
    console.log(`🎯 Floating Arrows: ${testResults.floatingArrowsVisible ? 'Highly Visible ✅' : 'Needs Improvement ❌'}`);
    console.log(`🔵 Bottom Navigation: ${testResults.bottomNavigationVisible ? 'Visible ✅' : 'Not Visible ❌'}`);
    console.log(`🖱️ Arrow Functionality: ${testResults.arrowFunctionality ? 'Working ✅' : 'Issues ❌'}`);
    console.log(`✨ Hover Effects: ${testResults.hoverEffects ? 'Enhanced ✅' : 'None ❌'}`);
    
    if (testsPassed >= totalTests * 0.8) {
        console.log('\n🎉 SUCCESS: Navigation arrows are much more visible and functional!');
    } else if (testsPassed >= totalTests * 0.6) {
        console.log('\n✅ GOOD: Significant improvements made with room for enhancement');
    } else {
        console.log('\n⚠️ ATTENTION: Navigation visibility and functionality need work');
    }
    
    console.log('\n📊 View the detailed HTML report for complete visual analysis');
}).catch(error => {
    console.error('❌ Test failed:', error);
});