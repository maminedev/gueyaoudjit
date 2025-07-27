import puppeteer from 'puppeteer';

async function diagnoseProjectSection() {
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null 
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('🔍 Diagnosing project section elements...');
        
        // Navigate to the site
        await page.goto('http://localhost:5180', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check what's actually on the page
        const pageInfo = await page.evaluate(() => {
            // Get basic page info
            const title = document.title;
            const url = window.location.href;
            
            // Look for common project-related selectors
            const selectors = [
                '#projects',
                '.projects',
                '.project-section',
                '.projects-section',
                '.project-card',
                '.project',
                '.projects-carousel',
                '.carousel',
                '.dot-indicator',
                '.carousel-arrow',
                'nav a[href="#projects"]'
            ];
            
            const elements = {};
            selectors.forEach(selector => {
                const found = document.querySelectorAll(selector);
                elements[selector] = {
                    count: found.length,
                    exists: found.length > 0,
                    firstElementInfo: found.length > 0 ? {
                        tagName: found[0].tagName,
                        className: found[0].className,
                        id: found[0].id
                    } : null
                };
            });
            
            // Get all sections
            const sections = Array.from(document.querySelectorAll('section')).map(section => ({
                id: section.id,
                className: section.className,
                tagName: section.tagName
            }));
            
            return {
                title,
                url,
                elements,
                sections,
                bodyContent: document.body.innerHTML.substring(0, 1000) + '...'
            };
        });
        
        console.log('Page diagnostic results:', JSON.stringify(pageInfo, null, 2));
        
        // Try to navigate to projects if the link exists
        const projectsLink = await page.$('nav a[href="#projects"]');
        if (projectsLink) {
            console.log('📍 Found projects link, clicking...');
            await projectsLink.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check again after navigation
            const afterNavigation = await page.evaluate(() => {
                const currentHash = window.location.hash;
                const projectsSection = document.querySelector('#projects');
                const projectCards = document.querySelectorAll('.project-card, .project');
                
                return {
                    currentHash,
                    projectsSectionExists: !!projectsSection,
                    projectCardsCount: projectCards.length,
                    scrollTop: window.pageYOffset
                };
            });
            
            console.log('After navigation:', afterNavigation);
        } else {
            console.log('❌ No projects navigation link found');
        }
        
    } catch (error) {
        console.error('❌ Error during diagnosis:', error);
    } finally {
        await browser.close();
    }
}

diagnoseProjectSection();