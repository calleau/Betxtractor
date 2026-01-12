// ========== parisSportAdapter.js ==========
// Adaptateur spécifique pour PSEL (Parions Sport En Ligne)

class ParisSportAdapter extends BaseSiteAdapter {
  extractOdds() {
    console.log('[PSEL Adapter] 🚀 Extraction PSEL');
    const matches = [];
    
    // Sélectionner TOUS les événements (live ET programmés)
    // psel-event peut être: psel-event-live (live) ou psel-event (programmé)
    const allEvents = document.querySelectorAll('psel-event-live.psel-event, psel-event-main.psel-event, .psel-event');
    console.log(`[PSEL Adapter] 📊 ${allEvents.length} événement(s) trouvé(s) (live + programmés)`);
    
    const processedEvents = new Set(); // Pour éviter les doublons
    
    allEvents.forEach((event, index) => {
      try {
        // Extraire le lien vers l'événement
        const link = event.querySelector('a.psel-event__link');
        const url = link ? link.getAttribute('href') : null;
        
        // Vérifier si on a déjà traité cet événement
        if (url && processedEvents.has(url)) {
          console.log(`[PSEL Adapter] ⏭️  Event ${index + 1}: déjà traité (doublon ignoré)`);
          return;
        }
        if (url) {
          processedEvents.add(url);
        }
        
        // Extraire la compétition depuis psel-event-info__competition
        const competitionEl = event.querySelector('.psel-event-info__competition');
        const competition = competitionEl ? competitionEl.textContent.trim() : null;
        
        // Extraire l'heure/statut depuis psel-timer ou psel-event-info__date
        const timerEl = event.querySelector('time.psel-timer');
        const dateEl = event.querySelector('.psel-event-info__date');
        const dateTimeText = timerEl ? timerEl.textContent.trim() : (dateEl ? dateEl.textContent.trim() : null);
        
        // Extraire les noms des équipes depuis .psel-opponent__name
        const opponentElements = event.querySelectorAll('.psel-opponent__name');
        const opponentsList = Array.from(opponentElements).map(el => el.textContent.trim());
        
        if (opponentsList.length < 2) {
          console.log(`[PSEL Adapter] ⚠️ Event ${index + 1}: moins de 2 adversaires trouvés`);
          return;
        }
        
        // Extraire les cotes depuis les boutons psel-outcome
        const cotes = this.extractMarkets(event, opponentsList);
        
        if (cotes.length === 0) {
          console.log(`[PSEL Adapter] ⚠️ Event ${index + 1}: aucune cote trouvée`);
          return;
        }
        
        const dateTimeISO = this.convertDateTimeToISO(dateTimeText);
        
        matches.push({
          competition: competition,
          dateTime: dateTimeISO,
          opponents: opponentsList,
          url: url ? `https://www.enligne.parionssport.fdj.fr${url}` : null,
          site: this.siteName,
          siteName: this.siteFriendlyName,
          cotes: cotes
        });
        
        console.log(`[PSEL Adapter] ✅ Match ${index + 1}: ${opponentsList.join(' vs ')} (${cotes.length} cotes)`);
      } catch (error) {
        console.error(`[PSEL Adapter] ❌ Erreur event ${index + 1}:`, error);
      }
    });
    
    console.log(`[PSEL Adapter] ✨ Total: ${matches.length} match(s) extrait(s)`);
    return matches;
  }
  
  extractMarkets(event, opponents) {
    const cotes = [];
    
    // Sélectionner tous les marchés (tables avec classe psel-market)
    const markets = event.querySelectorAll('table.psel-market');
    
    markets.forEach(market => {
      // Vérifier si c'est un marché 1N2 (row-col) ou un marché avec lignes
      const isRowColLayout = market.classList.contains('psel-market--row-col');
      
      if (isRowColLayout) {
        // Layout horizontal: 1 N 2
        this.extractRowColMarket(market, cotes, opponents);
      } else {
        // Layout vertical: lignes avec headers
        this.extractDefaultMarket(market, cotes);
      }
    });
    
    return cotes;
  }
  
  extractRowColMarket(market, cotes, opponents) {
    // Format: <tr><td>bouton1</td><td>bouton2</td><td>bouton3</td></tr>
    const rows = market.querySelectorAll('tbody tr');

    rows.forEach(row => {
      const buttons = row.querySelectorAll('psel-outcome button');

      buttons.forEach((button, idx) => {
        const oddEl = button.querySelector('.psel-outcome__data');

        if (oddEl) {
          const oddValue = parseFloat(oddEl.textContent.trim().replace(',', '.'));

          if (!isNaN(oddValue)) {
            // Mapper les positions 0/1/2 vers Joueur1 / Nul / Joueur2
            let joueurLabel = null;
            if (idx === 0) joueurLabel = opponents[0] || '1';
            else if (idx === 1) joueurLabel = 'Nul';
            else if (idx === 2) joueurLabel = opponents[1] || '2';

            cotes.push({
              joueur: joueurLabel,
              cote: oddValue,
              pourcentage: null
            });
          }
        }
      });
    });
  }
  
  extractDefaultMarket(market, cotes) {
    // Format avec headers dans <th scope="row">
    const rows = market.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
      const headerEl = row.querySelector('th[scope="row"]');
      const buttonEl = row.querySelector('psel-outcome button');
      
      if (headerEl && buttonEl) {
        const joueur = headerEl.textContent.trim();
        const oddEl = buttonEl.querySelector('.psel-outcome__data');
        
        if (oddEl) {
          const oddValue = parseFloat(oddEl.textContent.trim().replace(',', '.'));
          
          if (!isNaN(oddValue)) {
            cotes.push({
              joueur: joueur,
              cote: oddValue,
              pourcentage: null
            });
          }
        }
      }
    });
  }
}

