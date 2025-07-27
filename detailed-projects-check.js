import puppeteer from 'puppeteer';

async function checkProjectsContent() {
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null 
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('🔍 Examining projects section content...');
        
        await page.goto('http://localhost:5180', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Scroll to projects section
        await page.evaluate(() => {
            const projectsSection = document.querySelector('#projects');
            if (projectsSection) {
                projectsSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get detailed projects section content
        const projectsInfo = await page.evaluate(() => {
            const projectsSection = document.querySelector('#projects');
            if (!projectsSection) {
                return { error: 'Projects section not found' };
            }
            
            return {
                innerHTML: projectsSection.innerHTML,
                outerHTML: projectsSection.outerHTML.substring(0, 2000) + '...',
                children: Array.from(projectsSection.children).map(child => ({
                    tagName: child.tagName,
                    className: child.className,
                    id: child.id,
                    innerHTML: child.innerHTML.substring(0, 500) + '...'
                })),
                allDescendants: Array.from(projectsSection.querySelectorAll('*')).map(el => ({
                    tagName: el.tagName,
                    className: el.className,
                    id: el.id
                })).slice(0, 20), // First 20 descendants
                projectsRect: projectsSection.getBoundingClientRect()
            };
        });
        
        console.log('Projects section detailed info:', JSON.stringify(projectsInfo, null, 2));
        
        // Take a screenshot focused on projects section
        await page.screenshot({ 
            path: 'projects-section-diagnostic.png',
            fullPage: true
        });
        
        console.log('📸 Screenshot saved as projects-section-diagnostic.png');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await browser.close();
    }
}

checkProjectsContent();