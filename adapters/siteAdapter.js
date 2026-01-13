// ========== siteAdapter.js ==========
// Routeur pour créer l'adaptateur approprié selon le site

function createSiteAdapter(siteName, definition) {
  console.log(`[SiteAdapter Router] Création adaptateur pour: ${siteName}`);
  
  try {
    let adapter = null;
    
    switch (siteName) {
      case 'parisSport':
        console.log('[SiteAdapter Router] Instanciation ParisSportAdapter...');
        adapter = new ParisSportAdapter(siteName, definition);
        console.log('[SiteAdapter Router] ✓ ParisSportAdapter créé');
        break;
      case 'betclic':
        console.log('[SiteAdapter Router] Instanciation BetclicAdapter...');
        adapter = new BetclicAdapter(siteName, definition);
        console.log('[SiteAdapter Router] ✓ BetclicAdapter créé');
        break;
      case 'pmu':
        console.log('[SiteAdapter Router] Instanciation PMUAdapter...');
        adapter = new PMUAdapter(siteName, definition);
        console.log('[SiteAdapter Router] ✓ PMUAdapter créé');
        break;
      case 'unibet':
        console.log('[SiteAdapter Router] Instanciation UnibetAdapter...');
        adapter = new UnibetAdapter(siteName, definition);
        console.log('[SiteAdapter Router] ✓ UnibetAdapter créé');
        break;
      case 'piwixchange':
        console.log('[SiteAdapter Router] Instanciation PiwixchangeAdapter...');
        adapter = new PiwixchangeAdapter(siteName, definition);
        console.log('[SiteAdapter Router] ✓ PiwixchangeAdapter créé');
        break;
      default:
        throw new Error(`Site inconnu: ${siteName}`);
    }
    
    if (!adapter) {
      console.error(`[SiteAdapter Router] ❌ Adaptateur null pour: ${siteName}`);
      return null;
    }
    
    console.log(`[SiteAdapter Router] ✅ Adaptateur créé avec succès pour: ${siteName}`);
    return adapter;
  } catch (error) {
    console.error(`[SiteAdapter Router] ❌ Erreur lors de la création de l'adaptateur pour ${siteName}:`, error.message);
    console.error(`Stack:`, error.stack);
    return null;
  }
}

// Pour compatibilité avec l'ancien code qui utilise SiteAdapter directement
class SiteAdapter {
  constructor(siteName, definition) {
    // Ne pas utiliser le constructeur pour la factory
    // À la place, utiliser directement createSiteAdapter en tant que factory
    throw new Error('Utilisez createSiteAdapter() au lieu de new SiteAdapter()');
  }
  
  // Méthode statique pour créer l'adaptateur
  static create(siteName, definition) {
    return createSiteAdapter(siteName, definition);
  }
}