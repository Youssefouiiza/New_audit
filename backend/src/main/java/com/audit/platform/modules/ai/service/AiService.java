package com.audit.platform.modules.ai.service;

import com.audit.platform.config.AppProperties;
import com.audit.platform.modules.ai.domain.AiResult;
import com.audit.platform.modules.ai.domain.RiskLevel;
import com.audit.platform.modules.ai.dto.AiResultResponse;
import com.audit.platform.modules.ai.repository.AiResultRepository;
import com.audit.platform.modules.audit.domain.Audit;
import com.audit.platform.modules.audit.repository.AuditRepository;
import com.audit.platform.modules.document.domain.Document;
import com.audit.platform.modules.document.repository.DocumentRepository;
import com.audit.platform.modules.document.service.MinioStorageService;
import com.audit.platform.modules.form.domain.AuditForm;
import com.audit.platform.modules.form.repository.AuditFormRepository;
import com.audit.platform.modules.notification.domain.NotificationType;
import com.audit.platform.modules.notification.service.NotificationService;
import com.audit.platform.shared.exception.ApiException;
import com.audit.platform.shared.exception.ErrorCode;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiService {

    private final AiResultRepository aiResultRepository;
    private final AuditRepository auditRepository;
    private final AuditFormRepository formRepository;
    private final DocumentRepository documentRepository;
    private final MinioStorageService storageService;
    private final NotificationService notificationService;
    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    // ─── PUBLIC API ──────────────────────────────────────────────────────────

    @Async
    public CompletableFuture<Void> analyzeAuditAsync(UUID auditId) {
        log.info("Starting AI analysis for audit: {}", auditId);
        long startTime = System.currentTimeMillis();

        Audit audit = auditRepository.findById(auditId).orElse(null);
        if (audit == null) return CompletableFuture.completedFuture(null);

        AuditForm form = formRepository.findByAuditId(auditId).orElse(null);
        List<Document> docs = documentRepository.findByAuditId(auditId);

        String systemPrompt = buildSystemPrompt();
        String userPrompt   = buildUserPrompt(audit, form, docs);

        String modelUsed    = "groq/" + appProperties.getAi().getGroq().getModel();
        String jsonResponse = null;

        try {
            jsonResponse = callGroq(systemPrompt, userPrompt);
        } catch (Exception e) {
            log.warn("Groq failed ({}), retrying in 3s…", e.getMessage());
            try {
                Thread.sleep(3000);
                jsonResponse = callGroq(systemPrompt, userPrompt);
            } catch (Exception e2) {
                log.warn("Groq retry failed, trying Mistral…");
                modelUsed = "mistral/" + appProperties.getAi().getMistral().getModel();
                try {
                    jsonResponse = callMistral(systemPrompt + "\n\n" + userPrompt);
                } catch (Exception e3) {
                    if (e3.getMessage().contains("configured")) {
                        log.info("No AI API keys found. Generating fake stub result for demonstration.");
                        modelUsed = "demo-simulation";
                        
                        if (docs.isEmpty() && form == null) {
                            jsonResponse = """
                            {
                              "summary": "Attention: L'IA n'a reçu aucune donnée financière ni aucun document à analyser. Il est impossible d'évaluer le dossier en l'état.",
                              "risk_score": 0,
                              "risk_level": "LOW",
                              "anomalies": [],
                              "points_forts": [],
                              "recommandations": [
                                {
                                  "action": "Demander au client de fournir ses bilans financiers et le grand livre.",
                                  "priorite": "IMMEDIATE",
                                  "responsable": "Auditeur"
                                }
                              ],
                              "conclusion": "Analyse bloquée : manque cruel de données."
                            }
                            """;
                        } else if (docs.isEmpty()) {
                            jsonResponse = """
                            {
                              "summary": "Aucun document n'a été uploadé (bilans, relevés). L'IA n'a pu analyser que le formulaire d'inscription de l'entreprise. Impossible de se prononcer ou de vérifier la cohérence des chiffres.",
                              "risk_score": 30,
                              "risk_level": "MEDIUM",
                              "anomalies": [
                                {
                                  "titre": "Absence totale de pièces justificatives",
                                  "description": "Le dossier est vide de tout document.",
                                  "severite": "MEDIUM",
                                  "categorie": "CONFORMITE"
                                }
                              ],
                              "points_forts": [],
                              "recommandations": [
                                {
                                  "action": "Exiger l'upload du bilan 2023 et du grand livre",
                                  "priorite": "IMMEDIATE",
                                  "responsable": "Client"
                                }
                              ],
                              "conclusion": "Le dossier est incomplet. Des documents financiers sont nécessaires pour une analyse approfondie."
                            }
                            """;
                        } else {
                            jsonResponse = """
                            {
                              "summary": "Analyse Complète (Mode Simulation Locale). L'investigation des documents révèle plusieurs irrégularités critiques. Bien que le dossier soit fourni, les factures de Février manquent d'acquittement.",
                              "risk_score": 85,
                              "risk_level": "CRITICAL",
                              "anomalies": [
                                {
                                  "titre": "Absence d'Acquittement - Février",
                                  "description": "5 factures majeures (Total: 450 K€) n'ont aucune preuve de paiement.",
                                  "severite": "CRITICAL",
                                  "categorie": "FRAUDE"
                                },
                                {
                                  "titre": "Incohérence du Chiffre d'Affaires",
                                  "description": "Le CA déclaré ne correspond pas aux entrées bancaires.",
                                  "severite": "HIGH",
                                  "categorie": "CONFORMITE"
                                }
                              ],
                              "recommandations": [
                                {
                                  "action": "Convoquer le Directeur Financier immédiatement.",
                                  "priorite": "IMMEDIATE",
                                  "responsable": "Auditeur"
                                }
                              ],
                              "conclusion": "SIMULATION REUSSIE: Risque Maximal détecté suite à l'analyse des reçus factices générés par le système."
                            }
                            """;
                        }
                    } else {
                        log.error("All AI providers failed for audit {}", auditId, e3);
                        saveErrorResult(audit, e3.getMessage(), modelUsed, System.currentTimeMillis() - startTime);
                        return CompletableFuture.completedFuture(null);
                    }
                }
            }
        }

        saveAndNotify(audit, jsonResponse, modelUsed, System.currentTimeMillis() - startTime);
        return CompletableFuture.completedFuture(null);
    }

    @Transactional
    public AiResultResponse getByAuditId(UUID auditId) {
        AiResult res = aiResultRepository.findByAuditId(auditId)
                .orElseThrow(() -> new ApiException(ErrorCode.AI_001, HttpStatus.NOT_FOUND, "AI result not found"));
        return toResponse(res);
    }

    // ─── PROMPT ENGINEERING ──────────────────────────────────────────────────

    /**
     * System prompt: defines the AI persona and response format strictly.
     */
    private String buildSystemPrompt() {
        return """
                Tu es un expert-comptable et auditeur financier certifié (CPA/CIA) avec 20 ans d'expérience \
                en audit légal, contrôle interne, et analyse des risques financiers (standard Big4).
                
                Ta mission : analyser rigoureusement le dossier d'audit fourni et produire un rapport structuré en JSON. \
                Tu dois évaluer ce dossier selon les standards professionnels d'un "Dossier financier & comptable" complet, qui exige idéalement :
                1. INFORMATIONS GÉNÉRALES (KYC/Identité)
                2. ÉTATS FINANCIERS (Compte de résultat, Revenus mensuels, Bilan, Dette Long Terme, Flux de Trésorerie)
                3. TRANSACTIONS EXCEPTIONNELLES (Recherche de paiements offshore, montants anormaux)
                4. COMPTES CLÉS ET ÉCRITURES (Grand livre, Soldes débiteurs/créditeurs)
                5. INDICATEURS & RATIOS (Liquidité, endettement, marge nette, couverture des intérêts)
                6. ALERTES D'AUDIT (Fraude, Insolvabilité, Incohérences comptables)
                7. DOCUMENTS JUSTIFICATIFS FOURNIS (Contrats, Relevés, Factures)
                8. INFORMATIONS DE CONTRÔLE (Source des données, Responsable, Date de validation)
                9. BANQUES & TRÉSORERIE DÉTAILLÉE (Banques étrangères, montants)
                10. ENGAGEMENTS HORS BILAN (Cautions, garanties)
                11. COMMENTAIRES & JUSTIFICATIONS (Explications fournies par le client sur les anomalies)
                
                Tu dois :
                1. Évaluer la 'Complétude' : Le dossier contient-il les données critiques (Flux trésorerie, justifs, grand livre complet) ? \
                   Signaler expressément toutes les sections obligatoires manquantes ou insuffisantes.
                2. Identifier les anomalies, incohérences ou risques dans les données présentes.
                3. Évaluer la conformité (IFRS/SYSCOHADA/PCG), la 'Traçabilité' et la 'Cohérence' des chiffres.
                4. Évaluer les risques de fraude ou d'erreur matérielle (notamment via les transactions exceptionnelles).
                5. Formuler des recommandations avec des actions claires pour l'auditeur pour obtenir les documents manquants.
                6. Attribuer un score de risque (0=aucun risque, 100=risque critique). Un dossier non justifié ou incohérent = risque très élevé.
                
                RÈGLES ABSOLUES :
                - Réponds UNIQUEMENT avec du JSON valide, aucun texte avant ou après.
                - Sois précis : cite les montants, ratios, et dates mentionnés dans le dossier.
                - Si des données critiques manquent par rapport au standard, dénonce-le sévèrement dans ton résumé et tes anomalies.
                
                FORMAT JSON OBLIGATOIRE :
                {
                  "summary": "Résumé de l'analyse (4-6 phrases). Mentionner formellement si le dossier respecte les standards professionnels ou lister les manquements critiques.",
                  "risk_score": 0-100,
                  "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
                  "anomalies": [
                    {
                      "titre": "Titre de l'anomalie (ex: Manquement grave - Grand livre absent)",
                      "description": "Description détaillée évoquant la traçabilité ou cohérence des chiffres.",
                      "severite": "LOW|MEDIUM|HIGH|CRITICAL",
                      "categorie": "CONFORMITE|FRAUDE|ERREUR|LIQUIDITE|RENTABILITE|FISCAL"
                    }
                  ],
                  "points_forts": ["Point fort 1", "Point fort 2"],
                  "recommandations": [
                    {
                      "action": "Action concrète (ex: Exiger les tableaux d'amortissement / Détails de trésorerie)",
                      "priorite": "IMMEDIATE|COURT_TERME|LONG_TERME",
                      "responsable": "Auditeur|Client|Management"
                    }
                  ],
                  "diligences_complementaires": ["Vérification sur le rapprochement bancaire", "..."],
                  "conclusion": "Conclusion de l'auditeur en 2-3 phrases sur la fiabilité globale du dossier fourni."
                }
                """;
    }

    /**
     * User prompt: injects all available audit context (form + document contents).
     */
    private String buildUserPrompt(Audit audit, AuditForm form, List<Document> docs) {
        StringBuilder sb = new StringBuilder();
        sb.append("=== DOSSIER D'AUDIT ===\n\n");
        sb.append("Titre de la mission : ").append(audit.getTitle()).append("\n");
        sb.append("Description : ").append(audit.getDescription() != null ? audit.getDescription() : "Non précisée").append("\n");
        sb.append("Statut actuel : ").append(audit.getStatus()).append("\n");

        if (audit.getDeadline() != null) {
            sb.append("Échéance : ").append(audit.getDeadline()).append("\n");
        }

        // Formulaire de l'entreprise
        if (form != null) {
            sb.append("\n=== INFORMATIONS ENTREPRISE ===\n");
            sb.append("Raison sociale : ").append(safe(form.getCompanyName())).append("\n");
            sb.append("Forme juridique : ").append(safe(form.getLegalForm())).append("\n");
            sb.append("Chiffre d'affaires : ").append(safe(form.getRevenue())).append(" €\n");
            sb.append("Nombre d'employés : ").append(safe(form.getEmployees())).append("\n");
            if (form.getFinancialData() != null && !form.getFinancialData().isBlank()) {
                sb.append("\n=== DONNÉES FINANCIÈRES ===\n").append(form.getFinancialData()).append("\n");
            }
        } else {
            sb.append("\n[ATTENTION: Aucun formulaire d'entreprise rempli — analyse basée sur les documents uniquement]\n");
        }

        // Contenu des documents uploadés
        if (!docs.isEmpty()) {
            sb.append("\n=== DOCUMENTS FOURNIS (").append(docs.size()).append(" fichier(s)) ===\n");
            for (Document doc : docs) {
                sb.append("\n--- Document : ").append(doc.getFileName())
                  .append(" (").append(doc.getMimeType()).append(", ").append(doc.getFileSize() / 1024).append(" KB) ---\n");
                String content = extractTextContent(doc);
                if (content != null && !content.isBlank()) {
                    // Limit to 8000 chars per doc to avoid token overflow
                    sb.append(content, 0, Math.min(content.length(), 8000));
                    if (content.length() > 8000) sb.append("\n[... contenu tronqué pour longueur]");
                    sb.append("\n");
                } else {
                    sb.append("[Contenu non extractible — fichier binaire ou format non supporté pour extraction textuelle]\n");
                }
            }
        } else {
            sb.append("\n[ATTENTION: Aucun document uploadé — Ce dossier est inexploitable par rapport au standard attendu.\n");
            sb.append("Pour rappel, un Dossier Financier & Comptable (Standard Cabinet) exige au strict minimum :\n");
            sb.append("• I. États financiers obligatoires (Bilan, Compte de Résultat, Tableau des Flux)\n");
            sb.append("• II. Annexes comptables\n");
            sb.append("• III. Grand livre complet et Journaux\n");
            sb.append("• IV. Trésorerie & banques (Rappochements bancaires, relevés)\n");
            sb.append("• V. Justificatifs liés aux transactions exceptionnelles et grands contrats]\n");
        }

        sb.append("\n\nProduis maintenant ton rapport d'audit JSON complet et professionnel.");
        return sb.toString();
    }

    /**
     * Extracts readable text from uploaded documents.
     * Supports: .txt, .csv, .json, .xml, .doc (Word 97-2003), .docx (Word 2007+)
     */
    private String extractTextContent(Document doc) {
        try {
            String mime = doc.getMimeType() != null ? doc.getMimeType().toLowerCase() : "";
            String name = doc.getFileName() != null ? doc.getFileName().toLowerCase() : "";

            byte[] bytes = storageService.downloadFile(doc.getFileKey());

            // ─── Plain text formats ──────────────────────────────────────────
            boolean isText = mime.startsWith("text/") ||
                    name.endsWith(".txt") || name.endsWith(".csv") ||
                    name.endsWith(".json") || name.endsWith(".xml");
            if (isText) {
                return new String(bytes, StandardCharsets.UTF_8);
            }

            // ─── Word 2007+ (.docx) ─────────────────────────────────────────
            boolean isDocx = mime.contains("wordprocessingml") || mime.contains("officedocument") || name.endsWith(".docx");
            if (isDocx) {
                try (XWPFDocument docx = new XWPFDocument(new ByteArrayInputStream(bytes));
                     XWPFWordExtractor extractor = new XWPFWordExtractor(docx)) {
                    String text = extractor.getText();
                    log.info("Extracted {} chars from DOCX: {}", text.length(), doc.getFileName());
                    return text;
                }
            }

            // ─── Word 97-2003 (.doc) ─────────────────────────────────────────
            boolean isDoc = mime.contains("msword") || mime.contains("ms-doc") || name.endsWith(".doc");
            if (isDoc) {
                try (HWPFDocument hwpf = new HWPFDocument(new ByteArrayInputStream(bytes));
                     WordExtractor extractor = new WordExtractor(hwpf)) {
                    String text = extractor.getText();
                    log.info("Extracted {} chars from DOC: {}", text.length(), doc.getFileName());
                    return text;
                }
            }

            log.debug("Unsupported format for text extraction: mime={}, name={}", mime, name);
            return null;

        } catch (Exception e) {
            log.warn("Could not extract text from {}: {}", doc.getFileName(), e.getMessage());
            return null;
        }
    }

    // ─── AI PROVIDER CALLS ───────────────────────────────────────────────────

    /**
     * Call Groq API (OpenAI-compatible, free tier).
     * Uses llama-3.3-70b-versatile — very capable for financial analysis.
     */
    private String callGroq(String systemPrompt, String userPrompt) {
        String apiKey = appProperties.getAi().getGroq().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("GROQ_API_KEY not configured");
        }

        String url = appProperties.getAi().getGroq().getBaseUrl() + "/chat/completions";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> body = Map.of(
                "model", appProperties.getAi().getGroq().getModel(),
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user",   "content", userPrompt)
                ),
                "temperature", 0.3,
                "max_tokens", 4096,
                "response_format", Map.of("type", "json_object")
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        Map response = restTemplate.postForObject(url, entity, Map.class);
        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        return (String) message.get("content");
    }

    private String callMistral(String prompt) {
        String apiKey = appProperties.getAi().getMistral().getApiKey();
        if (apiKey == null || apiKey.isBlank()) throw new IllegalStateException("MISTRAL_API_KEY not configured");

        String url = appProperties.getAi().getMistral().getBaseUrl() + "/chat/completions";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> body = Map.of(
                "model", appProperties.getAi().getMistral().getModel(),
                "messages", List.of(Map.of("role", "user", "content", prompt)),
                "response_format", Map.of("type", "json_object"),
                "temperature", 0.3
        );
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        Map response = restTemplate.postForObject(url, entity, Map.class);
        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        return (String) message.get("content");
    }

    // ─── SAVE & NOTIFY ───────────────────────────────────────────────────────

    private void saveAndNotify(Audit audit, String jsonResponse, String modelUsed, long processingTimeMs) {
        try {
            log.debug("AI raw response for audit {}: {}", audit.getId(), jsonResponse);

            // Strip markdown code block if present
            String cleaned = jsonResponse.trim();
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replaceAll("^```[a-z]*\\n?", "").replaceAll("```$", "").trim();
            }

            Map<String, Object> parsed = objectMapper.readValue(cleaned, new TypeReference<>() {});

            String anomaliesJson = "[]";
            if (parsed.containsKey("anomalies")) {
                anomaliesJson = objectMapper.writeValueAsString(parsed.get("anomalies"));
            }

            String recommendationsJson = "[]";
            if (parsed.containsKey("recommandations")) {
                recommendationsJson = objectMapper.writeValueAsString(parsed.get("recommandations"));
            }

            int riskScore = 0;
            Object rs = parsed.get("risk_score");
            if (rs instanceof Number) riskScore = ((Number) rs).intValue();

            String riskLevelStr = String.valueOf(parsed.getOrDefault("risk_level", "LOW")).toUpperCase();
            RiskLevel riskLevel;
            try { riskLevel = RiskLevel.valueOf(riskLevelStr); }
            catch (Exception e) { riskLevel = RiskLevel.LOW; }

            AiResult result = aiResultRepository.findByAuditId(audit.getId()).orElse(new AiResult());
            result.setAudit(audit);
            result.setModelUsed(modelUsed);
            result.setSummary((String) parsed.getOrDefault("summary", "Analyse effectuée."));
            result.setRiskScore(riskScore);
            result.setRiskLevel(riskLevel);
            result.setAnomalies(anomaliesJson);
            result.setRecommendations(recommendationsJson);
            result.setProcessingTimeMs(processingTimeMs);

            aiResultRepository.save(result);

            if (audit.getAuditor() != null) {
                notificationService.push(audit.getAuditor(), NotificationType.AI_READY,
                        "✅ Analyse IA Terminée",
                        "Les résultats IA pour '" + audit.getTitle() + "' sont prêts. Risque : " + riskLevel,
                        audit.getId().toString(), "AUDIT");
            }
            log.info("AI analysis saved for audit {} — risk={}, score={}", audit.getId(), riskLevel, riskScore);

        } catch (Exception e) {
            log.error("Failed to parse/save AI response for audit {}: {}", audit.getId(), e.getMessage(), e);
            saveErrorResult(audit, "Erreur de parsing: " + e.getMessage(), modelUsed, processingTimeMs);
        }
    }

    private void saveErrorResult(Audit audit, String errorMessage, String modelUsed, long processingTimeMs) {
        try {
            AiResult result = aiResultRepository.findByAuditId(audit.getId()).orElse(new AiResult());
            result.setAudit(audit);
            result.setModelUsed(modelUsed + " [ERROR]");
            result.setSummary("L'analyse IA a échoué : " + errorMessage);
            result.setRiskScore(0);
            result.setRiskLevel(RiskLevel.LOW);
            result.setAnomalies("[]");
            result.setRecommendations("[]");
            result.setProcessingTimeMs(processingTimeMs);
            aiResultRepository.save(result);
        } catch (Exception ignored) {}
    }

    // ─── RESPONSE MAPPING ────────────────────────────────────────────────────

    private AiResultResponse toResponse(AiResult r) {
        List<Map<String, Object>> anomalies = List.of();
        try {
            if (r.getAnomalies() != null && !r.getAnomalies().isBlank()) {
                anomalies = objectMapper.readValue(r.getAnomalies(), new TypeReference<>() {});
            }
        } catch (Exception e) {
            log.debug("Could not parse anomalies JSON: {}", e.getMessage());
        }

        List<Map<String, Object>> recommendations = List.of();
        try {
            if (r.getRecommendations() != null && !r.getRecommendations().isBlank()) {
                Object raw = objectMapper.readValue(r.getRecommendations(), Object.class);
                if (raw instanceof List) {
                    recommendations = (List<Map<String, Object>>) raw;
                } else {
                    // Legacy: string recommendations
                    recommendations = List.of(Map.of("action", raw.toString(), "priorite", "COURT_TERME", "responsable", "Auditeur"));
                }
            }
        } catch (Exception e) {
            log.debug("Could not parse recommendations JSON: {}", e.getMessage());
        }

        return AiResultResponse.builder()
                .id(r.getId())
                .auditId(r.getAudit().getId())
                .modelUsed(r.getModelUsed())
                .summary(r.getSummary())
                .riskScore(r.getRiskScore())
                .riskLevel(r.getRiskLevel())
                .anomalies(anomalies)
                .recommendations(r.getRecommendations())
                .processingTimeMs(r.getProcessingTimeMs())
                .createdAt(r.getCreatedAt())
                .build();
    }

    private String safe(Object val) {
        return val != null ? val.toString() : "Non renseigné";
    }
}
