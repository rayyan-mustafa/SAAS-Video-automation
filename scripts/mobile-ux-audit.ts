/**
 * AUTOSHORT — MOBILE-FIRST UX DEEP AUDIT
 * Tests every screen at multiple mobile viewports
 * Takes real screenshots, measures elements, checks interactions
 */
import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:3000';
const SS_DIR = path.join(__dirname, '..', 'qa-screenshots');

// Mobile viewports to test
const VIEWPORTS = [
  { name: 'iPhone-SE', width: 320, height: 568 },
  { name: 'Galaxy-S21', width: 360, height: 800 },
  { name: 'iPhone-13', width: 390, height: 844 },
  { name: 'Pixel-7', width: 412, height: 915 },
  { name: 'iPad-Mini', width: 768, height: 1024 },
  { name: 'Desktop-HD', width: 1920, height: 1080 },
];

interface UXIssue {
  screen: string;
  viewport: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
  description: string;
  element?: string;
}

const issues: UXIssue[] = [];
const results: Record<string, any> = {};

function addIssue(screen: string, viewport: string, severity: UXIssue['severity'], description: string, element?: string) {
  issues.push({ screen, viewport, severity, description, element });
  console.log(`  [${severity}] ${description}${element ? ` (${element})` : ''}`);
}

async function takeScreenshot(page: Page, name: string) {
  const filePath = path.join(SS_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function measureElements(page: Page) {
  return page.evaluate(() => {
    const body = document.body;
    const metrics: any = {
      bodyScrollWidth: body.scrollWidth,
      viewportWidth: window.innerWidth,
      horizontalOverflow: body.scrollWidth > window.innerWidth,
    };

    // Check all buttons
    const buttons = Array.from(document.querySelectorAll('button, a[href], [role="button"]'));
    const smallButtons: string[] = [];
    buttons.forEach(btn => {
      const rect = btn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
        const text = (btn as HTMLElement).innerText?.trim().slice(0, 30) || btn.className?.slice(0, 30);
        smallButtons.push(`${text} (${Math.round(rect.width)}x${Math.round(rect.height)})`);
      }
    });
    metrics.smallTapTargets = smallButtons;

    // Check text sizes
    const allText = Array.from(document.querySelectorAll('p, span, label, h1, h2, h3, h4, h5, h6, li, td, th, div'));
    const smallText: string[] = [];
    allText.forEach(el => {
      const style = window.getComputedStyle(el);
      const fontSize = parseFloat(style.fontSize);
      const text = (el as HTMLElement).innerText?.trim();
      if (text && text.length > 0 && fontSize < 12 && el.children.length === 0) {
        smallText.push(`"${text.slice(0, 25)}..." (${fontSize}px)`);
      }
    });
    metrics.tooSmallText = smallText.slice(0, 10);

    // Check inputs
    const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
    const inputMetrics: any[] = [];
    inputs.forEach(inp => {
      const rect = inp.getBoundingClientRect();
      const el = inp as HTMLInputElement;
      inputMetrics.push({
        type: el.type || el.tagName.toLowerCase(),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        placeholder: el.placeholder?.slice(0, 30),
        tooSmall: rect.height < 40,
      });
    });
    metrics.inputs = inputMetrics;

    // Check navigation
    const navElements = document.querySelectorAll('nav, [class*="sidebar"], [class*="drawer"], [class*="hamburger"], [class*="menu"]');
    metrics.hasNavigation = navElements.length > 0;
    metrics.navClasses = Array.from(navElements).map(n => n.className?.slice(0, 50));

    // Check for technical jargon visible on screen
    const pageText = document.body.innerText || '';
    const technicalTerms = [
      'temperature', 'max_tokens', 'model_id', 'provider', 'OpenRouter',
      'api_key', 'pipeline', 'QUEUED', 'PIPELINE_INITIALIZATION',
      'workflow_node', 'embedding', 'vector', 'batch_size', 'inference',
      'endpoint', 'API', 'JSON', 'schema', 'mutation', 'query'
    ];
    const foundJargon: string[] = [];
    technicalTerms.forEach(term => {
      if (pageText.toLowerCase().includes(term.toLowerCase())) {
        foundJargon.push(term);
      }
    });
    metrics.technicalJargon = foundJargon;

    // Check main CTA visibility
    const ctas = Array.from(document.querySelectorAll('button')).filter(b => {
      const text = b.innerText?.toLowerCase() || '';
      return text.includes('create') || text.includes('generate') || text.includes('start') || text.includes('get started');
    });
    metrics.mainCTAs = ctas.map(c => ({
      text: (c as HTMLElement).innerText?.trim().slice(0, 40),
      rect: c.getBoundingClientRect(),
      visible: c.getBoundingClientRect().top < window.innerHeight && c.getBoundingClientRect().bottom > 0,
    }));

    return metrics;
  });
}

async function testLandingPage(browser: Browser) {
  console.log('\n=== SECTION 1: LANDING PAGE UX AUDIT ===\n');
  const results: any = {};

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Testing Landing Page @ ${vp.name} (${vp.width}x${vp.height}) ---`);
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.width < 768, hasTouch: vp.width < 768 });
    
    await page.goto(`${BASE}/landing`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 2000)); // Let animations settle

    await takeScreenshot(page, `landing-${vp.name}`);

    const metrics = await measureElements(page);
    results[vp.name] = metrics;

    // Check horizontal overflow
    if (metrics.horizontalOverflow) {
      addIssue('Landing', vp.name, 'CRITICAL', `Horizontal overflow: body ${metrics.bodyScrollWidth}px > viewport ${metrics.viewportWidth}px`);
    }

    // Check small tap targets on mobile
    if (vp.width < 768 && metrics.smallTapTargets.length > 0) {
      addIssue('Landing', vp.name, 'MAJOR', `${metrics.smallTapTargets.length} buttons smaller than 44x44px touch target`, metrics.smallTapTargets.slice(0, 5).join(', '));
    }

    // Check text readability
    if (metrics.tooSmallText.length > 0) {
      addIssue('Landing', vp.name, 'MAJOR', `${metrics.tooSmallText.length} text elements below 12px`, metrics.tooSmallText.slice(0, 3).join(', '));
    }

    // Check hero CTA visibility
    const heroCtaVisible = metrics.mainCTAs.some((c: any) => c.visible);
    if (!heroCtaVisible && metrics.mainCTAs.length > 0) {
      addIssue('Landing', vp.name, 'CRITICAL', 'Main CTA button not visible above the fold');
    }

    // Check mobile navigation
    if (vp.width < 768) {
      const hasMobileMenu = await page.evaluate(() => {
        const hamburger = document.querySelector('[class*="hamburger"], [class*="menu-toggle"], button[aria-label*="menu"], button[aria-label*="Menu"], svg[class*="menu"]');
        return !!hamburger;
      });
      if (!hasMobileMenu) {
        addIssue('Landing', vp.name, 'CRITICAL', 'No hamburger menu / mobile navigation found');
      }
    }

    // Test header navigation link count visible
    const navLinkCount = await page.evaluate(() => {
      const header = document.querySelector('header') || document.querySelector('nav');
      if (!header) return 0;
      const links = header.querySelectorAll('a');
      let visibleCount = 0;
      links.forEach(l => {
        const rect = l.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) visibleCount++;
      });
      return visibleCount;
    });
    
    if (vp.width < 768 && navLinkCount > 3) {
      addIssue('Landing', vp.name, 'MAJOR', `${navLinkCount} nav links visible on mobile — should be collapsed into hamburger menu`);
    }

    await page.close();
  }

  return results;
}

async function testDashboard(browser: Browser) {
  console.log('\n=== SECTION 2: DASHBOARD UX AUDIT ===\n');
  
  // First create a test user and login via direct HTTP
  const testEmail = `mobileqa_${Date.now()}@test.com`;
  const testPass = 'TestPass123!';
  
  console.log('Creating test user...');
  const signupRaw = await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPass, name: 'Mobile QA Tester' }),
  });
  const signupBody = await signupRaw.json().catch(() => ({}));
  console.log(`  Signup: ${signupRaw.status} — ${JSON.stringify(signupBody).slice(0, 100)}`);

  // Login
  const loginRaw = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPass }),
  });
  const loginBody = await loginRaw.json().catch(() => ({}));
  const setCookie = loginRaw.headers.get('set-cookie') || '';
  const match = setCookie.match(/auth_session_token=([^;]+)/);
  const authToken = match ? match[1] : '';
  console.log(`  Login: ${loginRaw.status}, Token: ${authToken ? authToken.slice(0, 25) + '...' : 'NONE'}`);

  const dashResults: any = {};

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Testing Dashboard @ ${vp.name} (${vp.width}x${vp.height}) ---`);
    const pg = await browser.newPage();
    await pg.setViewport({ width: vp.width, height: vp.height, isMobile: vp.width < 768, hasTouch: vp.width < 768 });
    
    // Set cookie for auth
    if (authToken) {
      await pg.setCookie({
        name: 'auth_session_token',
        value: authToken,
        url: BASE,
      });
    }

    await pg.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for dashboard to render (not just "Loading dashboard...")
    try {
      await pg.waitForFunction(() => {
        const body = document.body.innerText || '';
        return !body.includes('Loading dashboard') && body.length > 100;
      }, { timeout: 15000 });
    } catch {
      addIssue('Dashboard', vp.name, 'CRITICAL', 'Dashboard never loaded — stuck on loading spinner');
    }
    
    await new Promise(r => setTimeout(r, 2000));
    await takeScreenshot(pg, `dashboard-${vp.name}`);

    const metrics = await measureElements(pg);
    dashResults[vp.name] = metrics;

    // Overflow check
    if (metrics.horizontalOverflow) {
      addIssue('Dashboard', vp.name, 'CRITICAL', `Horizontal overflow: ${metrics.bodyScrollWidth}px > ${metrics.viewportWidth}px`);
    }

    // Check sidebar behavior on mobile
    if (vp.width < 768) {
      const sidebarState = await pg.evaluate(() => {
        const sidebar = document.querySelector('[class*="sidebar"], aside, [class*="Sidebar"]');
        if (!sidebar) return { exists: false };
        const rect = sidebar.getBoundingClientRect();
        const style = window.getComputedStyle(sidebar as Element);
        return {
          exists: true,
          visible: rect.width > 0 && style.display !== 'none' && style.visibility !== 'hidden',
          width: Math.round(rect.width),
          position: style.position,
          overlapping: rect.left < window.innerWidth && rect.right > 0,
        };
      });

      if (sidebarState.exists && sidebarState.visible && sidebarState.overlapping && sidebarState.width > 60) {
        addIssue('Dashboard', vp.name, 'CRITICAL', `Sidebar is ${sidebarState.width}px wide on mobile and obstructing content — should be hidden/collapsed`, 'Sidebar');
      }
    }

    // Check "Create Video" button is easily findable
    const createBtnState = await pg.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll('button, a'));
      const createBtn = allBtns.find(b => {
        const text = (b as HTMLElement).innerText?.toLowerCase() || '';
        return text.includes('create') && (text.includes('video') || text.includes('short'));
      });
      if (!createBtn) return { found: false };
      const rect = createBtn.getBoundingClientRect();
      return {
        found: true,
        text: (createBtn as HTMLElement).innerText?.trim(),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        visible: rect.top < window.innerHeight && rect.bottom > 0,
        aboveFold: rect.bottom < window.innerHeight,
      };
    });

    if (!createBtnState.found) {
      addIssue('Dashboard', vp.name, 'CRITICAL', '"Create Video" button not found anywhere on dashboard');
    } else if (!createBtnState.visible) {
      addIssue('Dashboard', vp.name, 'MAJOR', `"Create Video" button exists but not visible above fold (top: ${createBtnState.top}px)`);
    } else if (vp.width < 768 && createBtnState.height < 44) {
      addIssue('Dashboard', vp.name, 'MAJOR', `"Create Video" button too small for touch: ${createBtnState.width}x${createBtnState.height}px`);
    }

    // Check for technical jargon
    if (metrics.technicalJargon.length > 0) {
      const userFacingJargon = metrics.technicalJargon.filter((t: string) => 
        !['API'].includes(t) // Allow "API" in some contexts
      );
      if (userFacingJargon.length > 0) {
        addIssue('Dashboard', vp.name, 'MAJOR', `Technical jargon visible to user: ${userFacingJargon.join(', ')}`);
      }
    }

    // Check video creator form complexity
    const formComplexity = await pg.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
      const labels = Array.from(document.querySelectorAll('label'));
      const dropdowns = Array.from(document.querySelectorAll('select'));
      
      // Check for technical dropdown options (e.g. deepseek/deepseek-chat or gpt-4o-mini)
      const technicalOptions: string[] = [];
      dropdowns.forEach(dd => {
        const opts = Array.from((dd as HTMLSelectElement).options);
        opts.forEach(o => {
          const val = o.value || o.text;
          if (val.match(/^[a-z0-9_-]+\/[a-z0-9_.-]+$/i) || val.match(/^(gpt|claude|gemini|deepseek|mistral)-[a-z0-9_.-]+/i)) {
            technicalOptions.push(val.slice(0, 40));
          }
        });
      });

      return {
        totalInputs: inputs.length,
        totalLabels: labels.length,
        totalDropdowns: dropdowns.length,
        technicalOptions,
        inputTypes: inputs.map(i => ({
          tag: i.tagName,
          type: (i as HTMLInputElement).type,
          placeholder: (i as HTMLInputElement).placeholder?.slice(0, 30),
          label: i.closest('label')?.innerText?.slice(0, 30) || '',
        })),
      };
    });

    dashResults[vp.name].formComplexity = formComplexity;

    if (formComplexity.technicalOptions.length > 0) {
      addIssue('Dashboard', vp.name, 'MAJOR', `Technical model IDs in dropdowns: ${formComplexity.technicalOptions.slice(0, 3).join(', ')}`);
    }

    // Check small tap targets on mobile
    if (vp.width < 768 && metrics.smallTapTargets.length > 5) {
      addIssue('Dashboard', vp.name, 'MAJOR', `${metrics.smallTapTargets.length} touch targets < 44px`);
    }

    await pg.close();
  }

  return { signupResult: signupBody, loginResult: loginBody, dashResults, authToken };
}

