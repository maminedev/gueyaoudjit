import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function analyzeProjectsCarousel() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();
    
    const screenshotsDir = path.join(__dirname, 'projects-carousel-analysis');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir);
    }

    const results = {
        timestamp: new Date().toISOString(),
        url: 'http://localhost:5181',
        projectCards: [],
        carouselAnalysis: {},
        visitButtonsAnalysis: {},
        designSimplicity: {},
        screenshots: [],
        issues: [],
        improvements: []
    };

    try {
        console.log('🔍 Navigating to localhost:5181...');
        await page.goto('http://localhost:5181', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });

        await wait(3000);

        // Navigate to projects section
        console.log('📍 Navigating to projects section...');
        await page.evaluate(() => {
            const projectsLink = document.querySelector('a[href="#projects"]') || 
                               document.querySelector('nav a:nth-child(3)') ||
                               Array.from(document.querySelectorAll('a')).find(a => 
                                   a.textContent.toLowerCase().includes('project')
                               );
            if (projectsLink) {
                projectsLink.click();
            } else {
                // Try scrolling to projects section
                window.scrollTo(0, window.innerHeight * 2);
            }
        });

        await wait(2000);

        // Take initial projects section screenshot
        console.log('📸 Taking initial projects section screenshot...');
        await page.screenshot({
            path: path.join(screenshotsDir, 'projects-initial.png'),
            fullPage: true
        });
        results.screenshots.push('projects-initial.png');

        // Analyze carousel structure
        console.log('🎠 Analyzing carousel structure...');
        const carouselAnalysis = await page.evaluate(() => {
            const analysis = {
                carouselFound: false,
                carouselContainer: null,
                navigationDots: 0,
                navigationArrows: 0,
                currentSlideVisible: false,
                totalSlides: 0,
                carouselType: 'unknown'
            };

            // Look for carousel indicators/dots
            const dots = document.querySelectorAll('[class*="dot"], [class*="indicator"], .swiper-pagination-bullet, .carousel-indicators > *');
            analysis.navigationDots = dots.length;

            // Look for navigation arrows
            const arrows = document.querySelectorAll('[class*="arrow"], [class*="prev"], [class*="next"], .swiper-button');
            analysis.navigationArrows = arrows.length;

            // Look for carousel containers
            const carouselSelectors = [
                '.swiper-container',
                '.carousel',
                '[class*="slider"]',
                '[class*="carousel"]',
                '.projects-carousel'
            ];

            for (const selector of carouselSelectors) {
                const container = document.querySelector(selector);
                if (container) {
                    analysis.carouselFound = true;
                    analysis.carouselContainer = selector;
                    analysis.carouselType = selector;
                    break;
                }
            }

            return analysis;
        });

        results.carouselAnalysis = carouselAnalysis;

        // Try to navigate through carousel slides to find project cards
        console.log('🔄 Attempting to navigate carousel slides...');
        const projectCardsData = await page.evaluate(async () => {
            const cards = [];
            const maxSlides = 5; // Reasonable limit
            
            // Function to extract current slide data
            const extractCurrentSlideData = () => {
                // Look for visible project cards
                const visibleCards = Array.from(document.querySelectorAll('*')).filter(el => {
                    const rect = el.getBoundingClientRect();
                    const isVisible = rect.width > 0 && rect.height > 0 && 
                                    rect.top >= 0 && rect.left >= 0 && 
                                    rect.bottom <= window.innerHeight && 
                                    rect.right <= window.innerWidth;
                    
                    // Check if element looks like a project card
                    const hasProjectContent = el.querySelector('img') || 
                                            el.textContent.toLowerCase().includes('project') ||
                                            el.querySelector('button, a[href]');
                    
                    return isVisible && hasProjectContent && 
                           el.tagName !== 'NAV' && el.tagName !== 'HEADER';
                });

                return visibleCards.slice(0, 3).map((card, index) => ({
                    slideIndex: cards.length,
                    cardIndex: index,
                    tagName: card.tagName,
                    className: card.className,
                    textContent: card.textContent.trim().substring(0, 200),
                    hasImage: !!card.querySelector('img'),
                    hasButtons: card.querySelectorAll('button, a[href]').length,
                    buttonTexts: Array.from(card.querySelectorAll('button, a[href]')).map(btn => btn.textContent.trim()),
                    styles: {
                        backgroundColor: getComputedStyle(card).backgroundColor,
                        border: getComputedStyle(card).border,
                        borderRadius: getComputedStyle(card).borderRadius,
                        boxShadow: getComputedStyle(card).boxShadow
                    }
                }));
            };

            // Extract current slide
            const currentSlideCards = extractCurrentSlideData();
            cards.push(...currentSlideCards);

            // Try to navigate to next slides
            for (let i = 0; i < maxSlides; i++) {
                // Look for next button or dot
                const nextButtons = document.querySelectorAll('[class*="next"], [class*="arrow-right"], .swiper-button-next');
                const dots = document.querySelectorAll('[class*="dot"], [class*="indicator"], .swiper-pagination-bullet');
                
                let navigated = false;

                // Try clicking next button
                if (nextButtons.length > 0) {
                    for (const btn of nextButtons) {
                        try {
                            btn.click();
                            navigated = true;
                            break;
                        } catch (e) {
                            continue;
                        }
                    }
                }

                // Try clicking dots
                if (!navigated && dots.length > i + 1) {
                    try {
                        dots[i + 1].click();
                        navigated = true;
                    } catch (e) {
                        // Continue
                    }
                }

                if (!navigated) break;

                // Wait for transition
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Extract new slide data
                const newSlideCards = extractCurrentSlideData();
                
                // Check if we got new content
                if (newSlideCards.length > 0 && 
                    !cards.some(existing => existing.textContent === newSlideCards[0].textContent)) {
                    cards.push(...newSlideCards);
                } else {
                    break; // No new content, probably reached end
                }
            }

            return cards;
        });

        results.projectCards = projectCardsData;

        // Take screenshot of each slide/project
        console.log('📸 Taking screenshots of project slides...');
        for (let i = 0; i < Math.min(3, projectCardsData.length); i++) {
            await page.screenshot({
                path: path.join(screenshotsDir, `project-slide-${i + 1}.png`),
                fullPage: false
            });
            results.screenshots.push(`project-slide-${i + 1}.png`);
            
            // Try to navigate to next slide
            await page.evaluate(() => {
                const nextBtn = document.querySelector('[class*="next"], [class*="arrow-right"], .swiper-button-next');
                if (nextBtn) nextBtn.click();
            });
            await wait(1000);
        }

        // Analyze visit buttons specifically
        console.log('🔗 Analyzing Visit buttons...');
        const visitButtonsAnalysis = await page.evaluate(() => {
            const visitButtons = Array.from(document.querySelectorAll('button, a[href]')).filter(btn => {
                const text = btn.textContent.toLowerCase().trim();
                return text.includes('visit') || text.includes('view') || 
                       text.includes('demo') || text.includes('live') || text.includes('site');
            });

            return {
                totalFound: visitButtons.length,
                buttons: visitButtons.map(btn => ({
                    text: btn.textContent.trim(),
                    tagName: btn.tagName.toLowerCase(),
                    href: btn.getAttribute('href'),
                    isWorking: btn.tagName.toLowerCase() === 'a' && !!btn.getAttribute('href'),
                    isVisible: btn.offsetWidth > 0 && btn.offsetHeight > 0,
                    styles: {
                        backgroundColor: getComputedStyle(btn).backgroundColor,
                        color: getComputedStyle(btn).color,
                        border: getComputedStyle(btn).border,
                        borderRadius: getComputedStyle(btn).borderRadius,
                        padding: getComputedStyle(btn).padding,
                        fontSize: getComputedStyle(btn).fontSize
                    }
                })),
                workingButtons: visitButtons.filter(btn => 
                    btn.tagName.toLowerCase() === 'a' && !!btn.getAttribute('href')
                ).length,
                simpleDesign: visitButtons.every(btn => {
                    const styles = getComputedStyle(btn);
                    return !styles.backgroundColor.includes('gradient') && 
                           !styles.border.includes('gradient') &&
                           btn.textContent.trim().length <= 10;
                })
            };
        });

        results.visitButtonsAnalysis = visitButtonsAnalysis;

        // Test hover effects on visible project elements
        console.log('✨ Testing hover effects...');
        const hoverEffects = await page.evaluate(async () => {
            const projectElements = Array.from(document.querySelectorAll('*')).filter(el => {
                const rect = el.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0;
                const hasProjectContent = el.querySelector('img') || 
                                        el.querySelector('button, a[href]') ||
                                        el.textContent.toLowerCase().includes('project');
                return isVisible && hasProjectContent && el.children.length > 0;
            }).slice(0, 3);

            const hoverResults = [];

            for (const element of projectElements) {
                const initialStyles = {
                    transform: getComputedStyle(element).transform,
                    boxShadow: getComputedStyle(element).boxShadow,
                    scale: getComputedStyle(element).scale,
                    opacity: getComputedStyle(element).opacity
                };

                element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 300));

                const hoverStyles = {
                    transform: getComputedStyle(element).transform,
                    boxShadow: getComputedStyle(element).boxShadow,
                    scale: getComputedStyle(element).scale,
                    opacity: getComputedStyle(element).opacity
                };

                const hasHoverEffect = Object.keys(initialStyles).some(
                    key => initialStyles[key] !== hoverStyles[key]
                );

                hoverResults.push({
                    element: element.className || element.tagName,
                    hasHoverEffect,
                    changes: Object.keys(initialStyles).filter(
                        key => initialStyles[key] !== hoverStyles[key]
                    )
                });

                element.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            return hoverResults;
        });

        results.hoverEffects = hoverEffects;

        // Assess design simplicity
        console.log('🎨 Assessing design simplicity...');
        const designSimplicity = {
            totalProjectElements: projectCardsData.length,
            averageButtonsPerCard: projectCardsData.length > 0 ? 
                projectCardsData.reduce((sum, card) => sum + card.hasButtons, 0) / projectCardsData.length : 0,
            complexityLevel: 'unknown',
            isClean: false,
            isMinimal: false,
            hasVisualClutter: false
        };

        if (designSimplicity.averageButtonsPerCard <= 2) {
            designSimplicity.complexityLevel = 'simple';
            designSimplicity.isClean = true;
        } else if (designSimplicity.averageButtonsPerCard <= 4) {
            designSimplicity.complexityLevel = 'moderate';
        } else {
            designSimplicity.complexityLevel = 'complex';
            designSimplicity.hasVisualClutter = true;
        }

        designSimplicity.isMinimal = projectCardsData.every(card => 
            card.hasButtons <= 2 && card.textContent.length <= 300
        );

        results.designSimplicity = designSimplicity;

        // Take final screenshot
        console.log('📸 Taking final screenshot...');
        await page.screenshot({
            path: path.join(screenshotsDir, 'projects-final.png'),
            fullPage: true
        });
        results.screenshots.push('projects-final.png');

        // Generate analysis results
        if (projectCardsData.length === 0) {
            results.issues.push('No project cards were found or detected');
        }

        if (visitButtonsAnalysis.workingButtons === 0 && visitButtonsAnalysis.totalFound > 0) {
            results.issues.push('Visit buttons found but none are properly functional (missing href)');
        }

        if (visitButtonsAnalysis.totalFound === 0) {
            results.issues.push('No Visit buttons found in the projects section');
        }

        if (hoverEffects.every(effect => !effect.hasHoverEffect)) {
            results.improvements.push('Consider adding subtle hover effects to project cards');
        }

        if (designSimplicity.hasVisualClutter) {
            results.issues.push('Visual clutter detected - too many buttons/elements per card');
        }

        if (designSimplicity.complexityLevel === 'simple' && designSimplicity.isMinimal) {
            results.improvements.push('✅ Design appears clean and simplified as requested!');
        }

        console.log('✅ Projects carousel analysis completed!');

    } catch (error) {
        console.error('❌ Error during analysis:', error);
        results.error = error.message;
    }

    // Save results
    const reportPath = path.join(screenshotsDir, 'projects-carousel-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    // Generate HTML report
    const htmlReport = generateCarouselHTMLReport(results);
    const htmlPath = path.join(screenshotsDir, 'projects-carousel-report.html');
    fs.writeFileSync(htmlPath, htmlReport);

    console.log('📊 Carousel analysis report saved to:', reportPath);
    console.log('🌐 HTML report saved to:', htmlPath);

    await browser.close();
    return results;
}

