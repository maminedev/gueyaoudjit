import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeSimplifiedProjects() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();
    
    // Create screenshots directory
    const screenshotsDir = path.join(__dirname, 'simplified-analysis-screenshots');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir);
    }

    const results = {
        timestamp: new Date().toISOString(),
        url: 'http://localhost:5181',
        analysis: {
            designSimplicity: {},
            visitButtons: {},
            hoverEffects: {},
            cleanDesign: {},
            userFriendliness: {}
        },
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

        // Wait for page to fully load
        await page.waitForTimeout(3000);

        // Scroll to projects section
        console.log('📍 Scrolling to projects section...');
        await page.evaluate(() => {
            const projectsSection = document.querySelector('#projects') || 
                                  document.querySelector('[id*="project"]') ||
                                  document.querySelector('.projects') ||
                                  document.querySelector('[class*="project"]');
            if (projectsSection) {
                projectsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });

        await page.waitForTimeout(2000);

        // 1. Take initial screenshot of projects section
        console.log('📸 Taking initial projects section screenshot...');
        const projectsRect = await page.evaluate(() => {
            const section = document.querySelector('#projects') || 
                           document.querySelector('[id*="project"]') ||
                           document.querySelector('.projects') ||
                           document.querySelector('[class*="project"]');
            if (section) {
                const rect = section.getBoundingClientRect();
                return {
                    x: rect.left,
                    y: rect.top + window.scrollY,
                    width: rect.width,
                    height: rect.height
                };
            }
            return null;
        });

        if (projectsRect) {
            await page.screenshot({
                path: path.join(screenshotsDir, 'projects-initial-view.png'),
                clip: projectsRect,
                fullPage: false
            });
            results.screenshots.push('projects-initial-view.png');
        }

        // 2. Analyze project card design simplicity
        console.log('🎨 Analyzing project card design simplicity...');
        const cardAnalysis = await page.evaluate(() => {
            const cards = document.querySelectorAll('[class*="project"]');
            const analysis = {
                totalCards: cards.length,
                cardElements: [],
                designComplexity: 'unknown',
                visualClutter: false,
                cleanLayout: false
            };

            cards.forEach((card, index) => {
                const cardInfo = {
                    index,
                    className: card.className,
                    childrenCount: card.children.length,
                    hasImage: !!card.querySelector('img'),
                    hasTitle: !!card.querySelector('h1, h2, h3, h4, h5, h6'),
                    hasDescription: !!card.querySelector('p'),
                    hasButtons: card.querySelectorAll('button, a[href]').length,
                    buttonTypes: [],
                    styles: {
                        backgroundColor: getComputedStyle(card).backgroundColor,
                        border: getComputedStyle(card).border,
                        borderRadius: getComputedStyle(card).borderRadius,
                        boxShadow: getComputedStyle(card).boxShadow,
                        padding: getComputedStyle(card).padding
                    }
                };

                // Analyze buttons
                const buttons = card.querySelectorAll('button, a[href]');
                buttons.forEach(btn => {
                    cardInfo.buttonTypes.push({
                        text: btn.textContent.trim(),
                        type: btn.tagName.toLowerCase(),
                        className: btn.className,
                        isVisitButton: btn.textContent.toLowerCase().includes('visit')
                    });
                });

                analysis.cardElements.push(cardInfo);
            });

            // Determine design complexity
            const avgChildrenCount = analysis.cardElements.reduce((sum, card) => sum + card.childrenCount, 0) / analysis.cardElements.length;
            analysis.designComplexity = avgChildrenCount <= 5 ? 'simple' : avgChildrenCount <= 10 ? 'moderate' : 'complex';
            
            // Check for visual clutter
            analysis.visualClutter = analysis.cardElements.some(card => 
                card.childrenCount > 8 || card.buttonTypes.length > 3
            );

            // Check for clean layout
            analysis.cleanLayout = analysis.cardElements.every(card =>
                card.hasImage && card.hasTitle && card.buttonTypes.length <= 2
            );

            return analysis;
        });

        results.analysis.designSimplicity = cardAnalysis;

        // 3. Test "Visit" buttons functionality
        console.log('🔗 Testing Visit button functionality...');
        const visitButtonAnalysis = await page.evaluate(() => {
            const visitButtons = [];
            const allButtons = document.querySelectorAll('button, a[href]');
            
            allButtons.forEach((btn, index) => {
                const text = btn.textContent.trim().toLowerCase();
                if (text.includes('visit')) {
                    visitButtons.push({
                        index,
                        text: btn.textContent.trim(),
                        tagName: btn.tagName.toLowerCase(),
                        href: btn.getAttribute('href'),
                        hasHref: !!btn.getAttribute('href'),
                        isWorking: btn.tagName.toLowerCase() === 'a' && !!btn.getAttribute('href'),
                        styles: {
                            backgroundColor: getComputedStyle(btn).backgroundColor,
                            color: getComputedStyle(btn).color,
                            border: getComputedStyle(btn).border,
                            borderRadius: getComputedStyle(btn).borderRadius,
                            padding: getComputedStyle(btn).padding,
                            fontSize: getComputedStyle(btn).fontSize
                        }
                    });
                }
            });

            return {
                totalVisitButtons: visitButtons.length,
                buttons: visitButtons,
                allButtonsWorking: visitButtons.every(btn => btn.isWorking),
                hasSimpleDesign: visitButtons.every(btn => 
                    btn.text.length <= 10 && 
                    !btn.styles.border.includes('gradient') &&
                    !btn.styles.backgroundColor.includes('gradient')
                )
            };
        });

        results.analysis.visitButtons = visitButtonAnalysis;

        // 4. Test hover effects on cards
        console.log('✨ Testing hover effects...');
        const hoverEffectsAnalysis = await page.evaluate(async () => {
            const cards = document.querySelectorAll('[class*="project"]');
            const hoverAnalysis = {
                totalCards: cards.length,
                cardsWithHoverEffects: 0,
                hoverDetails: [],
                subtleEffects: true
            };

            for (let i = 0; i < cards.length && i < 3; i++) {
                const card = cards[i];
                const initialStyles = {
                    transform: getComputedStyle(card).transform,
                    boxShadow: getComputedStyle(card).boxShadow,
                    scale: getComputedStyle(card).scale,
                    opacity: getComputedStyle(card).opacity
                };

                // Simulate hover
                card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                
                // Wait a bit for transitions
                await new Promise(resolve => setTimeout(resolve, 300));

                const hoverStyles = {
                    transform: getComputedStyle(card).transform,
                    boxShadow: getComputedStyle(card).boxShadow,
                    scale: getComputedStyle(card).scale,
                    opacity: getComputedStyle(card).opacity
                };

                const hasHoverEffect = 
                    initialStyles.transform !== hoverStyles.transform ||
                    initialStyles.boxShadow !== hoverStyles.boxShadow ||
                    initialStyles.scale !== hoverStyles.scale ||
                    initialStyles.opacity !== hoverStyles.opacity;

                if (hasHoverEffect) {
                    hoverAnalysis.cardsWithHoverEffects++;
                }

                hoverAnalysis.hoverDetails.push({
                    cardIndex: i,
                    hasEffect: hasHoverEffect,
                    changes: {
                        transform: initialStyles.transform !== hoverStyles.transform,
                        boxShadow: initialStyles.boxShadow !== hoverStyles.boxShadow,
                        scale: initialStyles.scale !== hoverStyles.scale,
                        opacity: initialStyles.opacity !== hoverStyles.opacity
                    },
                    initialStyles,
                    hoverStyles
                });

                // Remove hover
                card.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            return hoverAnalysis;
        });

        results.analysis.hoverEffects = hoverEffectsAnalysis;

        // 5. Take screenshot during hover state
        console.log('📸 Taking hover state screenshot...');
        await page.evaluate(() => {
            const firstCard = document.querySelector('[class*="project"]');
            if (firstCard) {
                firstCard.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            }
        });

        await page.waitForTimeout(500);

        if (projectsRect) {
            await page.screenshot({
                path: path.join(screenshotsDir, 'projects-hover-state.png'),
                clip: projectsRect,
                fullPage: false
            });
            results.screenshots.push('projects-hover-state.png');
        }

        // Remove hover
        await page.evaluate(() => {
            const firstCard = document.querySelector('[class*="project"]');
            if (firstCard) {
                firstCard.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
            }
        });

        // 6. Analyze overall clean design
        console.log('🧹 Analyzing overall clean design...');
        const cleanDesignAnalysis = await page.evaluate(() => {
            const section = document.querySelector('#projects') || 
                           document.querySelector('[id*="project"]') ||
                           document.querySelector('.projects') ||
                           document.querySelector('[class*="project"]').closest('section');

            if (!section) return { error: 'Projects section not found' };

            const analysis = {
                sectionStyles: {
                    backgroundColor: getComputedStyle(section).backgroundColor,
                    padding: getComputedStyle(section).padding,
                    margin: getComputedStyle(section).margin
                },
                layout: {
                    displayType: getComputedStyle(section).display,
                    flexDirection: getComputedStyle(section).flexDirection,
                    gap: getComputedStyle(section).gap,
                    gridTemplate: getComputedStyle(section).gridTemplate
                },
                childrenCount: section.children.length,
                hasTitle: !!section.querySelector('h1, h2, h3'),
                hasSubtitle: !!section.querySelector('p'),
                totalElements: section.querySelectorAll('*').length,
                isMinimal: false,
                whitespace: {
                    hasAdequatePadding: false,
                    hasCleanMargins: false
                }
            };

            // Check if design is minimal
            analysis.isMinimal = analysis.totalElements < 50 && analysis.childrenCount < 10;

            // Check whitespace
            const padding = parseFloat(getComputedStyle(section).paddingTop);
            analysis.whitespace.hasAdequatePadding = padding >= 20;
            analysis.whitespace.hasCleanMargins = !getComputedStyle(section).margin.includes('auto');

            return analysis;
        });

        results.analysis.cleanDesign = cleanDesignAnalysis;

        // 7. User-friendliness assessment
        console.log('👤 Assessing user-friendliness...');
        const userFriendlinessAnalysis = await page.evaluate(() => {
            const cards = document.querySelectorAll('[class*="project"]');
            const analysis = {
                readability: {
                    hasReadableFonts: true,
                    hasGoodContrast: true,
                    appropriateFontSizes: true
                },
                navigation: {
                    clearCallToActions: 0,
                    totalInteractiveElements: 0
                },
                accessibility: {
                    hasAltTexts: 0,
                    hasAriaLabels: 0,
                    totalImages: 0
                },
                overallScore: 0
            };

            cards.forEach(card => {
                // Check readability
                const title = card.querySelector('h1, h2, h3, h4, h5, h6');
                if (title) {
                    const fontSize = parseFloat(getComputedStyle(title).fontSize);
                    if (fontSize < 16) analysis.readability.appropriateFontSizes = false;
                }

                // Check navigation
                const buttons = card.querySelectorAll('button, a[href]');
                buttons.forEach(btn => {
                    analysis.navigation.totalInteractiveElements++;
                    if (btn.textContent.toLowerCase().includes('visit') || 
                        btn.textContent.toLowerCase().includes('view') ||
                        btn.textContent.toLowerCase().includes('demo')) {
                        analysis.navigation.clearCallToActions++;
                    }
                });

                // Check accessibility
                const images = card.querySelectorAll('img');
                images.forEach(img => {
                    analysis.accessibility.totalImages++;
                    if (img.alt) analysis.accessibility.hasAltTexts++;
                });

                const ariaElements = card.querySelectorAll('[aria-label]');
                analysis.accessibility.hasAriaLabels += ariaElements.length;
            });

            // Calculate overall score (0-100)
            let score = 0;
            if (analysis.readability.appropriateFontSizes) score += 25;
            if (analysis.navigation.clearCallToActions > 0) score += 25;
            if (analysis.accessibility.hasAltTexts / Math.max(analysis.accessibility.totalImages, 1) > 0.8) score += 25;
            if (cards.length > 0 && cards.length <= 6) score += 25; // Not overwhelming

            analysis.overallScore = score;

            return analysis;
        });

        results.analysis.userFriendliness = userFriendlinessAnalysis;

        // 8. Take final full section screenshot
        console.log('📸 Taking final full section screenshot...');
        await page.screenshot({
            path: path.join(screenshotsDir, 'projects-final-analysis.png'),
            fullPage: true
        });
        results.screenshots.push('projects-final-analysis.png');

        // 9. Generate issues and improvements based on analysis
        if (results.analysis.designSimplicity.designComplexity === 'complex') {
            results.issues.push('Design complexity is high - consider simplifying card structure');
        }

        if (results.analysis.designSimplicity.visualClutter) {
            results.issues.push('Visual clutter detected - reduce number of elements per card');
        }

        if (!results.analysis.visitButtons.allButtonsWorking) {
            results.issues.push('Some Visit buttons are not properly functional');
        }

        if (results.analysis.hoverEffects.cardsWithHoverEffects === 0) {
            results.improvements.push('Consider adding subtle hover effects for better user interaction');
        }

        if (results.analysis.userFriendliness.overallScore < 75) {
            results.improvements.push('User-friendliness score is below 75% - consider improving accessibility and navigation');
        }

        // If no issues found, add positive feedback
        if (results.issues.length === 0) {
            results.improvements.push('Design appears clean and simplified as requested');
        }

        console.log('✅ Analysis completed successfully!');

    } catch (error) {
        console.error('❌ Error during analysis:', error);
        results.error = error.message;
    }

    // Save analysis results
    const reportPath = path.join(screenshotsDir, 'simplified-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    // Generate HTML report
    const htmlReport = generateHTMLReport(results);
    const htmlPath = path.join(screenshotsDir, 'simplified-analysis-report.html');
    fs.writeFileSync(htmlPath, htmlReport);

    console.log('📊 Analysis report saved to:', reportPath);
    console.log('🌐 HTML report saved to:', htmlPath);

    await browser.close();
    return results;
}

function generateHTMLReport(results) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simplified Projects Section Analysis Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; line-height: 1.6; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
        .section { background: #f8f9fa; padding: 25px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #007bff; }
        .metric { display: inline-block; background: white; padding: 15px; margin: 10px; border-radius: 6px; min-width: 200px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .score { font-size: 24px; font-weight: bold; color: #28a745; }
        .issue { background: #f8d7da; color: #721c24; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .improvement { background: #d1ecf1; color: #0c5460; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .screenshots { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
        .screenshot { text-align: center; }
        .screenshot img { max-width: 100%; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        pre { background: #f1f3f4; padding: 15px; border-radius: 6px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎨 Simplified Projects Section Analysis Report</h1>
        <p>Comprehensive analysis of the simplified project section design</p>
        <p><strong>Analyzed:</strong> ${results.timestamp}</p>
        <p><strong>URL:</strong> ${results.url}</p>
    </div>

    <div class="section">
        <h2>📊 Analysis Summary</h2>
        <div class="metric">
            <div>Total Project Cards</div>
            <div class="score">${results.analysis.designSimplicity.totalCards || 0}</div>
        </div>
        <div class="metric">
            <div>Design Complexity</div>
            <div class="score">${results.analysis.designSimplicity.designComplexity || 'Unknown'}</div>
        </div>
        <div class="metric">
            <div>Visit Buttons Working</div>
            <div class="score">${results.analysis.visitButtons.allButtonsWorking ? '✅ Yes' : '❌ No'}</div>
        </div>
        <div class="metric">
            <div>User-Friendliness Score</div>
            <div class="score">${results.analysis.userFriendliness.overallScore || 0}%</div>
        </div>
    </div>

    <div class="section">
        <h2>🎨 Design Simplicity Analysis</h2>
        <p><strong>Visual Clutter:</strong> ${results.analysis.designSimplicity.visualClutter ? '❌ Detected' : '✅ Clean'}</p>
        <p><strong>Clean Layout:</strong> ${results.analysis.designSimplicity.cleanLayout ? '✅ Yes' : '❌ Needs improvement'}</p>
        <p><strong>Average Elements per Card:</strong> ${Math.round((results.analysis.designSimplicity.cardElements?.reduce((sum, card) => sum + card.childrenCount, 0) || 0) / (results.analysis.designSimplicity.totalCards || 1))}</p>
    </div>

    <div class="section">
        <h2>🔗 Visit Buttons Analysis</h2>
        <p><strong>Total Visit Buttons:</strong> ${results.analysis.visitButtons.totalVisitButtons || 0}</p>
        <p><strong>All Buttons Working:</strong> ${results.analysis.visitButtons.allButtonsWorking ? '✅ Yes' : '❌ No'}</p>
        <p><strong>Simple Design:</strong> ${results.analysis.visitButtons.hasSimpleDesign ? '✅ Yes' : '❌ Too complex'}</p>
    </div>

    <div class="section">
        <h2>✨ Hover Effects Analysis</h2>
        <p><strong>Cards with Hover Effects:</strong> ${results.analysis.hoverEffects.cardsWithHoverEffects || 0} / ${results.analysis.hoverEffects.totalCards || 0}</p>
        <p><strong>Effects are Subtle:</strong> ${results.analysis.hoverEffects.subtleEffects ? '✅ Yes' : '❌ Too dramatic'}</p>
    </div>

    <div class="section">
        <h2>🧹 Clean Design Assessment</h2>
        <p><strong>Is Minimal:</strong> ${results.analysis.cleanDesign.isMinimal ? '✅ Yes' : '❌ Too cluttered'}</p>
        <p><strong>Total Elements:</strong> ${results.analysis.cleanDesign.totalElements || 0}</p>
        <p><strong>Adequate Padding:</strong> ${results.analysis.cleanDesign.whitespace?.hasAdequatePadding ? '✅ Yes' : '❌ Needs improvement'}</p>
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

    ${results.issues.length === 0 ? `
    <div class="section">
        <div class="success">🎉 No major issues found! The design appears clean and simplified as requested.</div>
    </div>
    ` : ''}

    <div class="section">
        <h2>📸 Screenshots Captured</h2>
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
        <h2>📋 Detailed Analysis Data</h2>
        <pre>${JSON.stringify(results.analysis, null, 2)}</pre>
    </div>
</body>
</html>
    `;
}

// Run the analysis
analyzeSimplifiedProjects().then(results => {
    console.log('\n🎯 ANALYSIS COMPLETE');
    console.log('===================');
    console.log(`✅ Total Cards Analyzed: ${results.analysis.designSimplicity.totalCards || 0}`);
    console.log(`🎨 Design Complexity: ${results.analysis.designSimplicity.designComplexity || 'Unknown'}`);
    console.log(`🔗 Visit Buttons Working: ${results.analysis.visitButtons.allButtonsWorking ? 'Yes' : 'No'}`);
    console.log(`✨ Cards with Hover Effects: ${results.analysis.hoverEffects.cardsWithHoverEffects || 0}`);
    console.log(`👤 User-Friendliness Score: ${results.analysis.userFriendliness.overallScore || 0}%`);
    
    if (results.issues.length === 0) {
        console.log('\n🎉 SUCCESS: Design appears clean and simplified!');
    } else {
        console.log(`\n⚠️  ${results.issues.length} issue(s) found - check the detailed report`);
    }
}).catch(error => {
    console.error('❌ Analysis failed:', error);
});