async function testContentLibrary(browser: Browser, authToken: string) {
  console.log('\n=== SECTION 3: CONTENT LIBRARY UX AUDIT ===\n');
  const libResults: any = {};

  for (const vp of VIEWPORTS.slice(0, 4)) { // Test mobile sizes
    console.log(`\n--- Testing Content Library @ ${vp.name} (${vp.width}x${vp.height}) ---`);
    const pg = await browser.newPage();
    await pg.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true });
    await pg.setCookie({ name: 'auth_session_token', value: authToken, url: BASE });

    await pg.goto(`${BASE}/content`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    await takeScreenshot(pg, `content-library-${vp.name}`);

    const metrics = await measureElements(pg);
    libResults[vp.name] = metrics;

    if (metrics.horizontalOverflow) {
      addIssue('ContentLibrary', vp.name, 'CRITICAL', `Horizontal overflow`);
    }

    // Check card layout
    const cardLayout = await pg.evaluate(() => {
      const cards = document.querySelectorAll('[class*="card"], [class*="Card"], [class*="project"]');
      if (cards.length === 0) return { found: false, count: 0 };
      
      const cardRects = Array.from(cards).slice(0, 5).map(c => {
        const rect = c.getBoundingClientRect();
        return { width: Math.round(rect.width), height: Math.round(rect.height), left: Math.round(rect.left) };
      });

      return { found: true, count: cards.length, cardRects };
    });

    libResults[vp.name].cards = cardLayout;
    
    // Check if empty state is helpful
    const emptyState = await pg.evaluate(() => {
      const body = document.body.innerText || '';
      if (body.includes('No') && (body.includes('project') || body.includes('video'))) {
        return { hasEmptyState: true, text: body.slice(0, 200) };
      }
      return { hasEmptyState: false };
    });
    libResults[vp.name].emptyState = emptyState;

    await pg.close();
  }

  return libResults;
}

