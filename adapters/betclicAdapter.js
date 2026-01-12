// ========== betclicAdapter.js ==========
// Adaptateur spécifique pour Betclic

class BetclicAdapter extends BaseSiteAdapter {
  extractOdds() {
    console.log('[BC Adapter] Extraction Betclic');
    const matches = [];
    const events = document.querySelectorAll(this.definition.selectors.events);
    
    console.log(`[BC Adapter] ${events.length} événement(s) trouvé(s)`);
    
    events.forEach((event, index) => {
      try {
        // Extraire les noms des adversaires
        const contestants = event.querySelectorAll('.scoreboard_contestantLabel');
        if (contestants.length < 2) {
          console.log(`[BC Adapter] ⚠️ Event ${index + 1}: moins de 2 adversaires trouvés`);
          return;
        }
        
        const opponentsList = Array.from(contestants).slice(0, 2).map(c => c.textContent.trim());
        
        // Extraire la date/heure
        const dateElement = event.querySelector('.scoreboard_date, .scoreboard_hour');
        const hourElement = event.querySelector('.scoreboard_hour');
        let dateTimeText = '';
        
        if (dateElement) {
          dateTimeText = dateElement.textContent.trim();
          if (hourElement) {
            dateTimeText += ' ' + hourElement.textContent.trim();
          }
        }
        
        // Extraire la compétition
        const breadcrumb = event.querySelector('bcdk-breadcrumb .breadcrumb_itemLabel');
        const competition = breadcrumb ? breadcrumb.textContent.trim() : null;
        
        // Extraire l'URL
        const link = event.querySelector('a[href]');
        const url = link ? link.getAttribute('href') : null;
        
        // Extraire les cotes - Betclic les groupe par 3 (1N2)
        const oddButtons = event.querySelectorAll(this.definition.selectors.odds);
        const cotes = [];
        
        console.log(`[BC Adapter] Event ${index + 1}: ${opponentsList.join(' vs ')} - ${oddButtons.length} boutons`);
        
        // On groupe les boutons par 3 (joueur1, nul, joueur2)
        for (let i = 0; i < oddButtons.length; i += 3) {
          const button1 = oddButtons[i];
          const button2 = oddButtons[i + 1];
          const button3 = oddButtons[i + 2];
          
          if (button1 && button2 && button3) {
            const label1 = button1.querySelector('.btn_label.is-top span')?.textContent.trim() || opponentsList[0];
            const odd1 = button1.querySelector('.btn_label:not(.is-top)')?.textContent.trim();
            
            const label2 = button2.querySelector('.btn_label.is-top span')?.textContent.trim() || 'Nul';
            const odd2 = button2.querySelector('.btn_label:not(.is-top)')?.textContent.trim();
            
            const label3 = button3.querySelector('.btn_label.is-top')?.textContent.trim() || opponentsList[1];
            const odd3 = button3.querySelector('.btn_label:not(.is-top)')?.textContent.trim();
            
            if (odd1) cotes.push({ joueur: label1, cote: parseFloat(odd1.replace(',', '.')), pourcentage: null });
            if (odd2 && label2 !== 'Nul') cotes.push({ joueur: label2, cote: parseFloat(odd2.replace(',', '.')), pourcentage: null });
            if (odd3) cotes.push({ joueur: label3, cote: parseFloat(odd3.replace(',', '.')), pourcentage: null });
          }
        }
        
        const dateTimeISO = this.convertDateTimeToISO(dateTimeText);
        
        if (opponentsList.length > 0 && cotes.length > 0) {
          matches.push({
            competition: competition,
            dateTime: dateTimeISO,
            opponents: opponentsList,
            url: url,
            site: this.siteName,
            siteName: this.siteFriendlyName,
            cotes: cotes
          });
          console.log(`[BC Adapter] ✅ Match ${index + 1}: ${opponentsList.join(' vs ')} (${cotes.length} cotes)`);
        } else {
          console.log(`[BC Adapter] ⚠️ Event ${index + 1}: pas assez de données (opponents: ${opponentsList.length}, cotes: ${cotes.length})`);
        }
      } catch (error) {
        console.error(`[BC Adapter] ❌ Erreur event ${index + 1}:`, error);
      }
    });
    
    return matches;
  }
}
