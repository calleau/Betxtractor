// ========== content.js ==========
// Compatibilité Chrome et Firefox
const API = typeof browser !== 'undefined' ? browser : chrome;

console.log('[Betxtractor CS] 🚀 CONTENT SCRIPT CHARGEMENT DÉBUT');
console.log('[Betxtractor CS] Hostname:', window.location.hostname);
console.log('[Betxtractor CS] URL:', window.location.href);
console.log('[Betxtractor CS] API type:', typeof browser !== 'undefined' ? 'Firefox' : 'Chrome');
console.log('[Betxtractor CS] document.readyState:', document.readyState);

// Vérifier que les fonctions sont disponibles
console.log('[Betxtractor CS] detectCurrentSite disponible:', typeof detectCurrentSite);
console.log('[Betxtractor CS] SiteAdapter disponible:', typeof SiteAdapter);

console.log('[Betxtractor CS] ✅ CONTENT SCRIPT CHARGÉ AVEC SUCCÈS');

// ========== DOM OBSERVATION SYSTEM ==========
// Observer les changements du DOM pour détecter l'apparition des marchés/cotes
// Cela permet de capturer les données même si elles sont chargées après le script
let mutationObserver = null;
let lastObservedTime = 0;
const OBSERVATION_DEBOUNCE = 1000; // Ne logger que tous les 1s pour éviter le spam

function initDOMObserver() {
  if (mutationObserver) return; // Déjà initialisé
  
  const observer = new MutationObserver((mutations) => {
    const now = Date.now();
    if (now - lastObservedTime > OBSERVATION_DEBOUNCE) {
      console.log('[Betxtractor CS] 👀 DOM mutation detected - contenu peut avoir changé');
      lastObservedTime = now;
    }
  });
  
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: false,
    attributes: false
  });
  
  mutationObserver = observer;
  console.log('[Betxtractor CS] ✅ DOM Observer initialisé');
}

// Initialiser l'observer au chargement du script
initDOMObserver();

// ========== POSTMESSAGE LISTENER ==========
// Permet à d'autres scripts d'envoyer des messages à ce content script
// Utile pour communiquer avec les iframes ou d'autres contextes
window.addEventListener('message', (event) => {
  console.log('[Betxtractor CS] Message reçu:', event.data);
  
  // Vérifier qu'on a un message valide
  if (!event.data) return;
  
  // Demande de contenu DOM depuis la page parent ou une iframe
  if (event.data.action === 'getDomContent') {
    console.log('[Betxtractor CS] ✅ Demande de contenu DOM reçue');
    console.log('[Betxtractor CS] Source du message:', event.origin);
    console.log('[Betxtractor CS] URL actuelle:', window.location.href);
    
    // Envoyer le HTML complet et les données extraites
    const response = {
      action: 'getDomContent',
      source: 'betxtractor',
      url: window.location.href,
      html: document.documentElement.outerHTML,
      iframeDoc: document.documentElement.outerHTML
    };
    
    console.log('[Betxtractor CS] Envoi de la réponse avec HTML complet...');
    event.source.postMessage(response, '*');
    console.log('[Betxtractor CS] ✅ Réponse envoyée');
  }
}, false);

function extractMatchData() {
  const matches = [];
  
  // Sélectionner tous les événements
  const events = document.querySelectorAll('psel-event-main.psel-event');
  
  events.forEach(event => {
    try {
      // Extraire les informations du match
      const link = event.querySelector('a.psel-event__link');
      const url = link ? link.getAttribute('href') : null;
      
      // Informations de la compétition
      const competition = event.querySelector('.psel-event-info__competition');
      const dateTime = event.querySelector('.psel-timer');
      
      // Noms des joueurs/équipes
      const opponents = event.querySelectorAll('.psel-opponent__name');
      
      // Cotes et pourcentages
      const outcomes = event.querySelectorAll('psel-outcome button');
      
      const matchData = {
        url: url ? `https://www.enligne.parionssport.fdj.fr${url}` : null,
        competition: competition ? competition.textContent.trim() : null,
        dateTime: dateTime ? dateTime.textContent.trim() : null,
        opponents: [],
        cotes: []
      };
      
      // Extraire les noms des adversaires
      opponents.forEach(opponent => {
        matchData.opponents.push(opponent.textContent.trim());
      });
      
      // Extraire les cotes
      outcomes.forEach(outcome => {
        const label = outcome.querySelector('.psel-outcome__label');
        const odd = outcome.querySelector('.psel-outcome__data');
        
        if (label && odd) {
          const progressBar = outcome.parentElement.querySelector('.psel-progress-bar__counter');
          
          matchData.cotes.push({
            joueur: label.textContent.trim(),
            cote: parseFloat(odd.textContent.trim().replace(',', '.')),
            pourcentage: progressBar ? parseInt(progressBar.textContent.trim()) : null
          });
        }
      });
      
      if (matchData.opponents.length > 0 && matchData.cotes.length > 0) {
        matches.push(matchData);
      }
    } catch (error) {
      console.error('Erreur lors de l\'extraction d\'un match:', error);
    }
  });
  
  return matches;
}

