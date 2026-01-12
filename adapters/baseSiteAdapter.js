// ========== baseSiteAdapter.js ==========
// Classe de base abstraite pour tous les adaptateurs de sites

class BaseSiteAdapter {
  constructor(siteName, definition) {
    this.siteName = siteName;
    this.siteFriendlyName = definition.name;
    this.definition = definition;
  }

  /**
   * Convertit les formats de date/heure français en ISO 8601
   * Supporte: "Demain 23h30", "Aujourd'hui 23h30", "12/01 23h30", "En direct"
   */
  convertDateTimeToISO(dateTimeText) {
    if (!dateTimeText) return null;
    
    const text = dateTimeText.trim();
    const now = new Date();
    
    // Extraire l'heure (format HH:MM ou H:MM ou Hh)
    const timeMatch = text.match(/(\d{1,2})[h:](\d{2})/);
    if (!timeMatch) return null;
    
    const hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    
    let targetDate = new Date(now);
    
    // Déterminer la date cible
    if (text.includes('Aujourd\'hui') || text.includes('Auj.')) {
      targetDate.setHours(hours, minutes, 0, 0);
    } else if (text.includes('Demain')) {
      targetDate.setDate(targetDate.getDate() + 1);
      targetDate.setHours(hours, minutes, 0, 0);
    } else if (text.includes('En direct') || text.includes('Direct')) {
      return new Date().toISOString().slice(0, 19);
    } else {
      // Essayer de parser une date au format "JJ/MM HHh"
      const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\s*(\d{1,2})[h:](\d{2})/);
      if (dateMatch) {
        const day = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]) - 1; // Les mois sont 0-indexed
        const h = parseInt(dateMatch[3]);
        const m = parseInt(dateMatch[4]);
        
        targetDate.setMonth(month);
        targetDate.setDate(day);
        targetDate.setHours(h, m, 0, 0);
      } else {
        targetDate.setHours(hours, minutes, 0, 0);
      }
    }
    
    return targetDate.toISOString().slice(0, 19);
  }

  /**
   * Méthode abstraite à implémenter par chaque adaptateur
   */
  extractOdds() {
    throw new Error('extractOdds() doit être implémentée par la sous-classe');
  }
}
