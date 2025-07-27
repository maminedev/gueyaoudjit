import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function enhancedProjectsAnalysis() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();
  
  const screenshotsDir = join(__dirname, 'enhanced-analysis-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  try {
    console.log('🚀 Navigating to portfolio website...');
    await page.goto('http://localhost:5179', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Desktop Analysis - Focus on Projects Section
    console.log('📱 Desktop Analysis...');
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navigate directly to projects section
    await page.evaluate(() => {
      document.querySelector('#projects').scrollIntoView({ behavior: 'smooth' });
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take screenshot of projects section only
    const projectsSection = await page.$('#projects');
    if (projectsSection) {
      await projectsSection.screenshot({
        path: join(screenshotsDir, 'projects-desktop-focused.png'),
        type: 'png'
      });
    }

    // Get detailed carousel measurements
    const desktopMeasurements = await page.evaluate(() => {
      const carousel = document.querySelector('.absolute.w-full');
      const carouselContainer = carousel?.closest('.relative');
      const sliderItems = Array.from(document.querySelectorAll('.slider-item'));
      const firstProject = sliderItems[0];
      const gradientLeft = document.querySelector('.carousel-gradient-left-box');
      const gradientRight = document.querySelector('.carousel-gradient-right-box');
      
      if (!carousel || !firstProject) {
        return { error: 'Elements not found' };
      }

      const containerRect = carouselContainer?.getBoundingClientRect();
      const carouselRect = carousel.getBoundingClientRect();
      const firstProjectRect = firstProject.getBoundingClientRect();
      
      return {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        container: {
          left: containerRect?.left || 0,
          width: containerRect?.width || 0,
          height: containerRect?.height || 0
        },
        carousel: {
          left: carouselRect.left,
          width: carouselRect.width,
          transform: window.getComputedStyle(carousel).transform
        },
        firstProject: {
          left: firstProjectRect.left,
          right: firstProjectRect.right,
          width: firstProjectRect.width,
          visibleWidth: Math.max(0, Math.min(firstProjectRect.right, window.innerWidth) - Math.max(firstProjectRect.left, 0)),
          percentageVisible: Math.max(0, Math.min(firstProjectRect.right, window.innerWidth) - Math.max(firstProjectRect.left, 0)) / firstProjectRect.width * 100
        },
        gradients: {
          left: gradientLeft ? gradientLeft.getBoundingClientRect().width : 0,
          right: gradientRight ? gradientRight.getBoundingClientRect().width : 0
        },
        totalProjects: sliderItems.length
      };
    });

    console.log('📊 Desktop Measurements:', JSON.stringify(desktopMeasurements, null, 2));

    // Mobile Analysis
    console.log('📱 Mobile Analysis...');
    await page.setViewport({ width: 375, height: 667 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Ensure we're still on projects section
    await page.evaluate(() => {
      document.querySelector('#projects').scrollIntoView({ behavior: 'smooth' });
    });
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mobileMeasurements = await page.evaluate(() => {
      const carousel = document.querySelector('.absolute.w-full');
      const firstProject = document.querySelector('.slider-item');
      
      if (!carousel || !firstProject) {
        return { error: 'Elements not found' };
      }

      const carouselRect = carousel.getBoundingClientRect();
      const firstProjectRect = firstProject.getBoundingClientRect();
      
      return {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        carousel: {
          left: carouselRect.left,
          width: carouselRect.width
        },
        firstProject: {
          left: firstProjectRect.left,
          right: firstProjectRect.right,
          width: firstProjectRect.width,
          visibleWidth: Math.max(0, Math.min(firstProjectRect.right, window.innerWidth) - Math.max(firstProjectRect.left, 0)),
          percentageVisible: Math.max(0, Math.min(firstProjectRect.right, window.innerWidth) - Math.max(firstProjectRect.left, 0)) / firstProjectRect.width * 100
        }
      };
    });

    // Take mobile screenshot of projects section
    const mobileProjectsSection = await page.$('#projects');
    if (mobileProjectsSection) {
      await mobileProjectsSection.screenshot({
        path: join(screenshotsDir, 'projects-mobile-focused.png'),
        type: 'png'
      });
    }

    console.log('📊 Mobile Measurements:', JSON.stringify(mobileMeasurements, null, 2));

    // Tablet Analysis
    console.log('📱 Tablet Analysis...');
    await page.setViewport({ width: 768, height: 1024 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await page.evaluate(() => {
      document.querySelector('#projects').scrollIntoView({ behavior: 'smooth' });
    });
    await new Promise(resolve => setTimeout(resolve, 1500));

    const tabletMeasurements = await page.evaluate(() => {
      const carousel = document.querySelector('.absolute.w-full');
      const firstProject = document.querySelector('.slider-item');
      
      if (!carousel || !firstProject) {
        return { error: 'Elements not found' };
      }

      const carouselRect = carousel.getBoundingClientRect();
      const firstProjectRect = firstProject.getBoundingClientRect();
      
      return {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        carousel: {
          left: carouselRect.left,
          width: carouselRect.width
        },
        firstProject: {
          left: firstProjectRect.left,
          right: firstProjectRect.right,
          width: firstProjectRect.width,
          visibleWidth: Math.max(0, Math.min(firstProjectRect.right, window.innerWidth) - Math.max(firstProjectRect.left, 0)),
          percentageVisible: Math.max(0, Math.min(firstProjectRect.right, window.innerWidth) - Math.max(firstProjectRect.left, 0)) / firstProjectRect.width * 100
        }
      };
    });

    // Take tablet screenshot
    const tabletProjectsSection = await page.$('#projects');
    if (tabletProjectsSection) {
      await tabletProjectsSection.screenshot({
        path: join(screenshotsDir, 'projects-tablet-focused.png'),
        type: 'png'
      });
    }

    console.log('📊 Tablet Measurements:', JSON.stringify(tabletMeasurements, null, 2));

    // Test Navigation on Desktop
    await page.setViewport({ width: 1920, height: 1080 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await page.evaluate(() => {
      document.querySelector('#projects').scrollIntoView({ behavior: 'smooth' });
    });
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('🔄 Testing navigation...');
    const navButtons = await page.$$('.rounded-full.cursor-pointer');
    
    if (navButtons.length >= 2) {
      // Click next
      await navButtons[1].click();
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const afterNextSection = await page.$('#projects');
      if (afterNextSection) {
        await afterNextSection.screenshot({
          path: join(screenshotsDir, 'projects-after-next.png'),
          type: 'png'
        });
      }

      // Click prev to return
      await navButtons[0].click();
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Generate comprehensive report
    const report = {
      timestamp: new Date().toISOString(),
      measurements: {
        desktop: desktopMeasurements,
        mobile: mobileMeasurements,
        tablet: tabletMeasurements
      },
      analysis: {
        criticalIssues: [],
        recommendations: []
      }
    };

    // Analyze issues
    if (desktopMeasurements.firstProject?.percentageVisible < 50) {
      report.analysis.criticalIssues.push({
        severity: 'high',
        type: 'visibility',
        device: 'desktop',
        description: `First project only ${desktopMeasurements.firstProject.percentageVisible.toFixed(1)}% visible on desktop`,
        impact: 'Users cannot see the first project without scrolling'
      });
    }

    if (mobileMeasurements.firstProject?.percentageVisible < 50) {
      report.analysis.criticalIssues.push({
        severity: 'high',
        type: 'visibility',
        device: 'mobile',
        description: `First project only ${mobileMeasurements.firstProject.percentageVisible.toFixed(1)}% visible on mobile`,
        impact: 'Mobile users cannot see the first project'
      });
    }

    if (tabletMeasurements.firstProject?.percentageVisible < 50) {
      report.analysis.criticalIssues.push({
        severity: 'high',
        type: 'visibility',
        device: 'tablet',
        description: `First project only ${tabletMeasurements.firstProject.percentageVisible.toFixed(1)}% visible on tablet`,
        impact: 'Tablet users cannot see the first project'
      });
    }

    // Add specific recommendations
    report.analysis.recommendations = [
      {
        priority: 'critical',
        title: 'Fix Carousel Initial Position',
        description: 'Reduce the negative left margin to make the first project visible',
        implementation: {
          file: 'src/components/Carousel.jsx',
          line: 39,
          currentCode: 'className="absolute w-full -left-[43vw] top-0"',
          proposedCode: 'className="absolute w-full -left-[20vw] sm:-left-[25vw] md:-left-[30vw] lg:-left-[35vw] top-0"',
          reason: 'Current -43vw pushes first project completely off-screen on all devices'
        }
      },
      {
        priority: 'high',
        title: 'Add Responsive Positioning',
        description: 'Use different positioning values for different screen sizes',
        implementation: {
          suggestion: 'Implement dynamic positioning based on viewport width using Tailwind responsive classes'
        }
      },
      {
        priority: 'medium',
        title: 'Improve User Experience',
        description: 'Add visual indicators and improve navigation',
        implementation: {
          suggestions: [
            'Add dot indicators showing current slide',
            'Add keyboard navigation (arrow keys)',
            'Add swipe gestures for mobile',
            'Add autoplay with pause on hover'
          ]
        }
      }
    ];

    fs.writeFileSync(
      join(screenshotsDir, 'enhanced-analysis-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('✅ Enhanced analysis complete!');
    console.log(`📋 Report saved to: ${screenshotsDir}`);

    return report;

  } catch (error) {
    console.error('❌ Error during enhanced analysis:', error);
  } finally {
    await browser.close();
  }
}

enhancedProjectsAnalysis().catch(console.error);