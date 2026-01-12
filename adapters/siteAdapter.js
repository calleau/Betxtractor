// ========== siteAdapter.js ==========
// Routeur pour créer l'adaptateur approprié selon le site

function createSiteAdapter(siteName, definition) {
  console.log(`[SiteAdapter Router] Création adaptateur pour: ${siteName}`);
  
  switch (siteName) {
    case 'parisSport':
      return new ParisSportAdapter(siteName, definition);
    case 'betclic':
      return new BetclicAdapter(siteName, definition);
    case 'pmu':
      return new PMUAdapter(siteName, definition);
    case 'unibet':
      return new UnibetAdapter(siteName, definition);
    default:
      throw new Error(`Site inconnu: ${siteName}`);
  }
}

// Pour compatibilité avec l'ancien code qui utilise SiteAdapter directement
class SiteAdapter {
  constructor(siteName, definition) {
    return createSiteAdapter(siteName, definition);
  }
}