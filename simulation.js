const API_URL = "http://localhost:8080/api";

const timestamp = Date.now();
const clientEmail = `client_${timestamp}@audit.local`;
const managerEmail = `manager_${timestamp}@audit.local`;
const auditorEmail = `auditor_${timestamp}@audit.local`;
const password = "Password123!";

async function runSimulation() {
  try {
    console.log("=== Démarrage de la simulation ===");
    
    // 1. Login as Admin
    console.log("\n[1] Connexion en tant qu'administrateur...");
    let res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: "admin@audit.local", password: "Admin123!" })
    });
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error("Erreur de connexion admin: " + res.status + " " + errorText);
    }
    let adminTokens = await res.json();
    const adminToken = adminTokens.accessToken;
    console.log("    => Admin connecté avec succès.");

    // 2. Create Users
    console.log("\n[2] Création des utilisateurs de test...");
    const createReqs = [
      { email: clientEmail, fullName: "Client Test", role: "CLIENT", temporaryPassword: password },
      { email: managerEmail, fullName: "Manager Test", role: "MANAGER", temporaryPassword: password },
      { email: auditorEmail, fullName: "Auditor Test", role: "AUDITOR", temporaryPassword: password }
    ];
    
    const userIds = {};

    for (let req of createReqs) {
      res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(req)
      });
      if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Erreur lors de la création de ${req.email}: ${res.status} ${errText}`);
      }
      const data = await res.json();
      userIds[req.role] = data.id;
      console.log(`    => Utilisateur créé: ${req.email} (ID: ${data.id})`);
    }

    // 3. Login as Client
    console.log("\n[3] Connexion en tant que Client...");
    res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: clientEmail, password: password })
    });
    if (!res.ok) throw new Error("Erreur de connexion client");
    const clientTokens = await res.json();
    const clientToken = clientTokens.accessToken;
    console.log("    => Client connecté avec succès.");

    // 4. Create Audit Request as Client
    console.log("\n[4] Le Client soumet une demande d'audit...");
    res = await fetch(`${API_URL}/audits`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        title: "Audit de Sécurité Système",
        description: "Demande de vérification de l'infrastructure."
      })
    });
    if (!res.ok) {
        const errDesc = await res.text();
        throw new Error("Erreur lors de la création de l'audit: " + res.status + " " + errDesc);
    }
    const auditData = await res.json();
    const auditId = auditData.id;
    if (!auditId) {
        throw new Error("Erreur: ID d'audit non reçu du serveur.");
    }
    // Validation basique pour éviter S8476 (Server-Side Request Forgery / Path Traversal)
    if (String(auditId).includes('..') || String(auditId).includes('/') || String(auditId).includes('\\')) {
        throw new Error("Erreur: ID d'audit invalide détecté.");
    }

    console.log(`    => Demande d'audit créée: "${auditData.title}" avec l'ID: ${auditId}`);
    console.log(`    => Statut de l'audit: ${auditData.status}`);

    // 5. Login as Manager
    console.log("\n[5] Connexion en tant que Manager...");
    res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: managerEmail, password: password })
    });
    if (!res.ok) throw new Error("Erreur de connexion manager");
    const managerTokens = await res.json();
    const managerToken = managerTokens.accessToken;
    console.log("    => Manager connecté avec succès.");

    // 6. Assign Auditor as Manager
    console.log("\n[6] Le Manager affecte un auditeur à cette demande...");
    res = await fetch(`${API_URL}/audits/${auditId}/assign`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${managerToken}`
      },
      body: JSON.stringify({
        auditorId: userIds["AUDITOR"],
        managerId: userIds["MANAGER"]
      })
    });
    if (!res.ok) {
        const errDesc = await res.text();
        throw new Error("Erreur lors de l'affectation: " + errDesc);
    }
    const assignedAudit = await res.json();
    console.log(`    => Affectation réussie!`);
    console.log(`    => L'Auditeur (ID: ${assignedAudit.auditorId}) a été assigné à l'audit "${assignedAudit.title}".`);
    console.log(`    => Nouveau statut de l'audit: ${assignedAudit.status}`);

    console.log("\n=== Simulation Terminée avec Succès ===");
  } catch (error) {
    console.error("Simulation failed:", error.message);
  }
}

runSimulation();
