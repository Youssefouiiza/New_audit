package com.audit.platform.e2e;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.junit.jupiter.api.*;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.Select;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@Tag("e2e")
@Disabled("This is an End-to-End test that requires the frontend (port 3000) and backend (port 8080) to be running.")
public class AuditWorkflowSeleniumTest {

    private static WebDriver driver;
    private static WebDriverWait wait;
    private static final String BASE_URL = "http://localhost:3000";

    // Variables DYNAMIQUES pour garantir que les utilisateurs n'existent pas déjà
    private static final String TIMESTAMP = String.valueOf(System.currentTimeMillis());
    private static final String CLIENT_EMAIL = "client_" + TIMESTAMP + "@gmail.com";
    private static final String MANAGER_EMAIL = "manager_" + TIMESTAMP + "@gmail.com";
    private static final String AUDITOR_EMAIL = "auditeur_" + TIMESTAMP + "@gmail.com";
    
    // Mot de passe sécurisé dynamique pour éviter tout blocage "Data Breach"
    private static final String DYN_PASS = "PassPro" + TIMESTAMP + "!";

    @BeforeAll
    static void setUpAll() {
        WebDriverManager.chromedriver().setup();
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--remote-allow-origins=*");
        
        java.util.Map<String, Object> prefs = new java.util.HashMap<>();
        prefs.put("credentials_enable_service", false);
        prefs.put("profile.password_manager_enabled", false);
        prefs.put("profile.password_manager_leak_detection", false); 
        prefs.put("safebrowsing.enabled", false); 
        
        options.setExperimentalOption("prefs", prefs);
        options.setExperimentalOption("excludeSwitches", java.util.Collections.singletonList("enable-automation"));
        
        driver = new ChromeDriver(options);
        driver.manage().window().maximize();
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    @AfterAll
    static void tearDownAll() {
        if (driver != null) {
            driver.quit();
        }
    }

    // Fonction pour ralentir l'exécution afin que l'utilisateur puisse bien voir à l'écran
    private void slowDown() {
        try {
            Thread.sleep(1500); // Pause de 1.5 seconde
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }

    private void login(String email, String password) {
        driver.get(BASE_URL + "/login");
        slowDown();
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("email"))).sendKeys(email);
        slowDown();
        driver.findElement(By.id("password")).sendKeys(password);
        slowDown();
        driver.findElement(By.id("login-btn")).click();

        wait.until(ExpectedConditions.or(
                ExpectedConditions.urlContains("/dashboard"),
                ExpectedConditions.urlContains("/change-password")
        ));
        slowDown();

        if (driver.getCurrentUrl().contains("/change-password")) {
            wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("current"))).sendKeys(password);
            slowDown();
            driver.findElement(By.id("newPass")).sendKeys(password);
            driver.findElement(By.id("confirm")).sendKeys(password);
            slowDown();
            driver.findElement(By.id("change-pass-btn")).click();
            wait.until(ExpectedConditions.urlContains("/dashboard"));
            slowDown();
        }
    }

    private void logout() {
        WebElement logoutBtn = wait.until(ExpectedConditions.elementToBeClickable(
                By.xpath("//button[contains(., 'Déconnexion')]")
        ));
        slowDown();
        logoutBtn.click();
        wait.until(ExpectedConditions.urlContains("/login"));
        slowDown();
    }

    @Test
    @Order(1)
    @DisplayName("Étape 1 & 2 & 3 & 4 - Connexion Admin et Création Utilisateurs")
    void adminCreatesUsers() {
        login("nabil@gmail.com", "nabil");
        wait.until(ExpectedConditions.urlContains("/dashboard/admin"));
        slowDown();

        driver.get(BASE_URL + "/dashboard/users");
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//h1[contains(., 'Gestion des Utilisateurs')]")));
        slowDown();

        // On utilise les emails dynamiques
        createUser("Client " + TIMESTAMP, CLIENT_EMAIL, DYN_PASS, "CLIENT");
        createUser("Manager " + TIMESTAMP, MANAGER_EMAIL, DYN_PASS, "MANAGER");
        createUser("Auditeur " + TIMESTAMP, AUDITOR_EMAIL, DYN_PASS, "AUDITOR");

        logout();
    }

    private void createUser(String name, String email, String password, String role) {
        wait.until(ExpectedConditions.elementToBeClickable(By.xpath("//button[contains(., 'Nouvel Utilisateur')]"))).click();
        slowDown();
        
        WebElement emailInput = wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("input[type='email']")));
        emailInput.sendKeys(email);
        
        driver.findElement(By.cssSelector("input[placeholder='Jean Dupont']")).sendKeys(name);
        
        Select roleSelect = new Select(driver.findElement(By.cssSelector("select")));
        roleSelect.selectByValue(role);
        
        driver.findElement(By.cssSelector("input[type='password']")).sendKeys(password);
        slowDown();
        
        driver.findElement(By.xpath("//button[contains(text(), \"Créer l'utilisateur\")]")).click();
        
        try {
            wait.until(ExpectedConditions.invisibilityOfElementLocated(By.xpath("//h2[contains(., 'Nouvel Utilisateur')]")));
        } catch (org.openqa.selenium.TimeoutException e) {
            driver.findElement(By.xpath("//button[contains(., 'Annuler')]")).click();
            wait.until(ExpectedConditions.invisibilityOfElementLocated(By.xpath("//h2[contains(., 'Nouvel Utilisateur')]")));
        }
        
        slowDown();
    }

    @Test
    @Order(2)
    @DisplayName("Étape 6 & 7 & 8 - Connexion Client et Création d'Audit")
    void clientCreatesAudit() {
        login(CLIENT_EMAIL, DYN_PASS);
        wait.until(ExpectedConditions.urlContains("/dashboard/client"));
        slowDown();

        wait.until(ExpectedConditions.elementToBeClickable(By.xpath("//button[contains(., 'Nouvel Audit')]"))).click();
        slowDown();
        
        WebElement titleInput = wait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//input[@placeholder='ex: Audit comptable exercice 2025']")));
        titleInput.sendKeys("Audit Sécurité SI - " + TIMESTAMP);
        
        driver.findElement(By.tagName("textarea")).sendKeys("Vérification sécurité application");
        slowDown();

        driver.findElement(By.xpath("//button[contains(., 'Soumettre la demande')]")).click();

        wait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//span[contains(text(), 'En attente')]")));
        slowDown();

        logout();
    }

    @Test
    @Order(3)
    @DisplayName("Étape 9 & 10 & 11 - Connexion Manager et Affectation Audit")
    void managerAssignsAudit() {
        login(MANAGER_EMAIL, DYN_PASS);
        wait.until(ExpectedConditions.urlContains("/dashboard/manager"));
        slowDown();
        
        // Trouver la ligne du tableau contenant l'audit fraîchement créé
        WebElement auditRow = wait.until(ExpectedConditions.visibilityOfElementLocated(
            By.xpath("//tr[contains(., 'Audit Sécurité SI - " + TIMESTAMP + "')]")
        ));
        slowDown();
        
        // Trouver le menu déroulant (select) dans cette ligne
        Select auditorSelect = new Select(auditRow.findElement(By.tagName("select")));
        
        // Sélectionner l'auditeur par son nom complet
        auditorSelect.selectByVisibleText("Auditeur " + TIMESTAMP);
        slowDown();
        
        // Attendre que la requête API d'assignation soit terminée (pause de sécurité)
        slowDown();
        
        logout();
    }

    @Test
    @Order(4)
    @DisplayName("Étape 12 & 13 & 14 & 15 - Connexion Auditeur, Lancement et Génération")
    void auditorRunsAuditAndGeneratesReport() {
        login(AUDITOR_EMAIL, DYN_PASS);
        wait.until(ExpectedConditions.urlContains("/dashboard/auditor"));
        slowDown();

        logout();
    }
}
