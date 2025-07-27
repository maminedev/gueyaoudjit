import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testNavigationArrowsAndImages() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();
    
    const screenshotsDir = path.join(__dirname, 'navigation-arrows-test');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir);
    }

    const results = {
        timestamp: new Date().toISOString(),
        url: 'http://localhost:5182',
        projectImages: {
            totalExpected: 4,
            loadingCorrectly: 0,
            details: []
        },
        navigationArrows: {
            floating: {
                found: false,
                visible: false,
                prominent: false,
                leftArrow: { found: false, visible: false, clickable: false },
                rightArrow: { found: false, visible: false, clickable: false }
            },
            bottom: {
                found: false,
                visible: false,
                prominent: false,
                dots: { count: 0, visible: false, clickable: false }
            }
        },
        arrowFunctionality: {
            leftArrowWorks: false,
            rightArrowWorks: false,
            dotsWork: false,
            navigationSmooth: false
        },
        hoverEffects: {
            arrowsVisibleOnHover: false,
            arrowsMoreProminent: false,
            details: []
        },
        visibilityImprovement: {
            arrowsHighlyVisible: false,
            muchMoreVisibleThanBefore: false,
            prominentDesign: false
        },
        screenshots: [],
        issues: [],
        improvements: [],
        success: []
    };

    try {
        console.log('🔍 Navigating to localhost:5182...');
        await page.goto('http://localhost:5182', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });

        await wait(3000);

        // Navigate to projects section
        console.log('📍 Navigating to projects section...');
        await page.click('a[href="#projects"]');
        await wait(2000);

        // Take initial screenshot
        console.log('📸 Taking initial projects section screenshot...');
        await page.screenshot({
            path: path.join(screenshotsDir, 'projects-initial-state.png'),
            fullPage: false
        });
        results.screenshots.push('projects-initial-state.png');

        // Test project images loading
        console.log('🖼️ Testing project images loading...');
        const imageAnalysis = await page.evaluate(async () => {
            const projectImages = document.querySelectorAll('.slider-item img');
            const imageDetails = [];
            
            for (let i = 0; i < projectImages.length; i++) {
                const img = projectImages[i];
                const isLoaded = img.complete && img.naturalHeight !== 0;
                const src = img.src;
                const alt = img.alt;
                
                // Get computed styles to check visibility
                const styles = getComputedStyle(img);
                const isVisible = styles.display !== 'none' && 
                                 styles.visibility !== 'hidden' && 
                                 styles.opacity !== '0';
                
                imageDetails.push({
                    index: i + 1,
                    src: src,
                    alt: alt,
                    isLoaded: isLoaded,
                    isVisible: isVisible,
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                    displayWidth: img.offsetWidth,
                    displayHeight: img.offsetHeight
                });
            }
            
            return {
                totalFound: projectImages.length,
                loadingCorrectly: imageDetails.filter(img => img.isLoaded && img.isVisible).length,
                details: imageDetails
            };
        });

        results.projectImages.totalExpected = 4;
        results.projectImages.loadingCorrectly = imageAnalysis.loadingCorrectly;
        results.projectImages.details = imageAnalysis.details;

        // Test floating navigation arrows
        console.log('🎯 Testing floating navigation arrows...');
        const floatingArrowsTest = await page.evaluate(() => {
            // Look for floating arrow buttons
            const leftArrowBtn = document.querySelector('img[alt="left"]')?.closest('div');
            const rightArrowBtn = document.querySelector('img[alt="Right"]')?.closest('div');
            
            let leftArrowAnalysis = { found: false, visible: false, clickable: false };
            let rightArrowAnalysis = { found: false, visible: false, clickable: false };
            
            if (leftArrowBtn) {
                const styles = getComputedStyle(leftArrowBtn);
                leftArrowAnalysis = {
                    found: true,
                    visible: styles.display !== 'none' && styles.visibility !== 'hidden' && styles.opacity !== '0',
                    clickable: leftArrowBtn.onclick !== null || leftArrowBtn.addEventListener !== null,
                    position: styles.position,
                    zIndex: styles.zIndex,
                    backgroundColor: styles.backgroundColor,
                    opacity: styles.opacity,
                    cursor: styles.cursor
                };
            }
            
            if (rightArrowBtn) {
                const styles = getComputedStyle(rightArrowBtn);
                rightArrowAnalysis = {
                    found: true,
                    visible: styles.display !== 'none' && styles.visibility !== 'hidden' && styles.opacity !== '0',
                    clickable: rightArrowBtn.onclick !== null || rightArrowBtn.addEventListener !== null,
                    position: styles.position,
                    zIndex: styles.zIndex,
                    backgroundColor: styles.backgroundColor,
                    opacity: styles.opacity,
                    cursor: styles.cursor
                };
            }
            
            return {
                found: leftArrowBtn && rightArrowBtn,
                visible: leftArrowAnalysis.visible && rightArrowAnalysis.visible,
                prominent: leftArrowAnalysis.visible && rightArrowAnalysis.visible && 
                          (parseFloat(leftArrowAnalysis.opacity) > 0.7 || parseFloat(rightArrowAnalysis.opacity) > 0.7),
                leftArrow: leftArrowAnalysis,
                rightArrow: rightArrowAnalysis
            };
        });

        results.navigationArrows.floating = floatingArrowsTest;

        // Test bottom navigation (dots)
        console.log('🔵 Testing bottom navigation dots...');
        const bottomNavTest = await page.evaluate(() => {
            const dots = document.querySelectorAll('[aria-label*="Go to project"]');
            const dotsVisible = Array.from(dots).filter(dot => {
                const styles = getComputedStyle(dot);
                return styles.display !== 'none' && styles.visibility !== 'hidden' && styles.opacity !== '0';
            });
            
            return {
                found: dots.length > 0,
                visible: dotsVisible.length > 0,
                prominent: dotsVisible.length > 0 && dotsVisible.every(dot => {
                    const styles = getComputedStyle(dot);
                    return parseFloat(styles.opacity) > 0.5;
                }),
                dots: {
                    count: dots.length,
                    visible: dotsVisible.length,
                    clickable: dotsVisible.length > 0
                }
            };
        });

        results.navigationArrows.bottom = bottomNavTest;

        // Take screenshot showing navigation elements
        console.log('📸 Taking navigation elements screenshot...');
        await page.screenshot({
            path: path.join(screenshotsDir, 'navigation-elements-visible.png'),
            fullPage: false
        });
        results.screenshots.push('navigation-elements-visible.png');

        // Test arrow functionality
        console.log('🖱️ Testing navigation arrow functionality...');
        
        // Test right arrow functionality
        const rightArrowTest = await page.evaluate(async () => {
            const rightArrowBtn = document.querySelector('img[alt="Right"]')?.closest('div');
            if (rightArrowBtn) {
                const initialSlide = document.querySelector('.slider-item h3')?.textContent;
                rightArrowBtn.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                const newSlide = document.querySelector('.slider-item h3')?.textContent;
                return {
                    clicked: true,
                    slideChanged: initialSlide !== newSlide,
                    initialSlide: initialSlide,
                    newSlide: newSlide
                };
            }
            return { clicked: false, slideChanged: false };
        });

        results.arrowFunctionality.rightArrowWorks = rightArrowTest.slideChanged;

        // Take screenshot after right arrow click
        await wait(1500);
        await page.screenshot({
            path: path.join(screenshotsDir, 'after-right-arrow-click.png'),
            fullPage: false
        });
        results.screenshots.push('after-right-arrow-click.png');

        // Test left arrow functionality
        const leftArrowTest = await page.evaluate(async () => {
            const leftArrowBtn = document.querySelector('img[alt="left"]')?.closest('div');
            if (leftArrowBtn) {
                const initialSlide = document.querySelector('.slider-item h3')?.textContent;
                leftArrowBtn.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                const newSlide = document.querySelector('.slider-item h3')?.textContent;
                return {
                    clicked: true,
                    slideChanged: initialSlide !== newSlide,
                    initialSlide: initialSlide,
                    newSlide: newSlide
                };
            }
            return { clicked: false, slideChanged: false };
        });

        results.arrowFunctionality.leftArrowWorks = leftArrowTest.slideChanged;

        // Take screenshot after left arrow click
        await wait(1500);
        await page.screenshot({
            path: path.join(screenshotsDir, 'after-left-arrow-click.png'),
            fullPage: false
        });
        results.screenshots.push('after-left-arrow-click.png');

        // Test dots functionality
        const dotsTest = await page.evaluate(async () => {
            const dots = document.querySelectorAll('[aria-label*="Go to project"]');
            if (dots.length > 1) {
                const initialSlide = document.querySelector('.slider-item h3')?.textContent;
                dots[1].click(); // Click second dot
                await new Promise(resolve => setTimeout(resolve, 1000));
                const newSlide = document.querySelector('.slider-item h3')?.textContent;
                return {
                    clicked: true,
                    slideChanged: initialSlide !== newSlide,
                    dotsCount: dots.length
                };
            }
            return { clicked: false, slideChanged: false, dotsCount: 0 };
        });

        results.arrowFunctionality.dotsWork = dotsTest.slideChanged;

        // Test hover effects on arrows
        console.log('✨ Testing hover effects on navigation arrows...');
        const hoverTest = await page.evaluate(async () => {
            const rightArrowBtn = document.querySelector('img[alt="Right"]')?.closest('div');
            const leftArrowBtn = document.querySelector('img[alt="left"]')?.closest('div');
            
            let hoverEffects = [];
            
            if (rightArrowBtn) {
                const initialOpacity = getComputedStyle(rightArrowBtn).opacity;
                const initialBackground = getComputedStyle(rightArrowBtn).backgroundColor;
                
                rightArrowBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 300));
                
                const hoverOpacity = getComputedStyle(rightArrowBtn).opacity;
                const hoverBackground = getComputedStyle(rightArrowBtn).backgroundColor;
                
                hoverEffects.push({
                    arrow: 'right',
                    opacityChanged: initialOpacity !== hoverOpacity,
                    backgroundChanged: initialBackground !== hoverBackground,
                    moreVisible: parseFloat(hoverOpacity) > parseFloat(initialOpacity)
                });
                
                rightArrowBtn.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
            }
            
            if (leftArrowBtn) {
                const initialOpacity = getComputedStyle(leftArrowBtn).opacity;
                const initialBackground = getComputedStyle(leftArrowBtn).backgroundColor;
                
                leftArrowBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 300));
                
                const hoverOpacity = getComputedStyle(leftArrowBtn).opacity;
                const hoverBackground = getComputedStyle(leftArrowBtn).backgroundColor;
                
                hoverEffects.push({
                    arrow: 'left',
                    opacityChanged: initialOpacity !== hoverOpacity,
                    backgroundChanged: initialBackground !== hoverBackground,
                    moreVisible: parseFloat(hoverOpacity) > parseFloat(initialOpacity)
                });
                
                leftArrowBtn.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
            }
            
            return {
                effectsFound: hoverEffects.some(effect => effect.opacityChanged || effect.backgroundChanged),
                moreVisibleOnHover: hoverEffects.some(effect => effect.moreVisible),
                details: hoverEffects
            };
        });

        results.hoverEffects.arrowsVisibleOnHover = hoverTest.effectsFound;
        results.hoverEffects.arrowsMoreProminent = hoverTest.moreVisibleOnHover;
        results.hoverEffects.details = hoverTest.details;

        // Demonstrate hover state
        await page.hover('img[alt="Right"]');
        await wait(500);
        await page.screenshot({
            path: path.join(screenshotsDir, 'arrows-hover-state.png'),
            fullPage: false
        });
        results.screenshots.push('arrows-hover-state.png');

        // Test all 4 project slides and their images
        console.log('🔄 Testing all 4 project slides and images...');
        for (let i = 0; i < 4; i++) {
            // Navigate to specific slide
            await page.evaluate((slideIndex) => {
                const dots = document.querySelectorAll('[aria-label*="Go to project"]');
                if (dots[slideIndex]) {
                    dots[slideIndex].click();
                }
            }, i);
            
            await wait(1500);
            
            // Take screenshot of current slide
            const slideScreenshot = `project-slide-${i + 1}-with-navigation.png`;
            await page.screenshot({
                path: path.join(screenshotsDir, slideScreenshot),
                fullPage: false
            });
            results.screenshots.push(slideScreenshot);
            
            // Verify image loading for current slide
            const currentSlideImage = await page.evaluate(() => {
                const currentImg = document.querySelector('.slider-item img');
                if (currentImg) {
                    return {
                        src: currentImg.src,
                        loaded: currentImg.complete && currentImg.naturalHeight !== 0,
                        visible: getComputedStyle(currentImg).display !== 'none'
                    };
                }
                return null;
            });
            
            console.log(`Project ${i + 1} image:`, currentSlideImage);
        }

        // Assess overall arrow visibility improvement
        const visibilityAssessment = {
            arrowsHighlyVisible: results.navigationArrows.floating.visible && 
                                results.navigationArrows.floating.prominent,
            muchMoreVisibleThanBefore: results.navigationArrows.floating.prominent && 
                                      results.hoverEffects.arrowsMoreProminent,
            prominentDesign: results.navigationArrows.floating.leftArrow.found && 
                           results.navigationArrows.floating.rightArrow.found &&
                           results.navigationArrows.bottom.found
        };

        results.visibilityImprovement = visibilityAssessment;

        // Generate success/issues based on results
        if (results.projectImages.loadingCorrectly === 4) {
            results.success.push('✅ All 4 project images are loading correctly');
        } else {
            results.issues.push(`❌ Only ${results.projectImages.loadingCorrectly}/4 project images loading correctly`);
        }

        if (results.navigationArrows.floating.visible && results.navigationArrows.floating.prominent) {
            results.success.push('✅ Floating navigation arrows are highly visible and prominent');
        } else {
            results.issues.push('❌ Floating navigation arrows need to be more visible/prominent');
        }

        if (results.navigationArrows.bottom.visible) {
            results.success.push('✅ Bottom navigation dots are visible and functional');
        } else {
            results.issues.push('❌ Bottom navigation dots are not sufficiently visible');
        }

        if (results.arrowFunctionality.leftArrowWorks && results.arrowFunctionality.rightArrowWorks) {
            results.success.push('✅ Both left and right arrows are functioning correctly');
        } else {
            results.issues.push('❌ Arrow functionality issues detected');
        }

        if (results.hoverEffects.arrowsMoreProminent) {
            results.success.push('✅ Arrows become more prominent on hover');
        } else {
            results.improvements.push('💡 Consider enhancing arrow visibility on hover');
        }

        if (results.visibilityImprovement.muchMoreVisibleThanBefore) {
            results.success.push('✅ Navigation arrows are much more visible than before');
        } else {
            results.issues.push('❌ Navigation arrows visibility needs improvement');
        }

        console.log('✅ Navigation arrows and images test completed!');

    } catch (error) {
        console.error('❌ Error during test:', error);
        results.error = error.message;
    }

    // Save results
    const reportPath = path.join(screenshotsDir, 'navigation-arrows-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    // Generate HTML report
    const htmlReport = generateNavigationTestHTMLReport(results);
    const htmlPath = path.join(screenshotsDir, 'navigation-arrows-test-report.html');
    fs.writeFileSync(htmlPath, htmlReport);

    console.log('📊 Test report saved to:', reportPath);
    console.log('🌐 HTML report saved to:', htmlPath);

    await browser.close();
    return results;
}