// Message listener configuré ci-dessous

function mergeMatchesBySite(matchesData) {
  const mergedMatches = {};
  
  // Regrouper par match avec structure markets
  matchesData.forEach(match => {
    const dateDisplay = match.dateTime ? match.dateTime.replace('T', ' ').substring(0, 16) : 'N/A';
    const matchKey = `${match.opponents.join(' vs ')} - ${dateDisplay} - ${match.competition}`;
    
    if (!mergedMatches[matchKey]) {
      // Préserver l'ordre des cotes telles qu'elles apparaissent dans le HTML
      // au lieu d'utiliser Set() qui perd l'ordre
      const joueursList = [];
      match.cotes.forEach(cote => {
        if (!joueursList.includes(cote.joueur)) {
          joueursList.push(cote.joueur);
        }
      });
      
      mergedMatches[matchKey] = {
        competition: match.competition,
        dateTime: match.dateTime,
        opponents: joueursList,
        ids: {},
        markets: {
          'Vainqueur': {}
        }
      };
      
      // Initialiser l'ID pour le site actuel
      if (match.id) {
        mergedMatches[matchKey].ids[match.siteName] = match.id;
      }
      
      // Initialiser tous les joueurs/nuls dans le marché Vainqueur dans l'ordre original
      joueursList.forEach(joueur => {
        mergedMatches[matchKey].markets['Vainqueur'][joueur] = {};
      });
    } else {
      // Ajouter l'ID du site si on rencontre le même match mais d'un autre site
      if (match.id && match.siteName) {
        mergedMatches[matchKey].ids[match.siteName] = match.id;
      }
    }
    
    // Ajouter les cotes du site pour chaque joueur
    match.cotes.forEach(cote => {
      if (mergedMatches[matchKey].markets['Vainqueur'][cote.joueur]) {
        // Gestion pour PSEL et autres sites (format simple: cote)
        if (cote.cote !== undefined) {
          mergedMatches[matchKey].markets['Vainqueur'][cote.joueur][match.siteName] = cote.cote;
        }
        // Gestion pour PIWIXchange (format complexe: Back/Lay)
        else if (cote.back || cote.lay) {
          mergedMatches[matchKey].markets['Vainqueur'][cote.joueur][match.siteName] = {
            Back: cote.back ? {
              odds: cote.back.odds,
              amount: cote.back.amount
            } : null,
            Lay: cote.lay ? {
              odds: cote.lay.odds,
              amount: cote.lay.amount
            } : null
          };
        }
      }
    });
  });
  
  return mergedMatches;
}

