// ========== piwixchangeAdapter.js ==========
// Adaptateur spécifique pour PIWIXchange (Betting Exchange)

class PiwixchangeAdapter extends BaseSiteAdapter {
  extractOdds() {
    console.log('[PIWIXchange Adapter] extractOdds() appelé!');
    return this.extractFromPiwi();
  }
  
  /**
   * Extraire les matchs et cotes de PIWIXchange
   */
  async extractFromPiwi() {
    console.log('[PIWIXchange Adapter] === EXTRACTION PIWI ===');
    
    // Chercher l'iframe
    const iframe = document.getElementById('exchange-section');
    if (!iframe) {
      console.warn('[PIWIXchange Adapter] ❌ Iframe exchange-section NOT FOUND');
      return [];
    }
    
    // Demander les données à l'iframe
    return await this.getMatchesFromIframe(iframe);
  }
  
  /**
   * Demander les matchs et cotes à l'iframe via postMessage
   */
  getMatchesFromIframe(iframe) {
    return new Promise((resolve) => {
      const messageHandler = (event) => {
        if (event.data && event.data.action === 'getDomContent') {
          console.log('[PIWIXchange Adapter] ✅ Données reçues de l\'iframe');
          window.removeEventListener('message', messageHandler);
          
          // Extraire les matchs et cotes
          const matches = this.parseMatches(event.data.iframeDoc || event.data.html);
          resolve(matches);
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      setTimeout(() => {
        console.warn('[PIWIXchange Adapter] ⏱️ Timeout');
        window.removeEventListener('message', messageHandler);
        resolve([]);
      }, 5000);
      
      console.log('[PIWIXchange Adapter] Demande des matchs à l\'iframe...');
      iframe.contentWindow.postMessage({ action: 'getDomContent', source: 'betxtractor' }, '*');
    });
  }
  
  /**
   * Parser le HTML pour extraire les matchs
   */
  parseMatches(htmlString) {
    console.log('[PIWIXchange Adapter] === PARSING DES MATCHS ===');
    
    // Créer un document DOM virtuel pour parser le HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    
    const matches = [];
    
    // Chercher toutes les lignes de marché
    const marketRows = doc.querySelectorAll('.biab_group-markets-table-row');
    console.log(`Nombre de matchs trouvés: ${marketRows.length}`);
    
    marketRows.forEach((row, idx) => {
      try {
        const match = this.extractMatch(row);
        if (match) {
          matches.push(match);
          console.log(`[${idx}] ✅ Match extrait: ${match.opponents.join(' vs ')}`);
        }
      } catch (e) {
        console.error(`[${idx}] ❌ Erreur lors de l'extraction:`, e);
      }
    });
    
    console.log(`[PIWIXchange Adapter] Total: ${matches.length} match(s) extrait(s)`);
    return matches;
  }
  
  /**
   * Extraire un match individuel
   */
  extractMatch(row) {
    // Récupérer les identifiants
    const eventId = row.getAttribute('data-event-id');
    const marketId = row.getAttribute('data-market-id');
    
    if (!eventId || !marketId) {
      console.warn('❌ Pas d\'eventId ou marketId');
      return null;
    }
    
    // Récupérer les noms des équipes
    const teamNamesEl = row.querySelector('.biab_market-title-team-names');
    const opponents = [];
    if (teamNamesEl) {
      teamNamesEl.querySelectorAll('p').forEach(p => {
        opponents.push(p.textContent.trim());
      });
    }
    
    if (opponents.length === 0) {
      console.warn('❌ Pas d\'équipes trouvées');
      return null;
    }
    
    // Récupérer les cotes (Back et Lay)
    const betContentWrapper = row.querySelector('._betContent__wrapper_1rfne_1');
    if (!betContentWrapper) {
      console.warn('❌ Pas de betContentWrapper');
      return null;
    }
    
    // Extraire les conteneurs d'options (équipes/résultats)
    const betContainers = betContentWrapper.querySelectorAll('.betContentContainer');
    const cotes = [];
    
    betContainers.forEach((container, optionIdx) => {
      const selectionId = container.getAttribute('data-selection-id');
      const option = {
        selectionId: selectionId,
        back: null,
        lay: null
      };
      
      // Chercher Back et Lay
      const backCell = container.querySelector('.biab_back-cell');
      const layCell = container.querySelector('.biab_lay-cell');
      
      if (backCell) {
        option.back = this.extractOddsFromCell(backCell);
      }
      
      if (layCell) {
        option.lay = this.extractOddsFromCell(layCell);
      }
      
      // Ajouter seulement si on a au moins Back ou Lay
      if (option.back || option.lay) {
        cotes.push(option);
      }
    });
    
    return {
      eventId: eventId,
      marketId: marketId,
      opponents: opponents,
      cotes: cotes
    };
  }
  
  /**
   * Extraire les cotes (odds et amount) d'une cellule
   */
  extractOddsFromCell(cell) {
    const betContent = cell.querySelector('.biab_bet-content');
    if (!betContent || betContent.textContent.trim() === '') {
      return null;
    }
    
    const oddsSpan = betContent.querySelector('.betOdds');
    const amountSpan = betContent.querySelector('.betAmount');
    
    const odds = oddsSpan ? parseFloat(oddsSpan.textContent.trim()) : null;
    const amount = amountSpan ? parseFloat(amountSpan.textContent.trim()) : null;
    
    if (odds === null) {
      return null;
    }
    
    return {
      odds: odds,
      amount: amount
    };
  }
}