function generateCarouselHTMLReport(results) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Projects Carousel Analysis Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; line-height: 1.6; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
        .section { background: #f8f9fa; padding: 25px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #007bff; }
        .metric { display: inline-block; background: white; padding: 15px; margin: 10px; border-radius: 6px; min-width: 200px; text-align: center; }
        .score { font-size: 24px; font-weight: bold; color: #28a745; }
        .issue { background: #f8d7da; color: #721c24; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .improvement { background: #d1ecf1; color: #0c5460; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .screenshots { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
        .screenshot { text-align: center; }
        .screenshot img { max-width: 100%; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .card-data { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #28a745; }
        pre { background: #f1f3f4; padding: 15px; border-radius: 6px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎠 Projects Carousel Analysis Report</h1>
        <p>Detailed analysis of the simplified projects carousel/slider</p>
        <p><strong>Analyzed:</strong> ${results.timestamp}</p>
        <p><strong>URL:</strong> ${results.url}</p>
    </div>

    <div class="section">
        <h2>📊 Carousel Overview</h2>
        <div class="metric">
            <div>Project Cards Found</div>
            <div class="score">${results.projectCards.length}</div>
        </div>
        <div class="metric">
            <div>Navigation Dots</div>
            <div class="score">${results.carouselAnalysis.navigationDots || 0}</div>
        </div>
        <div class="metric">
            <div>Navigation Arrows</div>
            <div class="score">${results.carouselAnalysis.navigationArrows || 0}</div>
        </div>
        <div class="metric">
            <div>Visit Buttons Found</div>
            <div class="score">${results.visitButtonsAnalysis.totalFound || 0}</div>
        </div>
    </div>

    <div class="section">
        <h2>🃏 Project Cards Analysis</h2>
        ${results.projectCards.length > 0 ? 
            results.projectCards.map((card, index) => `
                <div class="card-data">
                    <h4>Card ${index + 1} (Slide ${card.slideIndex})</h4>
                    <p><strong>Element:</strong> ${card.tagName} (${card.className})</p>
                    <p><strong>Has Image:</strong> ${card.hasImage ? '✅ Yes' : '❌ No'}</p>
                    <p><strong>Buttons:</strong> ${card.hasButtons}</p>
                    <p><strong>Button Texts:</strong> ${card.buttonTexts.join(', ') || 'None'}</p>
                    <p><strong>Content Preview:</strong> ${card.textContent.substring(0, 150)}...</p>
                </div>
            `).join('') : 
            '<p><em>No project cards detected</em></p>'
        }
    </div>

    <div class="section">
        <h2>🔗 Visit Buttons Analysis</h2>
        <p><strong>Total Found:</strong> ${results.visitButtonsAnalysis.totalFound || 0}</p>
        <p><strong>Working Buttons:</strong> ${results.visitButtonsAnalysis.workingButtons || 0}</p>
        <p><strong>Simple Design:</strong> ${results.visitButtonsAnalysis.simpleDesign ? '✅ Yes' : '❌ No'}</p>
        
        ${results.visitButtonsAnalysis.buttons?.length > 0 ? `
            <h4>Button Details:</h4>
            ${results.visitButtonsAnalysis.buttons.map(btn => `
                <div class="card-data">
                    <p><strong>Text:</strong> "${btn.text}"</p>
                    <p><strong>Type:</strong> ${btn.tagName}</p>
                    <p><strong>Working:</strong> ${btn.isWorking ? '✅ Yes' : '❌ No'}</p>
                    <p><strong>Visible:</strong> ${btn.isVisible ? '✅ Yes' : '❌ No'}</p>
                </div>
            `).join('')}` : ''
        }
    </div>

    <div class="section">
        <h2>🎨 Design Simplicity Assessment</h2>
        <p><strong>Complexity Level:</strong> ${results.designSimplicity.complexityLevel}</p>
        <p><strong>Is Clean:</strong> ${results.designSimplicity.isClean ? '✅ Yes' : '❌ No'}</p>
        <p><strong>Is Minimal:</strong> ${results.designSimplicity.isMinimal ? '✅ Yes' : '❌ No'}</p>
        <p><strong>Has Visual Clutter:</strong> ${results.designSimplicity.hasVisualClutter ? '❌ Yes' : '✅ No'}</p>
        <p><strong>Average Buttons per Card:</strong> ${results.designSimplicity.averageButtonsPerCard.toFixed(1)}</p>
    </div>

    <div class="section">
        <h2>✨ Hover Effects</h2>
        ${results.hoverEffects?.length > 0 ? 
            results.hoverEffects.map(effect => `
                <div class="card-data">
                    <p><strong>Element:</strong> ${effect.element}</p>
                    <p><strong>Has Hover Effect:</strong> ${effect.hasHoverEffect ? '✅ Yes' : '❌ No'}</p>
                    <p><strong>Changes:</strong> ${effect.changes.join(', ') || 'None'}</p>
                </div>
            `).join('') :
            '<p><em>No hover effects tested</em></p>'
        }
    </div>

    ${results.issues.length > 0 ? `
    <div class="section">
        <h2>⚠️ Issues Found</h2>
        ${results.issues.map(issue => `<div class="issue">❌ ${issue}</div>`).join('')}
    </div>
    ` : ''}

    ${results.improvements.length > 0 ? `
    <div class="section">
        <h2>💡 Improvements & Observations</h2>
        ${results.improvements.map(improvement => `<div class="improvement">💡 ${improvement}</div>`).join('')}
    </div>
    ` : ''}

    <div class="section">
        <h2>📸 Screenshots</h2>
        <div class="screenshots">
            ${results.screenshots.map(screenshot => `
                <div class="screenshot">
                    <h4>${screenshot.replace(/[-_]/g, ' ').replace('.png', '').toUpperCase()}</h4>
                    <img src="${screenshot}" alt="${screenshot}" />
                </div>
            `).join('')}
        </div>
    </div>

    <div class="section">
        <h2>📋 Raw Data</h2>
        <pre>${JSON.stringify(results, null, 2)}</pre>
    </div>
</body>
</html>
    `;
}

// Run the analysis
analyzeProjectsCarousel().then(results => {
    console.log('\\n🎯 PROJECTS CAROUSEL ANALYSIS COMPLETE');
    console.log('=====================================');
    console.log(`🃏 Project Cards Found: ${results.projectCards.length}`);
    console.log(`🎠 Navigation Dots: ${results.carouselAnalysis.navigationDots || 0}`);
    console.log(`🔗 Visit Buttons: ${results.visitButtonsAnalysis.totalFound || 0} (${results.visitButtonsAnalysis.workingButtons || 0} working)`);
    console.log(`🎨 Design Complexity: ${results.designSimplicity.complexityLevel}`);
    console.log(`✨ Hover Effects: ${results.hoverEffects?.filter(e => e.hasHoverEffect).length || 0} elements with effects`);
    
    if (results.issues.length === 0) {
        console.log('\\n🎉 SUCCESS: No major issues found!');
    } else {
        console.log(`\\n⚠️  ${results.issues.length} issue(s) found`);
        results.issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    if (results.improvements.length > 0) {
        console.log('\\n💡 Observations:');
        results.improvements.forEach(improvement => console.log(`   - ${improvement}`));
    }
}).catch(error => {
    console.error('❌ Analysis failed:', error);
});