import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
            userFriendliness: {},
            overallAssessment: {}
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
        await wait(3000);

        // Take initial full page screenshot
        console.log('📸 Taking initial full page screenshot...');
        await page.screenshot({
            path: path.join(screenshotsDir, 'full-page-initial.png'),
            fullPage: true
        });
        results.screenshots.push('full-page-initial.png');

        // Scroll to projects section
        console.log('📍 Scrolling to projects section...');
        const projectsSection = await page.evaluate(() => {
            // Try multiple selectors to find projects section
            const selectors = [
                '#projects',
                '[id*="project"]', 
                '.projects',
                '[class*="project"]',
                'section:has([class*="project"])',
                'div:has([class*="project"])'
            ];
            
            for (const selector of selectors) {
                try {
                    const element = document.querySelector(selector);
                    if (element && element.querySelector) {
                        // Check if this element contains project cards
                        const hasProjectCards = element.querySelectorAll('[class*="project"], [class*="card"]').length > 0;
                        if (hasProjectCards) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            return {
                                found: true,
                                selector: selector,
                                cardCount: element.querySelectorAll('[class*="project"], [class*="card"]').length
                            };
                        }
                    }
                } catch (e) {
                    continue;
                }
            }
            
            // If no specific section found, scroll to look for any card-like elements
            const allCards = document.querySelectorAll('[class*="project"], [class*="card"], .grid > div, .flex > div');
            if (allCards.length > 0) {
                allCards[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                return {
                    found: true,
                    selector: 'general-cards',
                    cardCount: allCards.length
                };
            }
            
            return { found: false, selector: null, cardCount: 0 };
        });

        await wait(2000);

        console.log(`📍 Projects section: ${projectsSection.found ? 'Found' : 'Not found'} (${projectsSection.cardCount} cards)`);

        // 1. Take projects section screenshot
        console.log('📸 Taking projects section screenshot...');
        const projectsRect = await page.evaluate(() => {
            const selectors = [
                '#projects',
                '[id*="project"]', 
                '.projects',
                '[class*="project"]'
            ];
            
            for (const selector of selectors) {
                try {
                    const section = document.querySelector(selector);
                    if (section) {
                        const rect = section.getBoundingClientRect();
                        return {
                            x: Math.max(0, rect.left),
                            y: Math.max(0, rect.top + window.scrollY),
                            width: Math.min(window.innerWidth, rect.width),
                            height: Math.min(window.innerHeight, rect.height)
                        };
                    }
                } catch (e) {
                    continue;
                }
            }
            return null;
        });

        if (projectsRect && projectsRect.width > 0 && projectsRect.height > 0) {
            await page.screenshot({
                path: path.join(screenshotsDir, 'projects-section-focused.png'),
                clip: projectsRect,
                fullPage: false
            });
            results.screenshots.push('projects-section-focused.png');
        }

        // 2. Analyze project cards design simplicity
        console.log('🎨 Analyzing project card design simplicity...');
        const cardAnalysis = await page.evaluate(() => {
            // Find all potential project cards
            const cardSelectors = [
                '[class*="project"]',
                '[class*="card"]',
                '.grid > div',
                '.flex > div',
                '[class*="item"]'
            ];
            
            let allCards = [];
            for (const selector of cardSelectors) {
                const elements = Array.from(document.querySelectorAll(selector));
                // Filter to find elements that look like project cards
                const projectCards = elements.filter(el => {
                    const hasImage = !!el.querySelector('img');
                    const hasText = !!el.querySelector('h1, h2, h3, h4, h5, h6, p');
                    const hasButton = !!el.querySelector('button, a[href]');
                    return hasImage || hasText || hasButton;
                });
                allCards = allCards.concat(projectCards);
            }
            
            // Remove duplicates
            allCards = allCards.filter((card, index, self) => self.indexOf(card) === index);

            const analysis = {
                totalCards: allCards.length,
                cardElements: [],
                designComplexity: 'unknown',
                visualClutter: false,
                cleanLayout: false,
                foundCardTypes: []
            };

            allCards.forEach((card, index) => {
                const cardInfo = {
                    index,
                    className: card.className,
                    childrenCount: card.children.length,
                    hasImage: !!card.querySelector('img'),
                    hasTitle: !!card.querySelector('h1, h2, h3, h4, h5, h6'),
                    hasDescription: !!card.querySelector('p'),
                    hasButtons: card.querySelectorAll('button, a[href]').length,
                    buttonTypes: [],
                    textContent: card.textContent.trim().substring(0, 100),
                    styles: {
                        backgroundColor: getComputedStyle(card).backgroundColor,
                        border: getComputedStyle(card).border,
                        borderRadius: getComputedStyle(card).borderRadius,
                        boxShadow: getComputedStyle(card).boxShadow,
                        padding: getComputedStyle(card).padding,
                        margin: getComputedStyle(card).margin
                    }
                };

                // Analyze buttons
                const buttons = card.querySelectorAll('button, a[href]');
                buttons.forEach(btn => {
                    const btnText = btn.textContent.trim();
                    cardInfo.buttonTypes.push({
                        text: btnText,
                        type: btn.tagName.toLowerCase(),
                        className: btn.className,
                        isVisitButton: btnText.toLowerCase().includes('visit') || 
                                      btnText.toLowerCase().includes('view') ||
                                      btnText.toLowerCase().includes('demo') ||
                                      btnText.toLowerCase().includes('live'),
                        href: btn.getAttribute('href')
                    });
                });

                analysis.cardElements.push(cardInfo);
                analysis.foundCardTypes.push(card.className || card.tagName);
            });

            // Determine design complexity
            if (analysis.cardElements.length > 0) {
                const avgChildrenCount = analysis.cardElements.reduce((sum, card) => sum + card.childrenCount, 0) / analysis.cardElements.length;
                analysis.designComplexity = avgChildrenCount <= 5 ? 'simple' : avgChildrenCount <= 10 ? 'moderate' : 'complex';
                
                // Check for visual clutter
                analysis.visualClutter = analysis.cardElements.some(card => 
                    card.childrenCount > 8 || card.buttonTypes.length > 3
                );

                // Check for clean layout
                analysis.cleanLayout = analysis.cardElements.every(card =>
                    (card.hasImage || card.hasTitle) && card.buttonTypes.length <= 2
                );
            }

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
                const isVisitButton = text.includes('visit') || 
                                    text.includes('view') || 
                                    text.includes('demo') ||
                                    text.includes('live') ||
                                    text.includes('site');
                
                if (isVisitButton) {
                    visitButtons.push({
                        index,
                        text: btn.textContent.trim(),
                        tagName: btn.tagName.toLowerCase(),
                        href: btn.getAttribute('href'),
                        hasHref: !!btn.getAttribute('href'),
                        isWorking: btn.tagName.toLowerCase() === 'a' && !!btn.getAttribute('href'),
                        target: btn.getAttribute('target'),
                        styles: {
                            backgroundColor: getComputedStyle(btn).backgroundColor,
                            color: getComputedStyle(btn).color,
                            border: getComputedStyle(btn).border,
                            borderRadius: getComputedStyle(btn).borderRadius,
                            padding: getComputedStyle(btn).padding,
                            fontSize: getComputedStyle(btn).fontSize,
                            fontWeight: getComputedStyle(btn).fontWeight
                        }
                    });
                }
            });

            return {
                totalVisitButtons: visitButtons.length,
                buttons: visitButtons,
                allButtonsWorking: visitButtons.length > 0 && visitButtons.every(btn => btn.isWorking),
                hasSimpleDesign: visitButtons.every(btn => 
                    btn.text.length <= 15 && 
                    !btn.styles.backgroundColor.includes('gradient') &&
                    !btn.styles.border.includes('gradient')
                ),
                buttonTexts: visitButtons.map(btn => btn.text)
            };
        });

        results.analysis.visitButtons = visitButtonAnalysis;

        // 4. Test hover effects if cards found
        console.log('✨ Testing hover effects...');
        const hoverEffectsAnalysis = await page.evaluate(async () => {
            const cardSelectors = ['[class*="project"]', '[class*="card"]', '.grid > div'];
            let cards = [];
            
            for (const selector of cardSelectors) {
                const elements = Array.from(document.querySelectorAll(selector));
                const projectCards = elements.filter(el => {
                    const hasContent = el.querySelector('img, h1, h2, h3, h4, h5, h6, p, button, a');
                    return hasContent && el.offsetWidth > 0 && el.offsetHeight > 0;
                });
                cards = cards.concat(projectCards);
            }
            
            // Remove duplicates
            cards = cards.filter((card, index, self) => self.indexOf(card) === index);

            const hoverAnalysis = {
                totalCards: cards.length,
                cardsWithHoverEffects: 0,
                hoverDetails: [],
                subtleEffects: true
            };

            // Test hover on first 3 cards
            for (let i = 0; i < Math.min(cards.length, 3); i++) {
                const card = cards[i];
                
                try {
                    const initialStyles = {
                        transform: getComputedStyle(card).transform,
                        boxShadow: getComputedStyle(card).boxShadow,
                        scale: getComputedStyle(card).scale,
                        opacity: getComputedStyle(card).opacity,
                        backgroundColor: getComputedStyle(card).backgroundColor
                    };

                    // Simulate hover
                    card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                    
                    // Wait for transitions
                    await new Promise(resolve => setTimeout(resolve, 300));

                    const hoverStyles = {
                        transform: getComputedStyle(card).transform,
                        boxShadow: getComputedStyle(card).boxShadow,
                        scale: getComputedStyle(card).scale,
                        opacity: getComputedStyle(card).opacity,
                        backgroundColor: getComputedStyle(card).backgroundColor
                    };

                    const hasHoverEffect = 
                        initialStyles.transform !== hoverStyles.transform ||
                        initialStyles.boxShadow !== hoverStyles.boxShadow ||
                        initialStyles.scale !== hoverStyles.scale ||
                        initialStyles.opacity !== hoverStyles.opacity ||
                        initialStyles.backgroundColor !== hoverStyles.backgroundColor;

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
                            opacity: initialStyles.opacity !== hoverStyles.opacity,
                            backgroundColor: initialStyles.backgroundColor !== hoverStyles.backgroundColor
                        },
                        initialStyles,
                        hoverStyles
                    });

                    // Remove hover
                    card.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    hoverAnalysis.hoverDetails.push({
                        cardIndex: i,
                        hasEffect: false,
                        error: error.message
                    });
                }
            }

            return hoverAnalysis;
        });

        results.analysis.hoverEffects = hoverEffectsAnalysis;

        // 5. Take hover state screenshot if cards exist
        if (cardAnalysis.totalCards > 0) {
            console.log('📸 Taking hover state screenshot...');
            await page.evaluate(() => {
                const cardSelectors = ['[class*="project"]', '[class*="card"]'];
                for (const selector of cardSelectors) {
                    const firstCard = document.querySelector(selector);
                    if (firstCard) {
                        firstCard.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                        break;
                    }
                }
            });

            await wait(500);

            if (projectsRect && projectsRect.width > 0 && projectsRect.height > 0) {
                await page.screenshot({
                    path: path.join(screenshotsDir, 'projects-hover-state.png'),
                    clip: projectsRect,
                    fullPage: false
                });
                results.screenshots.push('projects-hover-state.png');
            }

            // Remove hover
            await page.evaluate(() => {
                const cardSelectors = ['[class*="project"]', '[class*="card"]'];
                for (const selector of cardSelectors) {
                    const firstCard = document.querySelector(selector);
                    if (firstCard) {
                        firstCard.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
                        break;
                    }
                }
            });
        }

        // 6. Analyze overall clean design
        console.log('🧹 Analyzing overall clean design...');
        const cleanDesignAnalysis = await page.evaluate(() => {
            // Find the main projects container
            const selectors = [
                '#projects',
                '[id*="project"]',
                '.projects',
                'section:has([class*="project"])',
                'div:has([class*="project"])'
            ];
            
            let section = null;
            for (const selector of selectors) {
                try {
                    const element = document.querySelector(selector);
                    if (element && element.querySelectorAll('[class*="project"], [class*="card"]').length > 0) {
                        section = element;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!section) {
                // Try to find parent container of cards
                const cards = document.querySelectorAll('[class*="project"], [class*="card"]');
                if (cards.length > 0) {
                    section = cards[0].closest('section') || cards[0].parentElement;
                }
            }

            if (!section) return { error: 'Projects section not found' };

            const analysis = {
                sectionFound: true,
                sectionStyles: {
                    backgroundColor: getComputedStyle(section).backgroundColor,
                    padding: getComputedStyle(section).padding,
                    margin: getComputedStyle(section).margin,
                    display: getComputedStyle(section).display,
                    gap: getComputedStyle(section).gap
                },
                layout: {
                    displayType: getComputedStyle(section).display,
                    flexDirection: getComputedStyle(section).flexDirection,
                    gap: getComputedStyle(section).gap,
                    gridTemplate: getComputedStyle(section).gridTemplateColumns
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
            analysis.isMinimal = analysis.totalElements < 100 && analysis.childrenCount < 15;

            // Check whitespace
            const paddingValue = getComputedStyle(section).paddingTop;
            const paddingNum = parseFloat(paddingValue);
            analysis.whitespace.hasAdequatePadding = paddingNum >= 20 || paddingValue.includes('rem') || paddingValue.includes('em');
            
            const marginValue = getComputedStyle(section).marginTop;
            analysis.whitespace.hasCleanMargins = marginValue !== '0px' || getComputedStyle(section).marginBottom !== '0px';

            return analysis;
        });

        results.analysis.cleanDesign = cleanDesignAnalysis;

        // 7. User-friendliness assessment
        console.log('👤 Assessing user-friendliness...');
        const userFriendlinessAnalysis = await page.evaluate(() => {
            const cardSelectors = ['[class*="project"]', '[class*="card"]'];
            let allCards = [];
            
            for (const selector of cardSelectors) {
                const cards = Array.from(document.querySelectorAll(selector));
                allCards = allCards.concat(cards.filter(card => 
                    card.querySelector('img, h1, h2, h3, h4, h5, h6, p, button, a')
                ));
            }
            
            // Remove duplicates
            allCards = allCards.filter((card, index, self) => self.indexOf(card) === index);

            const analysis = {
                totalCardsAnalyzed: allCards.length,
                readability: {
                    hasReadableFonts: true,
                    hasGoodContrast: true,
                    appropriateFontSizes: true,
                    fontSizeIssues: []
                },
                navigation: {
                    clearCallToActions: 0,
                    totalInteractiveElements: 0,
                    callToActionTexts: []
                },
                accessibility: {
                    hasAltTexts: 0,
                    hasAriaLabels: 0,
                    totalImages: 0,
                    missingAltImages: []
                },
                overallScore: 0
            };

            allCards.forEach((card, cardIndex) => {
                // Check readability
                const titles = card.querySelectorAll('h1, h2, h3, h4, h5, h6');
                titles.forEach(title => {
                    const fontSize = parseFloat(getComputedStyle(title).fontSize);
                    if (fontSize < 14) {
                        analysis.readability.appropriateFontSizes = false;
                        analysis.readability.fontSizeIssues.push(`Card ${cardIndex}: Title font size ${fontSize}px too small`);
                    }
                });

                // Check navigation
                const buttons = card.querySelectorAll('button, a[href]');
                buttons.forEach(btn => {
                    analysis.navigation.totalInteractiveElements++;
                    const btnText = btn.textContent.toLowerCase().trim();
                    analysis.navigation.callToActionTexts.push(btnText);
                    
                    if (btnText.includes('visit') || 
                        btnText.includes('view') ||
                        btnText.includes('demo') ||
                        btnText.includes('live') ||
                        btnText.includes('site') ||
                        btnText.includes('github')) {
                        analysis.navigation.clearCallToActions++;
                    }
                });

                // Check accessibility
                const images = card.querySelectorAll('img');
                images.forEach((img, imgIndex) => {
                    analysis.accessibility.totalImages++;
                    if (img.alt && img.alt.trim()) {
                        analysis.accessibility.hasAltTexts++;
                    } else {
                        analysis.accessibility.missingAltImages.push(`Card ${cardIndex}, Image ${imgIndex}`);
                    }
                });

                const ariaElements = card.querySelectorAll('[aria-label], [aria-describedby], [role]');
                analysis.accessibility.hasAriaLabels += ariaElements.length;
            });

            // Calculate overall score (0-100)
            let score = 0;
            
            // Readability (25 points)
            if (analysis.readability.appropriateFontSizes) score += 25;
            
            // Navigation (25 points)
            if (analysis.navigation.clearCallToActions > 0) score += 25;
            
            // Accessibility (25 points)
            const altTextScore = analysis.accessibility.totalImages > 0 ? 
                (analysis.accessibility.hasAltTexts / analysis.accessibility.totalImages) : 1;
            score += Math.round(25 * altTextScore);
            
            // Layout (25 points)
            if (allCards.length > 0 && allCards.length <= 8) score += 25; // Not overwhelming

            analysis.overallScore = score;

            return analysis;
        });

        results.analysis.userFriendliness = userFriendlinessAnalysis;

        // 8. Overall assessment
        console.log('📊 Performing overall assessment...');
        const overallAssessment = {
            simplicityScore: 0,
            functionalityScore: 0,
            designQualityScore: 0,
            userExperienceScore: 0,
            finalScore: 0,
            recommendations: []
        };

        // Calculate simplicity score
        if (cardAnalysis.designComplexity === 'simple') overallAssessment.simplicityScore += 40;
        else if (cardAnalysis.designComplexity === 'moderate') overallAssessment.simplicityScore += 20;
        
        if (!cardAnalysis.visualClutter) overallAssessment.simplicityScore += 30;
        if (cardAnalysis.cleanLayout) overallAssessment.simplicityScore += 30;

        // Calculate functionality score
        if (visitButtonAnalysis.allButtonsWorking) overallAssessment.functionalityScore += 50;
        if (visitButtonAnalysis.hasSimpleDesign) overallAssessment.functionalityScore += 30;
        if (visitButtonAnalysis.totalVisitButtons > 0) overallAssessment.functionalityScore += 20;

        // Calculate design quality score
        if (cleanDesignAnalysis.isMinimal) overallAssessment.designQualityScore += 40;
        if (cleanDesignAnalysis.whitespace?.hasAdequatePadding) overallAssessment.designQualityScore += 30;
        if (hoverEffectsAnalysis.cardsWithHoverEffects > 0) overallAssessment.designQualityScore += 30;

        // Use user-friendliness score directly
        overallAssessment.userExperienceScore = userFriendlinessAnalysis.overallScore;

        // Calculate final score
        overallAssessment.finalScore = Math.round(
            (overallAssessment.simplicityScore + 
             overallAssessment.functionalityScore + 
             overallAssessment.designQualityScore + 
             overallAssessment.userExperienceScore) / 4
        );

        results.analysis.overallAssessment = overallAssessment;

        // 9. Take final full page screenshot
        console.log('📸 Taking final full page screenshot...');
        await page.screenshot({
            path: path.join(screenshotsDir, 'final-full-page.png'),
            fullPage: true
        });
        results.screenshots.push('final-full-page.png');

        // 10. Generate issues and improvements based on analysis
        if (cardAnalysis.totalCards === 0) {
            results.issues.push('No project cards were detected on the page');
        } else {
            if (cardAnalysis.designComplexity === 'complex') {
                results.issues.push('Design complexity is high - consider simplifying card structure');
            }

            if (cardAnalysis.visualClutter) {
                results.issues.push('Visual clutter detected - reduce number of elements per card');
            }

            if (!visitButtonAnalysis.allButtonsWorking && visitButtonAnalysis.totalVisitButtons > 0) {
                results.issues.push('Some Visit buttons are not properly functional');
            }

            if (visitButtonAnalysis.totalVisitButtons === 0) {
                results.issues.push('No "Visit" buttons found - users cannot access projects');
            }
        }

        // Add improvements based on scores
        if (overallAssessment.simplicityScore < 70) {
            results.improvements.push('Consider further simplifying the card design');
        }

        if (overallAssessment.functionalityScore < 70) {
            results.improvements.push('Improve button functionality and design');
        }

        if (hoverEffectsAnalysis.cardsWithHoverEffects === 0 && cardAnalysis.totalCards > 0) {
            results.improvements.push('Consider adding subtle hover effects for better user interaction');
        }

        if (userFriendlinessAnalysis.overallScore < 75) {
            results.improvements.push(`User-friendliness score is ${userFriendlinessAnalysis.overallScore}% - consider improving accessibility and navigation`);
        }

        // Add positive feedback if scores are good
        if (overallAssessment.finalScore >= 80) {
            results.improvements.push('Excellent! Design appears clean and simplified as requested');
        } else if (overallAssessment.finalScore >= 60) {
            results.improvements.push('Good progress on simplification, minor improvements possible');
        }

        console.log('✅ Analysis completed successfully!');

    } catch (error) {
        console.error('❌ Error during analysis:', error);
        results.error = error.message;
        results.stack = error.stack;
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
    const analysis = results.analysis;
    const overall = analysis.overallAssessment || {};
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simplified Projects Section Analysis Report</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; padding: 20px; line-height: 1.6; 
            background: #f5f5f5;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; padding: 40px; border-radius: 12px; margin-bottom: 30px; text-align: center;
        }
        .header h1 { margin: 0 0 10px 0; font-size: 2.5em; }
        .header p { margin: 5px 0; opacity: 0.9; }
        
        .score-overview { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; margin-bottom: 30px; 
        }
        .score-card { 
            background: white; padding: 25px; border-radius: 8px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; 
        }
        .score-value { 
            font-size: 2.5em; font-weight: bold; margin-bottom: 10px;
            color: ${overall.finalScore >= 80 ? '#28a745' : overall.finalScore >= 60 ? '#ffc107' : '#dc3545'};
        }
        .score-label { font-weight: 600; color: #666; }
        
        .section { 
            background: white; padding: 30px; margin: 20px 0; 
            border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .section h2 { 
            margin-top: 0; color: #333; border-bottom: 2px solid #007bff; 
            padding-bottom: 10px; 
        }
        
        .metric-grid { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 15px; margin: 20px 0; 
        }
        .metric { 
            background: #f8f9fa; padding: 15px; border-radius: 6px; 
            border-left: 4px solid #007bff; 
        }
        .metric-label { font-weight: 600; color: #666; font-size: 0.9em; }
        .metric-value { font-size: 1.2em; font-weight: bold; color: #333; }
        
        .status-good { color: #28a745; }
        .status-warning { color: #ffc107; }
        .status-error { color: #dc3545; }
        
        .issue { 
            background: #f8d7da; color: #721c24; padding: 12px; 
            margin: 8px 0; border-radius: 4px; border-left: 4px solid #dc3545; 
        }
        .improvement { 
            background: #d1ecf1; color: #0c5460; padding: 12px; 
            margin: 8px 0; border-radius: 4px; border-left: 4px solid #17a2b8; 
        }
        .success { 
            background: #d4edda; color: #155724; padding: 12px; 
            margin: 8px 0; border-radius: 4px; border-left: 4px solid #28a745; 
        }
        
        .screenshots { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; margin-top: 20px; 
        }
        .screenshot { 
            background: white; padding: 15px; border-radius: 8px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; 
        }
        .screenshot img { 
            max-width: 100%; height: auto; border-radius: 6px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
        }
        .screenshot h4 { margin: 0 0 10px 0; color: #333; }
        
        .data-section { 
            background: #f8f9fa; padding: 20px; border-radius: 6px; 
            margin-top: 20px; 
        }
        .data-section pre { 
            background: white; padding: 15px; border-radius: 4px; 
            overflow-x: auto; font-size: 0.9em; 
        }
        
        .button-analysis { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 15px; margin: 15px 0; 
        }
        .button-item { 
            background: #e9ecef; padding: 10px; border-radius: 4px; 
            font-family: monospace; font-size: 0.9em; 
        }
        
        @media (max-width: 768px) {
            .score-overview { grid-template-columns: 1fr 1fr; }
            .metric-grid { grid-template-columns: 1fr; }
            .screenshots { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎨 Simplified Projects Section Analysis</h1>
            <p>Comprehensive analysis of the project section design simplification</p>
            <p><strong>Analyzed:</strong> ${new Date(results.timestamp).toLocaleString()}</p>
            <p><strong>URL:</strong> ${results.url}</p>
        </div>

        <div class="score-overview">
            <div class="score-card">
                <div class="score-value">${overall.finalScore || 0}%</div>
                <div class="score-label">Overall Score</div>
            </div>
            <div class="score-card">
                <div class="score-value">${overall.simplicityScore || 0}%</div>
                <div class="score-label">Simplicity</div>
            </div>
            <div class="score-card">
                <div class="score-value">${overall.functionalityScore || 0}%</div>
                <div class="score-label">Functionality</div>
            </div>
            <div class="score-card">
                <div class="score-value">${overall.designQualityScore || 0}%</div>
                <div class="score-label">Design Quality</div>
            </div>
            <div class="score-card">
                <div class="score-value">${overall.userExperienceScore || 0}%</div>
                <div class="score-label">User Experience</div>
            </div>
        </div>

        <div class="section">
            <h2>📊 Quick Summary</h2>
            <div class="metric-grid">
                <div class="metric">
                    <div class="metric-label">Project Cards Found</div>
                    <div class="metric-value">${analysis.designSimplicity?.totalCards || 0}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Design Complexity</div>
                    <div class="metric-value ${
                        analysis.designSimplicity?.designComplexity === 'simple' ? 'status-good' : 
                        analysis.designSimplicity?.designComplexity === 'moderate' ? 'status-warning' : 'status-error'
                    }">${analysis.designSimplicity?.designComplexity || 'Unknown'}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Visit Buttons Working</div>
                    <div class="metric-value ${analysis.visitButtons?.allButtonsWorking ? 'status-good' : 'status-error'}">
                        ${analysis.visitButtons?.allButtonsWorking ? '✅ Yes' : '❌ No'}
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">Visual Clutter</div>
                    <div class="metric-value ${analysis.designSimplicity?.visualClutter ? 'status-error' : 'status-good'}">
                        ${analysis.designSimplicity?.visualClutter ? '❌ Detected' : '✅ Clean'}
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">Hover Effects</div>
                    <div class="metric-value">${analysis.hoverEffects?.cardsWithHoverEffects || 0} / ${analysis.hoverEffects?.totalCards || 0}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Clean Layout</div>
                    <div class="metric-value ${analysis.designSimplicity?.cleanLayout ? 'status-good' : 'status-warning'}">
                        ${analysis.designSimplicity?.cleanLayout ? '✅ Yes' : '⚠️ Needs work'}
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>🎨 Design Simplicity Analysis</h2>
            <p><strong>Complexity Level:</strong> 
                <span class="${
                    analysis.designSimplicity?.designComplexity === 'simple' ? 'status-good' : 
                    analysis.designSimplicity?.designComplexity === 'moderate' ? 'status-warning' : 'status-error'
                }">${analysis.designSimplicity?.designComplexity || 'Unknown'}</span>
            </p>
            <p><strong>Visual Clutter:</strong> 
                <span class="${analysis.designSimplicity?.visualClutter ? 'status-error' : 'status-good'}">
                    ${analysis.designSimplicity?.visualClutter ? 'Detected - Needs simplification' : 'Clean design ✅'}
                </span>
            </p>
            <p><strong>Layout Quality:</strong> 
                <span class="${analysis.designSimplicity?.cleanLayout ? 'status-good' : 'status-warning'}">
                    ${analysis.designSimplicity?.cleanLayout ? 'Clean and organized ✅' : 'Could be improved ⚠️'}
                </span>
            </p>
            ${analysis.designSimplicity?.cardElements?.length > 0 ? `
                <p><strong>Average elements per card:</strong> ${Math.round(
                    analysis.designSimplicity.cardElements.reduce((sum, card) => sum + card.childrenCount, 0) / 
                    analysis.designSimplicity.cardElements.length
                )}</p>
            ` : ''}
        </div>

        <div class="section">
            <h2>🔗 Visit Buttons Analysis</h2>
            <div class="metric-grid">
                <div class="metric">
                    <div class="metric-label">Total Visit Buttons</div>
                    <div class="metric-value">${analysis.visitButtons?.totalVisitButtons || 0}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">All Buttons Working</div>
                    <div class="metric-value ${analysis.visitButtons?.allButtonsWorking ? 'status-good' : 'status-error'}">
                        ${analysis.visitButtons?.allButtonsWorking ? '✅ Yes' : '❌ No'}
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">Simple Design</div>
                    <div class="metric-value ${analysis.visitButtons?.hasSimpleDesign ? 'status-good' : 'status-warning'}">
                        ${analysis.visitButtons?.hasSimpleDesign ? '✅ Yes' : '⚠️ Could be simpler'}
                    </div>
                </div>
            </div>
            ${analysis.visitButtons?.buttonTexts?.length > 0 ? `
                <p><strong>Button texts found:</strong></p>
                <div class="button-analysis">
                    ${analysis.visitButtons.buttonTexts.map(text => `<div class="button-item">"${text}"</div>`).join('')}
                </div>
            ` : '<p><em>No visit buttons detected</em></p>'}
        </div>

        <div class="section">
            <h2>✨ Hover Effects Analysis</h2>
            <p><strong>Cards with hover effects:</strong> ${analysis.hoverEffects?.cardsWithHoverEffects || 0} out of ${analysis.hoverEffects?.totalCards || 0} tested</p>
            <p><strong>Effects quality:</strong> 
                <span class="${analysis.hoverEffects?.subtleEffects ? 'status-good' : 'status-warning'}">
                    ${analysis.hoverEffects?.subtleEffects ? 'Subtle and appropriate ✅' : 'Too dramatic ⚠️'}
                </span>
            </p>
            ${analysis.hoverEffects?.hoverDetails?.length > 0 ? `
                <div class="metric-grid">
                    ${analysis.hoverEffects.hoverDetails.map((detail, index) => `
                        <div class="metric">
                            <div class="metric-label">Card ${index + 1}</div>
                            <div class="metric-value ${detail.hasEffect ? 'status-good' : 'status-warning'}">
                                ${detail.hasEffect ? '✅ Has hover effect' : '⚠️ No hover effect'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>

        <div class="section">
            <h2>🧹 Clean Design Assessment</h2>
            <div class="metric-grid">
                <div class="metric">
                    <div class="metric-label">Design is Minimal</div>
                    <div class="metric-value ${analysis.cleanDesign?.isMinimal ? 'status-good' : 'status-warning'}">
                        ${analysis.cleanDesign?.isMinimal ? '✅ Yes' : '⚠️ Could be more minimal'}
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">Total Elements</div>
                    <div class="metric-value">${analysis.cleanDesign?.totalElements || 'Unknown'}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Adequate Padding</div>
                    <div class="metric-value ${analysis.cleanDesign?.whitespace?.hasAdequatePadding ? 'status-good' : 'status-warning'}">
                        ${analysis.cleanDesign?.whitespace?.hasAdequatePadding ? '✅ Yes' : '⚠️ Needs improvement'}
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">Section Found</div>
                    <div class="metric-value ${analysis.cleanDesign?.sectionFound ? 'status-good' : 'status-error'}">
                        ${analysis.cleanDesign?.sectionFound ? '✅ Yes' : '❌ No'}
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>👤 User-Friendliness Assessment</h2>
            <div class="metric-grid">
                <div class="metric">
                    <div class="metric-label">Overall Score</div>
                    <div class="metric-value ${
                        (analysis.userFriendliness?.overallScore || 0) >= 80 ? 'status-good' : 
                        (analysis.userFriendliness?.overallScore || 0) >= 60 ? 'status-warning' : 'status-error'
                    }">${analysis.userFriendliness?.overallScore || 0}%</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Clear Call-to-Actions</div>
                    <div class="metric-value">${analysis.userFriendliness?.navigation?.clearCallToActions || 0}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Images with Alt Text</div>
                    <div class="metric-value">${analysis.userFriendliness?.accessibility?.hasAltTexts || 0} / ${analysis.userFriendliness?.accessibility?.totalImages || 0}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Font Sizes Appropriate</div>
                    <div class="metric-value ${analysis.userFriendliness?.readability?.appropriateFontSizes ? 'status-good' : 'status-warning'}">
                        ${analysis.userFriendliness?.readability?.appropriateFontSizes ? '✅ Yes' : '⚠️ Issues found'}
                    </div>
                </div>
            </div>
        </div>

        ${results.issues?.length > 0 ? `
        <div class="section">
            <h2>⚠️ Issues Found</h2>
            ${results.issues.map(issue => `<div class="issue">❌ ${issue}</div>`).join('')}
        </div>
        ` : ''}

        ${results.improvements?.length > 0 ? `
        <div class="section">
            <h2>💡 Improvements & Observations</h2>
            ${results.improvements.map(improvement => `<div class="improvement">💡 ${improvement}</div>`).join('')}
        </div>
        ` : ''}

        ${results.issues?.length === 0 && overall.finalScore >= 80 ? `
        <div class="section">
            <div class="success">🎉 Excellent! The design appears clean, simplified, and user-friendly as requested. The project section meets high standards for simplicity and functionality.</div>
        </div>
        ` : ''}

        ${results.screenshots?.length > 0 ? `
        <div class="section">
            <h2>📸 Screenshots Captured</h2>
            <div class="screenshots">
                ${results.screenshots.map(screenshot => `
                    <div class="screenshot">
                        <h4>${screenshot.replace(/[-_]/g, ' ').replace('.png', '').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                        <img src="${screenshot}" alt="${screenshot}" loading="lazy" />
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <div class="section">
            <h2>📋 Detailed Analysis Data</h2>
            <div class="data-section">
                <h3>Raw Analysis Results</h3>
                <pre>${JSON.stringify(results.analysis, null, 2)}</pre>
            </div>
        </div>
    </div>
</body>
</html>
    `;
}

// Run the analysis
analyzeSimplifiedProjects().then(results => {
    console.log('\\n🎯 ANALYSIS COMPLETE');
    console.log('===================');
    console.log(`✅ Total Cards Analyzed: ${results.analysis.designSimplicity?.totalCards || 0}`);
    console.log(`🎨 Design Complexity: ${results.analysis.designSimplicity?.designComplexity || 'Unknown'}`);
    console.log(`🔗 Visit Buttons Working: ${results.analysis.visitButtons?.allButtonsWorking ? 'Yes' : 'No'} (${results.analysis.visitButtons?.totalVisitButtons || 0} found)`);
    console.log(`✨ Cards with Hover Effects: ${results.analysis.hoverEffects?.cardsWithHoverEffects || 0} / ${results.analysis.hoverEffects?.totalCards || 0}`);
    console.log(`👤 User-Friendliness Score: ${results.analysis.userFriendliness?.overallScore || 0}%`);
    console.log(`🏆 Overall Score: ${results.analysis.overallAssessment?.finalScore || 0}%`);
    
    if (results.issues?.length === 0 && (results.analysis.overallAssessment?.finalScore || 0) >= 80) {
        console.log('\\n🎉 SUCCESS: Design appears clean, simplified, and user-friendly!');
    } else if ((results.analysis.overallAssessment?.finalScore || 0) >= 60) {
        console.log('\\n✅ GOOD: Design is well simplified with room for minor improvements');
    } else {
        console.log(`\\n⚠️  NEEDS WORK: ${results.issues?.length || 0} issue(s) found - check the detailed report`);
    }
    
    console.log('\\n📊 View the detailed HTML report for complete analysis with screenshots');
}).catch(error => {
    console.error('❌ Analysis failed:', error);
});