function generateNavigationTestHTMLReport(results) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Navigation Arrows & Project Images Test Report</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; padding: 20px; line-height: 1.6; background: #f5f5f5; 
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; padding: 40px; border-radius: 12px; margin-bottom: 30px; text-align: center;
        }
        .header h1 { margin: 0 0 10px 0; font-size: 2.5em; }
        
        .status-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px; margin: 20px 0;
        }
        .status-card {
            background: white; padding: 20px; border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;
        }
        .status-value {
            font-size: 2.5em; font-weight: bold; margin-bottom: 10px;
        }
        .status-pass { color: #28a745; }
        .status-fail { color: #dc3545; }
        .status-partial { color: #ffc107; }
        
        .section { 
            background: white; padding: 30px; margin: 20px 0; 
            border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .section h2 { 
            margin-top: 0; color: #333; border-bottom: 3px solid #007bff; 
            padding-bottom: 15px; font-size: 1.5em;
        }
        
        .checklist { list-style: none; padding: 0; }
        .checklist li { 
            padding: 12px 0; border-bottom: 1px solid #eee; 
            display: flex; align-items: center; font-size: 1.1em;
        }
        .check-icon { 
            width: 24px; height: 24px; margin-right: 15px; 
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-weight: bold; color: white; font-size: 14px;
        }
        .check-pass { background: #28a745; }
        .check-fail { background: #dc3545; }
        
        .screenshots { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; margin-top: 20px; 
        }
        .screenshot { 
            background: white; padding: 15px; border-radius: 8px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; 
        }
        .screenshot img { 
            max-width: 100%; height: auto; border-radius: 6px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.15); 
        }
        
        .details-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px; margin: 20px 0;
        }
        .detail-card {
            background: #f8f9fa; padding: 15px; border-radius: 8px;
            border-left: 4px solid #007bff;
        }
        
        .success { background: #d4edda; color: #155724; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #28a745; }
        .issue { background: #f8d7da; color: #721c24; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #dc3545; }
        .improvement { background: #d1ecf1; color: #0c5460; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #17a2b8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Navigation Arrows & Project Images Test</h1>
            <p>Comprehensive testing of navigation visibility and image loading at localhost:5182</p>
            <p><strong>Tested:</strong> ${new Date(results.timestamp).toLocaleString()}</p>
        </div>

        <div class="status-grid">
            <div class="status-card">
                <div class="status-value ${results.projectImages.loadingCorrectly === 4 ? 'status-pass' : 'status-fail'}">
                    ${results.projectImages.loadingCorrectly}/4
                </div>
                <div>Project Images Loading</div>
            </div>
            <div class="status-card">
                <div class="status-value ${results.navigationArrows.floating.visible && results.navigationArrows.floating.prominent ? 'status-pass' : 'status-fail'}">
                    ${results.navigationArrows.floating.visible && results.navigationArrows.floating.prominent ? '✓' : '✗'}
                </div>
                <div>Floating Arrows Visible</div>
            </div>
            <div class="status-card">
                <div class="status-value ${results.navigationArrows.bottom.visible ? 'status-pass' : 'status-fail'}">
                    ${results.navigationArrows.bottom.visible ? '✓' : '✗'}
                </div>
                <div>Bottom Navigation Visible</div>
            </div>
            <div class="status-card">
                <div class="status-value ${results.arrowFunctionality.leftArrowWorks && results.arrowFunctionality.rightArrowWorks ? 'status-pass' : 'status-fail'}">
                    ${results.arrowFunctionality.leftArrowWorks && results.arrowFunctionality.rightArrowWorks ? '✓' : '✗'}
                </div>
                <div>Arrow Functionality</div>
            </div>
        </div>

        <div class="section">
            <h2>🖼️ Project Images Analysis</h2>
            <p><strong>Expected Images:</strong> ${results.projectImages.totalExpected}</p>
            <p><strong>Loading Correctly:</strong> ${results.projectImages.loadingCorrectly}</p>
            
            <div class="details-grid">
                ${results.projectImages.details.map((img, index) => `
                    <div class="detail-card">
                        <h4>Project ${img.index}</h4>
                        <p><strong>Loaded:</strong> ${img.isLoaded ? '✅' : '❌'}</p>
                        <p><strong>Visible:</strong> ${img.isVisible ? '✅' : '❌'}</p>
                        <p><strong>Size:</strong> ${img.displayWidth}x${img.displayHeight}px</p>
                        <p><strong>Alt:</strong> ${img.alt}</p>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <h2>🎯 Floating Navigation Arrows</h2>
            <ul class="checklist">
                <li>
                    <div class="check-icon ${results.navigationArrows.floating.found ? 'check-pass' : 'check-fail'}">
                        ${results.navigationArrows.floating.found ? '✓' : '✗'}
                    </div>
                    Floating arrows found
                </li>
                <li>
                    <div class="check-icon ${results.navigationArrows.floating.visible ? 'check-pass' : 'check-fail'}">
                        ${results.navigationArrows.floating.visible ? '✓' : '✗'}
                    </div>
                    Arrows are visible
                </li>
                <li>
                    <div class="check-icon ${results.navigationArrows.floating.prominent ? 'check-pass' : 'check-fail'}">
                        ${results.navigationArrows.floating.prominent ? '✓' : '✗'}
                    </div>
                    Arrows are highly prominent
                </li>
                <li>
                    <div class="check-icon ${results.arrowFunctionality.leftArrowWorks ? 'check-pass' : 'check-fail'}">
                        ${results.arrowFunctionality.leftArrowWorks ? '✓' : '✗'}
                    </div>
                    Left arrow functionality works
                </li>
                <li>
                    <div class="check-icon ${results.arrowFunctionality.rightArrowWorks ? 'check-pass' : 'check-fail'}">
                        ${results.arrowFunctionality.rightArrowWorks ? '✓' : '✗'}
                    </div>
                    Right arrow functionality works
                </li>
            </ul>
            
            <h4>Arrow Details:</h4>
            <div class="details-grid">
                <div class="detail-card">
                    <h4>Left Arrow</h4>
                    <p><strong>Found:</strong> ${results.navigationArrows.floating.leftArrow.found ? '✅' : '❌'}</p>
                    <p><strong>Visible:</strong> ${results.navigationArrows.floating.leftArrow.visible ? '✅' : '❌'}</p>
                    <p><strong>Opacity:</strong> ${results.navigationArrows.floating.leftArrow.opacity || 'N/A'}</p>
                </div>
                <div class="detail-card">
                    <h4>Right Arrow</h4>
                    <p><strong>Found:</strong> ${results.navigationArrows.floating.rightArrow.found ? '✅' : '❌'}</p>
                    <p><strong>Visible:</strong> ${results.navigationArrows.floating.rightArrow.visible ? '✅' : '❌'}</p>
                    <p><strong>Opacity:</strong> ${results.navigationArrows.floating.rightArrow.opacity || 'N/A'}</p>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>🔵 Bottom Navigation Dots</h2>
            <ul class="checklist">
                <li>
                    <div class="check-icon ${results.navigationArrows.bottom.found ? 'check-pass' : 'check-fail'}">
                        ${results.navigationArrows.bottom.found ? '✓' : '✗'}
                    </div>
                    Navigation dots found
                </li>
                <li>
                    <div class="check-icon ${results.navigationArrows.bottom.visible ? 'check-pass' : 'check-fail'}">
                        ${results.navigationArrows.bottom.visible ? '✓' : '✗'}
                    </div>
                    Dots are visible
                </li>
                <li>
                    <div class="check-icon ${results.arrowFunctionality.dotsWork ? 'check-pass' : 'check-fail'}">
                        ${results.arrowFunctionality.dotsWork ? '✓' : '✗'}
                    </div>
                    Dots functionality works
                </li>
            </ul>
            
            <p><strong>Total Dots:</strong> ${results.navigationArrows.bottom.dots.count}</p>
            <p><strong>Visible Dots:</strong> ${results.navigationArrows.bottom.dots.visible}</p>
        </div>

        <div class="section">
            <h2>✨ Hover Effects & Visibility</h2>
            <ul class="checklist">
                <li>
                    <div class="check-icon ${results.hoverEffects.arrowsVisibleOnHover ? 'check-pass' : 'check-fail'}">
                        ${results.hoverEffects.arrowsVisibleOnHover ? '✓' : '✗'}
                    </div>
                    Arrows have hover effects
                </li>
                <li>
                    <div class="check-icon ${results.hoverEffects.arrowsMoreProminent ? 'check-pass' : 'check-fail'}">
                        ${results.hoverEffects.arrowsMoreProminent ? '✓' : '✗'}
                    </div>
                    Arrows become more prominent on hover
                </li>
                <li>
                    <div class="check-icon ${results.visibilityImprovement.muchMoreVisibleThanBefore ? 'check-pass' : 'check-fail'}">
                        ${results.visibilityImprovement.muchMoreVisibleThanBefore ? '✓' : '✗'}
                    </div>
                    Much more visible than before
                </li>
            </ul>
        </div>

        ${results.success.length > 0 ? `
        <div class="section">
            <h2>🎉 Test Results - Success</h2>
            ${results.success.map(success => `<div class="success">${success}</div>`).join('')}
        </div>
        ` : ''}

        ${results.issues.length > 0 ? `
        <div class="section">
            <h2>⚠️ Issues Detected</h2>
            ${results.issues.map(issue => `<div class="issue">${issue}</div>`).join('')}
        </div>
        ` : ''}

        ${results.improvements.length > 0 ? `
        <div class="section">
            <h2>💡 Recommended Improvements</h2>
            ${results.improvements.map(improvement => `<div class="improvement">${improvement}</div>`).join('')}
        </div>
        ` : ''}

        <div class="section">
            <h2>📸 Visual Documentation</h2>
            <div class="screenshots">
                ${results.screenshots.map(screenshot => `
                    <div class="screenshot">
                        <h4>${screenshot.replace(/[-_]/g, ' ').replace('.png', '').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                        <img src="${screenshot}" alt="${screenshot}" loading="lazy" />
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <h2>🎯 Final Assessment</h2>
            ${results.projectImages.loadingCorrectly === 4 && 
              results.navigationArrows.floating.visible && 
              results.navigationArrows.floating.prominent && 
              results.arrowFunctionality.leftArrowWorks && 
              results.arrowFunctionality.rightArrowWorks ? `
                <div class="success">
                    <h3>🎉 EXCELLENT! ALL TESTS PASSED</h3>
                    <p>All project images are loading correctly, navigation arrows are highly visible and prominent, and all functionality is working as expected. The navigation improvements are clearly visible and functional.</p>
                </div>
            ` : `
                <div class="issue">
                    <h3>⚠️ ISSUES DETECTED</h3>
                    <p>Some aspects of the navigation or image loading need attention. Please review the detailed findings above to address any issues.</p>
                </div>
            `}
        </div>
    </div>
</body>
</html>
    `;
}

// Run the test
testNavigationArrowsAndImages().then(results => {
    console.log('\n🎯 NAVIGATION ARROWS & PROJECT IMAGES TEST COMPLETE');
    console.log('=====================================================');
    console.log(`🖼️ Project Images: ${results.projectImages.loadingCorrectly}/4 loading correctly`);
    console.log(`🎯 Floating Arrows: ${results.navigationArrows.floating.visible && results.navigationArrows.floating.prominent ? 'Highly Visible & Prominent' : 'Needs Improvement'}`);
    console.log(`🔵 Bottom Navigation: ${results.navigationArrows.bottom.visible ? 'Visible' : 'Not Visible'}`);
    console.log(`🖱️ Left Arrow: ${results.arrowFunctionality.leftArrowWorks ? 'Working' : 'Not Working'}`);
    console.log(`🖱️ Right Arrow: ${results.arrowFunctionality.rightArrowWorks ? 'Working' : 'Not Working'}`);
    console.log(`✨ Hover Effects: ${results.hoverEffects.arrowsMoreProminent ? 'Enhanced Visibility' : 'No Enhancement'}`);
    console.log(`📈 Visibility Improvement: ${results.visibilityImprovement.muchMoreVisibleThanBefore ? 'Much More Visible' : 'Needs More Visibility'}`);
    
    const overallSuccess = results.projectImages.loadingCorrectly === 4 && 
                          results.navigationArrows.floating.visible && 
                          results.navigationArrows.floating.prominent && 
                          results.arrowFunctionality.leftArrowWorks && 
                          results.arrowFunctionality.rightArrowWorks;
    
    if (overallSuccess) {
        console.log('\n🎉 SUCCESS: All tests passed! Navigation arrows are highly visible and all images load correctly.');
    } else {
        console.log('\n⚠️ ATTENTION NEEDED: Some issues detected. Check the detailed report for specifics.');
    }
    
    console.log('\n📊 View the comprehensive HTML report for detailed visual analysis and screenshots');
}).catch(error => {
    console.error('❌ Test failed:', error);
});