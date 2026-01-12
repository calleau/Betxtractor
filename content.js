// ========== content.js ==========
// Compatibilité Chrome et Firefox
const API = typeof browser !== 'undefined' ? browser : chrome;

console.log('[Betxtractor CS] 🚀 CONTENT SCRIPT CHARGEMENT DÉBUT');
console.log('[Betxtractor CS] Hostname:', window.location.hostname);
console.log('[Betxtractor CS] URL:', window.location.href);
console.log('[Betxtractor CS] API type:', typeof browser !== 'undefined' ? 'Firefox' : 'Chrome');

// Vérifier que les fonctions sont disponibles
console.log('[Betxtractor CS] detectCurrentSite disponible:', typeof detectCurrentSite);
console.log('[Betxtractor CS] SiteAdapter disponible:', typeof SiteAdapter);

console.log('[Betxtractor CS] ✅ CONTENT SCRIPT CHARGÉ AVEC SUCCÈS');

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
      // Vérifier s'il y a un "Nul" dans les cotes
      const hasNul = match.cotes.some(cote => cote.joueur === 'Nul');

      // Déterminer les issues distinctes trouvées dans les cotes
      const uniqueOutcomeNames = Array.from(new Set(match.cotes.map(c => c.joueur)));

      // Créer la liste des opponents (joueurs + éventuellement "Nul")
      // N'ajouter "Nul" que si le marché contient bien 3 issues distinctes
      let opponentsList = [...match.opponents];
      if (hasNul && uniqueOutcomeNames.length >= 3 && !opponentsList.includes('Nul')) {
        opponentsList.push('Nul');
      }
      
      mergedMatches[matchKey] = {
        competition: match.competition,
        dateTime: match.dateTime,
        opponents: opponentsList,
        markets: {
          'Vainqueur': {}
        }
      };
      
      // Initialiser tous les joueurs/nuls dans le marché Vainqueur
      opponentsList.forEach(opponent => {
        mergedMatches[matchKey].markets['Vainqueur'][opponent] = {};
      });
    }
    
    // Ajouter les cotes du site pour chaque joueur
    match.cotes.forEach(cote => {
      if (mergedMatches[matchKey].markets['Vainqueur'][cote.joueur]) {
        mergedMatches[matchKey].markets['Vainqueur'][cote.joueur][match.siteName] = cote.cote;
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
        
        const adapter = new SiteAdapter(siteInfo.site, siteInfo.definition);
        console.log('[Betxtractor CS] ✅ Adaptateur créé');
        
        const data = adapter.extractOdds();
        console.log(`[Betxtractor CS] ✅ ${data.length} match(s) extrait(s)`);
        
        const merged = mergeMatchesBySite(data);
        console.log(`[Betxtractor CS] ✅ Fusion complétée: ${Object.keys(merged).length} match(s) unique(s)`);
        
        console.log('[Betxtractor CS] 📤 Envoi de la réponse...');
        sendResponse({ success: true, data: merged });
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