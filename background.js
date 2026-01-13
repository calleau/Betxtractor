// ========== background.js ==========
// Compatibilité Chrome et Firefox
const API = typeof browser !== 'undefined' ? browser : chrome;

console.log('[Betxtractor] Background script chargé');

// Écouter les messages du popup
API.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Betxtractor BG] Message reçu:', request);
  console.log('[Betxtractor BG] Depuis tab:', sender.tab?.url);
  
  if (request.action === 'extract') {
    console.log('[Betxtractor BG] Forwarding extract message...');
    
    // Envoyer le message au content script
    API.tabs.sendMessage(sender.tab.id, { action: 'extract' }, (response) => {
      if (API.runtime.lastError) {
        console.error('[Betxtractor BG] Erreur sendMessage:', API.runtime.lastError);
        sendResponse({ success: false, error: `Erreur BG: ${API.runtime.lastError.message}` });
      } else {
        console.log('[Betxtractor BG] Réponse reçue:', response);
        sendResponse(response);
      }
    });
    return true;
  }
});

// Vérifier le chargement du content script
API.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log('[Betxtractor BG] Tab updated:', tab.url);
    
    // Vérifier si l'URL correspond aux patterns autorisés
    const supportedDomains = ['betclic.fr', 'parionssport.fdj.fr', 'pmu.fr', 'unibet.fr', 'piwi247.com', 'piwi88.com', 'piwi365.com', 'piwi99.com'];
    const isSupported = supportedDomains.some(domain => tab.url.includes(domain));
    console.log('[Betxtractor BG] URL supportée:', isSupported, tab.url);
  }
});