async function testVideoCreationFlow(browser: Browser, authToken: string) {
  console.log('\n=== SECTION 4: VIDEO CREATION FLOW UX AUDIT ===\n');
  
  const pg = await browser.newPage();
  await pg.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await pg.setCookie({ name: 'auth_session_token', value: authToken, url: BASE });

  await pg.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  
  try {
    await pg.waitForFunction(() => {
      const body = document.body.innerText || '';
      return !body.includes('Loading dashboard') && body.length > 100;
    }, { timeout: 15000 });
  } catch {}
  
  await new Promise(r => setTimeout(r, 2000));

  // Capture the video creation form state
  const creatorState = await pg.evaluate(() => {
    const body = document.body.innerText || '';
    
    // Find the topic input
    const inputs = Array.from(document.querySelectorAll('input, textarea'));
    const topicInput = inputs.find(i => {
      const ph = (i as HTMLInputElement).placeholder?.toLowerCase() || '';
      return ph.includes('topic') || ph.includes('about') || ph.includes('video') || ph.includes('enter');
    });

    // Find generate/create button
    const buttons = Array.from(document.querySelectorAll('button'));
    const generateBtn = buttons.find(b => {
      const text = b.innerText?.toLowerCase() || '';
      return text.includes('generate') || text.includes('create') || text.includes('make');
    });

    // Find any collapsible settings
    const advancedSection = Array.from(document.querySelectorAll('button, details, summary, [class*="collapse"], [class*="accordion"]')).find(el => {
      const text = (el as HTMLElement).innerText?.toLowerCase() || '';
      return text.includes('advanced') || text.includes('settings') || text.includes('options');
    });

    // Count visible form controls
    const visibleControls = inputs.filter(i => {
      const rect = i.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    return {
      topicInput: topicInput ? {
        found: true,
        placeholder: (topicInput as HTMLInputElement).placeholder,
        rect: topicInput.getBoundingClientRect(),
      } : { found: false },
      generateBtn: generateBtn ? {
        found: true,
        text: generateBtn.innerText?.trim(),
        rect: generateBtn.getBoundingClientRect(),
      } : { found: false },
      hasAdvancedSection: !!advancedSection,
      visibleControlsCount: visibleControls.length,
      pageTextSnippet: body.slice(0, 500),
    };
  });

  console.log('  Video Creator State:', JSON.stringify(creatorState, null, 2));
  await takeScreenshot(pg, 'video-creator-mobile-390');

  // Test: Can user understand what to do?
  if (!creatorState.topicInput.found) {
    addIssue('VideoCreator', 'iPhone-13', 'CRITICAL', 'No obvious topic input field found — user cannot start creating a video');
  }
  if (!creatorState.generateBtn.found) {
    addIssue('VideoCreator', 'iPhone-13', 'CRITICAL', 'No "Generate" or "Create" button found');
  }
  if (creatorState.visibleControlsCount > 5) {
    addIssue('VideoCreator', 'iPhone-13', 'MAJOR', `Too many visible form controls (${creatorState.visibleControlsCount}) — overwhelming for mobile user`);
  }

  // Try to enter a topic and click generate (without actually generating)
  if (creatorState.topicInput.found) {
    try {
      const topicInput = await pg.$('input[placeholder*="topic"], input[placeholder*="Topic"], input[placeholder*="about"], textarea[placeholder*="topic"], input[placeholder*="Enter"], textarea[placeholder*="Enter"]');
      if (topicInput) {
        await topicInput.click();
        await topicInput.type('Amazing Space Facts');
        await takeScreenshot(pg, 'video-creator-filled-390');
        console.log('  ✅ Successfully typed topic');
      }
    } catch (e) {
      addIssue('VideoCreator', 'iPhone-13', 'CRITICAL', `Cannot type in topic field: ${(e as Error).message}`);
    }
  }

  await pg.close();
  return creatorState;
}

async function testAuthFlow(browser: Browser) {
  console.log('\n=== SECTION 5: AUTH FLOW UX AUDIT ===\n');
  
  const pg = await browser.newPage();
  await pg.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  // Visit root as unauthenticated user
  await pg.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  
  try {
    await pg.waitForFunction(() => {
      const body = document.body.innerText || '';
      return !body.includes('Loading dashboard') && body.length > 50;
    }, { timeout: 15000 });
  } catch {}

  await new Promise(r => setTimeout(r, 2000));
  await takeScreenshot(pg, 'auth-unauthenticated-390');

  // Check if login/signup is visible
  const authState = await pg.evaluate(() => {
    const body = document.body.innerText || '';
    const hasLogin = body.toLowerCase().includes('log in') || body.toLowerCase().includes('login') || body.toLowerCase().includes('sign in');
    const hasSignup = body.toLowerCase().includes('sign up') || body.toLowerCase().includes('signup') || body.toLowerCase().includes('get started') || body.toLowerCase().includes('register');
    
    const authButtons = Array.from(document.querySelectorAll('button, a')).filter(el => {
      const text = (el as HTMLElement).innerText?.toLowerCase() || '';
      return text.includes('login') || text.includes('log in') || text.includes('sign') || text.includes('get started');
    }).map(el => ({
      text: (el as HTMLElement).innerText?.trim(),
      rect: el.getBoundingClientRect(),
      visible: el.getBoundingClientRect().top < window.innerHeight,
    }));

    return { hasLogin, hasSignup, authButtons, bodyPreview: body.slice(0, 300) };
  });

  console.log('  Auth state:', JSON.stringify(authState, null, 2));

  if (!authState.hasSignup && !authState.hasLogin) {
    addIssue('Auth', 'iPhone-13', 'CRITICAL', 'No sign up or login option visible on landing');
  }

  // Look for auth form
  const authForm = await pg.evaluate(() => {
    const forms = document.querySelectorAll('form');
    const emailInput = document.querySelector('input[type="email"], input[name="email"]');
    const passInput = document.querySelector('input[type="password"]');
    return {
      formCount: forms.length,
      hasEmailInput: !!emailInput,
      hasPasswordInput: !!passInput,
    };
  });

  console.log('  Auth form:', JSON.stringify(authForm));

  await pg.close();
  return { authState, authForm };
}

async function testAllRoutes(browser: Browser, authToken: string) {
  console.log('\n=== SECTION 6: ALL ROUTES MOBILE CHECK ===\n');
  
  const routes = [
    { path: '/', name: 'Dashboard' },
    { path: '/landing', name: 'Landing' },
    { path: '/content', name: 'ContentLibrary' },
    { path: '/workflow', name: 'Workflow' },
    { path: '/analytics', name: 'Analytics' },
    { path: '/channels', name: 'Channels' },
    { path: '/schedule', name: 'Schedule' },
    { path: '/settings', name: 'Settings' },
  ];

  const routeResults: any = {};

  for (const route of routes) {
    console.log(`\n  Testing ${route.name} (${route.path})...`);
    const pg = await browser.newPage();
    await pg.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    if (authToken) {
      await pg.setCookie({ name: 'auth_session_token', value: authToken, url: BASE });
    }

    try {
      const response = await pg.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle2', timeout: 15000 });
      const status = response?.status() || 0;

      await new Promise(r => setTimeout(r, 1500));
      await takeScreenshot(pg, `route-${route.name}-390`);

      const metrics = await measureElements(pg);
      
      routeResults[route.name] = {
        status,
        horizontalOverflow: metrics.horizontalOverflow,
        smallTapTargets: metrics.smallTapTargets?.length || 0,
        tooSmallText: metrics.tooSmallText?.length || 0,
        technicalJargon: metrics.technicalJargon,
      };

      if (metrics.horizontalOverflow) {
        addIssue(route.name, 'iPhone-13', 'CRITICAL', 'Horizontal overflow on mobile');
      }

      console.log(`    Status: ${status}, Overflow: ${metrics.horizontalOverflow}, SmallTargets: ${metrics.smallTapTargets?.length}`);
    } catch (e) {
      routeResults[route.name] = { error: (e as Error).message };
      addIssue(route.name, 'iPhone-13', 'CRITICAL', `Page failed to load: ${(e as Error).message.slice(0, 80)}`);
    }

    await pg.close();
  }

  return routeResults;
}

async function testFirstTimeUserExperience(browser: Browser) {
  console.log('\n=== SECTION 7: FIRST-TIME USER EXPERIENCE TEST ===\n');
  console.log('  Simulating a FIRST-TIME user on iPhone...\n');
  
  const pg = await browser.newPage();
  await pg.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  // Step 1: User opens the app
  await pg.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await pg.waitForFunction(() => document.body.innerText.length > 50, { timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
  await takeScreenshot(pg, 'ftue-01-first-open');

  const firstImpression = await pg.evaluate(() => {
    const body = document.body.innerText || '';
    const h1 = document.querySelector('h1');
    const h2 = document.querySelector('h2');
    return {
      headline: h1?.innerText?.trim() || 'NO H1 FOUND',
      subheadline: h2?.innerText?.trim() || 'NO H2 FOUND',
      bodyLength: body.length,
      hasCallToAction: body.toLowerCase().includes('get started') || body.toLowerCase().includes('sign up') || body.toLowerCase().includes('create'),
      bodyPreview: body.slice(0, 500),
    };
  });

  console.log('  First impression:');
  console.log(`    Headline: ${firstImpression.headline}`);
  console.log(`    Sub: ${firstImpression.subheadline}`);
  console.log(`    Has CTA: ${firstImpression.hasCallToAction}`);

  // Step 2: Can user understand what this app does within 5 seconds?
  const clarity = await pg.evaluate(() => {
    const body = document.body.innerText?.toLowerCase() || '';
    return {
      mentionsVideo: body.includes('video'),
      mentionsYoutube: body.includes('youtube'),
      mentionsAI: body.includes('ai') || body.includes('artificial'),
      mentionsAutomate: body.includes('automat'),
      mentionsShort: body.includes('short'),
    };
  });
  console.log('  Value proposition clarity:', JSON.stringify(clarity));

  if (!clarity.mentionsVideo && !clarity.mentionsShort) {
    addIssue('FTUE', 'iPhone-13', 'CRITICAL', 'Landing page does not clearly mention "video" or "shorts" — user cannot understand app purpose');
  }

  await pg.close();
  return { firstImpression, clarity };
}

// Main execution
(async () => {
  if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

  console.log('🚀 AUTOSHORT MOBILE-FIRST UX DEEP AUDIT');
  console.log('=' .repeat(60));
  console.log(`Screenshots saved to: ${SS_DIR}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Test 1: Landing page at all viewports
    results['landing'] = await testLandingPage(browser);

    // Test 2: Auth flow
    results['auth'] = await testAuthFlow(browser);

    // Test 3: Dashboard at all viewports (includes signup/login)
    const dashData = await testDashboard(browser);
    results['dashboard'] = dashData.dashResults;
    const authToken = dashData.authToken;

    // Test 4: Video creation flow
    if (authToken) {
      results['videoCreator'] = await testVideoCreationFlow(browser, authToken);
    }

    // Test 5: Content library
    if (authToken) {
      results['contentLibrary'] = await testContentLibrary(browser, authToken);
    }

    // Test 6: All routes
    if (authToken) {
      results['routes'] = await testAllRoutes(browser, authToken);
    }

    // Test 7: First-time user experience
    results['ftue'] = await testFirstTimeUserExperience(browser);

  } finally {
    await browser.close();
  }

  // Generate summary report
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 UX AUDIT SUMMARY');
  console.log('='.repeat(60));

  const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
  const majorCount = issues.filter(i => i.severity === 'MAJOR').length;
  const minorCount = issues.filter(i => i.severity === 'MINOR').length;

  console.log(`\n  CRITICAL: ${criticalCount}`);
  console.log(`  MAJOR: ${majorCount}`);
  console.log(`  MINOR: ${minorCount}`);
  console.log(`  TOTAL ISSUES: ${issues.length}`);

  console.log('\n--- ALL ISSUES ---');
  issues.forEach((issue, i) => {
    console.log(`\n  ${i + 1}. [${issue.severity}] ${issue.screen} @ ${issue.viewport}`);
    console.log(`     ${issue.description}`);
    if (issue.element) console.log(`     Element: ${issue.element}`);
  });

  // Save results
  const outputPath = path.join(__dirname, '..', 'mobile-ux-audit-results.json');
  fs.writeFileSync(outputPath, JSON.stringify({ issues, results, timestamp: new Date().toISOString() }, null, 2));
  console.log(`\n✅ Full results saved to: ${outputPath}`);

  // Verdict
  console.log('\n' + '='.repeat(60));
  if (criticalCount > 0) {
    console.log('❌ VERDICT: NOT PRODUCTION READY — Critical mobile UX issues found');
  } else if (majorCount > 3) {
    console.log('⚠️ VERDICT: NEEDS IMPROVEMENT — Multiple major UX issues');
  } else {
    console.log('✅ VERDICT: MOBILE UX ACCEPTABLE');
  }
  console.log('='.repeat(60));
})();
