const SITE_DEFINITIONS = {
  parisSport: {
    name: 'PSEL',
    domain: 'parionssport.fdj.fr',
    selectors: {
      events: 'psel-event-main.psel-event',
      eventName: '.psel-event__link',
      odds: 'psel-outcome button',
      oddsContainer: null
    }
  },
  betclic: {
    name: 'Betclic',
    domain: 'betclic.fr',
    selectors: {
      events: 'sports-events-event-card',
      eventName: '.scoreboard_contestantLabel',
      odds: '.btn.is-odd',
      oddsContainer: '.market_odds'
    }
  },
  pmu: {
    name: 'PMU',
    domain: 'pmu.fr',
    selectors: {
      events: '.race-card',
      eventName: '.race-title',
      odds: '.cote',
      oddsContainer: '.cotes-group'
    }
  },
  unibet: {
    name: 'Unibet',
    domain: 'unibet.fr',
    selectors: {
      events: '[data-event-id]',
      eventName: '.event-title',
      odds: '.odds-btn',
      oddsContainer: '.odds-container'
    }
  },
  piwixchange: {
    name: 'PIWIXchange',
    domain: 'piwi247.com',
    selectors: {
      events: '[class*="market"]',
      eventName: '[class*="event-title"]',
      odds: '[class*="back"], [class*="lay"]',
      oddsContainer: '[class*="odds"]'
    }
  }
};

function detectCurrentSite() {
  const hostname = window.location.hostname;
  for (const [key, def] of Object.entries(SITE_DEFINITIONS)) {
    if (hostname.includes(def.domain)) {
      return { site: key, definition: def };
    }
  }
  return null;
}

function getSiteDefinition(siteName) {
  return SITE_DEFINITIONS[siteName] || null;
}
