// ========== popup.js ==========
// Compatibilité Chrome et Firefox
const API = typeof browser !== 'undefined' ? browser : chrome;

let extractedData = null;
let executionLogs = [];

function addLog(message) {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = `[${timestamp}] ${message}`;
  executionLogs.push(logEntry);
  console.log(logEntry);
}

document.getElementById('extractBtn').addEventListener('click', async () => {
  const resultDiv = document.getElementById('result');
  const extractBtn = document.getElementById('extractBtn');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  
  // Réinitialiser les logs
  executionLogs = [];
  
  extractBtn.disabled = true;
  resultDiv.innerHTML = '<p>Extraction en cours...</p>';
  
  addLog('🚀 Début de l\'extraction');
  addLog(`API détectée: ${typeof browser !== 'undefined' ? 'Firefox (browser)' : 'Chrome (chrome)'}`);
  
  try {
    addLog('📋 Étape 1: Récupération de l\'onglet actif...');
    const tabs = await API.tabs.query({ active: true, currentWindow: true });
    addLog(`✅ Tabs trouvées: ${tabs.length}`);
    
    if (!tabs || tabs.length === 0) {
      throw new Error('Aucun onglet actif trouvé');
    }
    
    const tab = tabs[0];
    addLog(`✅ Onglet ID: ${tab.id}`);
    addLog(`✅ URL: ${tab.url}`);
    addLog(`✅ Statut: ${tab.status}`);
    
    // Vérifier que la page est supportée
    const supportedDomains = ['betclic.fr', 'parionssport.fdj.fr', 'pmu.fr', 'unibet.fr'];
    const isSupported = supportedDomains.some(domain => tab.url.includes(domain));
    addLog(`🔍 Page supportée: ${isSupported}`);
    
    if (!isSupported) {
      throw new Error('Cette page n\'est pas supportée par l\'extension');
    }
    
    addLog('📨 Étape 2: Envoi du message au content script...');
    addLog(`   Tab ID: ${tab.id}`);
    addLog(`   Message: { action: "extract" }`);
    
    let response;
    try {
      response = await API.tabs.sendMessage(tab.id, { action: 'extract' });
      addLog('✅ Réponse reçue avec succès');
    } catch (sendError) {
      addLog(`❌ ERREUR sendMessage: ${sendError.message}`);
      addLog('💡 Possible causes:');
      addLog('   1. Content script non injecté');
      addLog('   2. Permissions incorrectes dans manifest.json');
      addLog('   3. URL ne correspond pas aux patterns');
      addLog('   4. Extension a besoin d\'être rechargée');
      throw sendError;
    }
    
    addLog('📊 Étape 3: Traitement de la réponse...');
    
    if (response.success) {
      extractedData = response.data;
      addLog(`✅ Extraction réussie: ${Object.keys(extractedData).length} match(s)`);
      
      let displayHtml = `<p class="success">✅ ${Object.keys(extractedData).length} match(s) extrait(s)</p>`;
      
      Object.entries(extractedData).forEach(([matchKey, match]) => {
        const siteCount = Object.keys(match.markets['Vainqueur'][match.opponents[0]] || {}).length;
        displayHtml += `
          <div class="match-group">
            <strong>${matchKey}</strong><br>
            <small>Cotes disponibles sur ${siteCount} site(s)</small>
          </div>
        `;
      });
      
      // Ajouter les logs
      displayHtml += '<div style="margin-top: 20px; border-top: 1px solid #bdc3c7; padding-top: 10px;">';
      displayHtml += '<p style="font-weight: bold; color: #2c3e50;">📋 Logs d\'exécution:</p>';
      displayHtml += '<pre style="font-size: 9px; max-height: 150px; overflow-y: auto;">' + executionLogs.join('\n') + '</pre>';
      displayHtml += '</div>';
      
      displayHtml += `<pre>${JSON.stringify(extractedData, null, '\t')}</pre>`;
      resultDiv.innerHTML = displayHtml;
      
      copyBtn.style.display = 'block';
      downloadBtn.style.display = 'block';
    } else {
      addLog(`❌ Erreur: ${response.error}`);
      resultDiv.innerHTML = `<p class="error">❌ ${response.error || 'Erreur lors de l\'extraction'}</p>`;
      resultDiv.innerHTML += '<div style="margin-top: 20px; border-top: 1px solid #bdc3c7; padding-top: 10px;">';
      resultDiv.innerHTML += '<p style="font-weight: bold; color: #2c3e50;">📋 Logs d\'exécution:</p>';
      resultDiv.innerHTML += '<pre style="font-size: 9px; max-height: 150px; overflow-y: auto;">' + executionLogs.join('\n') + '</pre>';
      resultDiv.innerHTML += '</div>';
    }
  } catch (error) {
    addLog(`❌ Erreur lors de la communication: ${error.message}`);
    resultDiv.innerHTML = `<p class="error">❌ Erreur: ${error.message}</p>`;
    resultDiv.innerHTML += '<div style="margin-top: 20px; border-top: 1px solid #bdc3c7; padding-top: 10px;">';
    resultDiv.innerHTML += '<p style="font-weight: bold; color: #2c3e50;">📋 Logs d\'exécution:</p>';
    resultDiv.innerHTML += '<pre style="font-size: 9px; max-height: 150px; overflow-y: auto;">' + executionLogs.join('\n') + '</pre>';
    resultDiv.innerHTML += '<p style="margin-top: 10px; color: #e74c3c;"><strong>⚠️ Conseil:</strong> Assurez-vous que vous êtes sur une page supportée (parionssport.fdj.fr, betclic.fr, pmu.fr, unibet.fr)</p>';
    resultDiv.innerHTML += '</div>';
  } finally {
    extractBtn.disabled = false;
  }
});

document.getElementById('copyBtn').addEventListener('click', () => {
  const json = JSON.stringify(extractedData, null, '\t');
  
  navigator.clipboard.writeText(json).then(() => {
    const copyBtn = document.getElementById('copyBtn');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '✅ Copié !';
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 2000);
  });
});

document.getElementById('downloadBtn').addEventListener('click', () => {
  const json = JSON.stringify(extractedData, null, '\t');
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `betxtractor-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
});