// Écouter les messages du popup
API.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Betxtractor CS] 📨 MESSAGE REÇU');
  console.log('[Betxtractor CS] Request:', request);
  console.log('[Betxtractor CS] Sender:', sender);
  
  try {
    if (request.action === 'extract') {
      console.log('[Betxtractor CS] ✅ Action "extract" reconnue');
      console.log('[Betxtractor CS] Détection du site...');
      const siteInfo = detectCurrentSite();
      
      if (siteInfo) {
        console.log(`[Betxtractor CS] ✅ Site détecté: ${siteInfo.site} (${siteInfo.definition.name})`);
        console.log(`[Betxtractor CS] 🔧 Definition:`, siteInfo.definition);
        
        try {
          console.log('[Betxtractor CS] 🔄 Appel createSiteAdapter...');
          const adapter = createSiteAdapter(siteInfo.site, siteInfo.definition);
          console.log('[Betxtractor CS] 📦 Résultat createSiteAdapter:', adapter);
          
          if (!adapter) {
            console.error('[Betxtractor CS] ❌ createSiteAdapter a retourné null ou undefined');
            sendResponse({ success: false, error: 'Adaptateur non initialisé' });
            return;
          }
          
          console.log('[Betxtractor CS] ✅ Adaptateur disponible, type:', typeof adapter, 'métodes:', Object.getOwnPropertyNames(Object.getPrototypeOf(adapter)));
          console.log('[Betxtractor CS] ✅ Adaptateur créé');
          
          console.log('[Betxtractor CS] 🔨 Appel adapter.extractOdds()...');
          console.log('[Betxtractor CS] adapter:', adapter);
          console.log('[Betxtractor CS] adapter.extractOdds:', adapter.extractOdds);
          console.log('[Betxtractor CS] typeof adapter.extractOdds:', typeof adapter.extractOdds);
          
          // extractOdds peut être asynchrone (retourne une Promise)
          const result = adapter.extractOdds();
          
          // Vérifier si c'est une Promise
          if (result instanceof Promise) {
            console.log('[Betxtractor CS] ⏳ extractOdds() retourne une Promise, en attente...');
            result.then(data => {
              console.log('[Betxtractor CS] ✅ extractOdds() Promise résolue:', data);
              if (!data || !Array.isArray(data)) {
                console.error('[Betxtractor CS] ❌ L\'adaptateur n\'a pas retourné un tableau:', data, 'type:', typeof data);
                sendResponse({ success: false, error: 'Erreur lors de l\'extraction des cotes' });
                return;
              }
              
              console.log(`[Betxtractor CS] ✅ ${data.length} match(s) extrait(s)`);
              
              const merged = mergeMatchesBySite(data);
              console.log(`[Betxtractor CS] ✅ Fusion complétée: ${Object.keys(merged).length} match(s) unique(s)`);
              
              console.log('[Betxtractor CS] 📤 Envoi de la réponse...');
              sendResponse({ success: true, data: merged });
            }).catch(error => {
              console.error('[Betxtractor CS] ❌ Erreur lors de la résolution Promise:', error);
              sendResponse({ success: false, error: `Erreur: ${error.message}` });
            });
            return true;  // Indiquer au navigateur de garder le port ouvert pour la réponse asynchrone
          }
          
          // Si ce n'est pas une Promise, traiter comme avant (synchrone)
          const data = result;
          
          console.log('[Betxtractor CS] ✅ extractOdds() a retourné:', data);
          
          if (!data || !Array.isArray(data)) {
            console.error('[Betxtractor CS] ❌ L\'adaptateur n\'a pas retourné un tableau:', data, 'type:', typeof data);
            sendResponse({ success: false, error: 'Erreur lors de l\'extraction des cotes' });
            return;
          }
          
          console.log(`[Betxtractor CS] ✅ ${data.length} match(s) extrait(s)`);
          
          const merged = mergeMatchesBySite(data);
          console.log(`[Betxtractor CS] ✅ Fusion complétée: ${Object.keys(merged).length} match(s) unique(s)`);
          
          console.log('[Betxtractor CS] 📤 Envoi de la réponse...');
          sendResponse({ success: true, data: merged });
        } catch (error) {
          console.error('[Betxtractor CS] ❌ Erreur lors du traitement:', error);
          console.error('[Betxtractor CS] Stack:', error.stack);
          sendResponse({ success: false, error: `Erreur: ${error.message}` });
        }
      } else {
        console.error('[Betxtractor CS] ❌ Site non reconnu. Hostname:', window.location.hostname);
        sendResponse({ success: false, error: 'Site non reconnu' });
      }
    } else {
      console.warn('[Betxtractor CS] ⚠️ Action non reconnue:', request.action);
      sendResponse({ success: false, error: 'Action non reconnue' });
    }
  } catch (error) {
    console.error('[Betxtractor CS] ❌ Erreur lors du traitement:', error);
    console.error('[Betxtractor CS] Stack:', error.stack);
    sendResponse({ success: false, error: error.message });
  }
  return true;
});