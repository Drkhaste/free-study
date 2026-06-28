<?php
/**
 * Plugin Name: Medical Education Platform
 * Description: A complete medical education platform with SM-2 flashcards, AI content generation, and Telegram integration.
 * Version: 1.0.0
 * Author: Jules
 * Text Domain: medical-edu
 */

if (!defined('ABSPATH')) exit;

define('MED_EDU_PATH', plugin_dir_path(__FILE__));
define('MED_EDU_URL', plugin_dir_url(__FILE__));

// Initialize the plugin
class MedicalEdu {
    private static $instance = null;

    public static function get_instance() {
        if (self::$instance == null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        // Register hooks
        register_activation_hook(__FILE__, [get_class($this), 'activate']);
        add_action('init', [$this, 'init']);
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_shortcode('medical_edu_login', [$this, 'login_shortcode']);
        add_shortcode('medical_edu_dashboard', [$this, 'dashboard_shortcode']);

        // Include required files
        $this->includes();
    }

    public function init() {
        // CPTs are registered in includes/cpt.php
    }

    public static function activate() {
        require_once MED_EDU_PATH . 'includes/database.php';
        MedEduDB::create_tables();
    }

    private function includes() {
        require_once MED_EDU_PATH . 'includes/database.php';
        require_once MED_EDU_PATH . 'includes/api.php';
        require_once MED_EDU_PATH . 'includes/cpt.php';
        require_once MED_EDU_PATH . 'includes/telegram.php';
        require_once MED_EDU_PATH . 'includes/ai.php';
        require_once MED_EDU_PATH . 'includes/sm2.php';
    }


    public function add_admin_menu() {
        add_menu_page(
            'Medical Edu',
            'Medical Edu',
            'manage_options',
            'medical-edu-dashboard',
            [$this, 'admin_dashboard_page'],
            'dashicons-welcome-learn-more',
            25
        );
    }

    public function admin_dashboard_page() {
        ?>
        <style>
            #adminmenumain, #wpadminbar, #wpfooter { display: none !important; }
            #wpcontent, #wpbody-content { margin: 0 !important; padding: 0 !important; width: 100% !important; }
            html.wp-toolbar { padding-top: 0 !important; }
            .medical-edu-app-root { min-height: 100vh; width: 100%; }
        </style>
        <div id="app" class="medical-edu-app-root"></div>
        <?php
        $this->enqueue_assets();
    }

    public function login_shortcode() {
        ob_start();
        include MED_EDU_PATH . 'templates/login-form.php';
        return ob_get_clean();
    }

    public function dashboard_shortcode() {
        if (!is_user_logged_in() || !current_user_can('manage_options')) {
            return '<p>لطفاً ابتدا وارد شوید.</p>';
        }
        $this->enqueue_assets();
        return '<div id="app" class="medical-edu-app-root"></div>'; // UI expects id="app"
    }

    private function enqueue_assets() {
        // Fonts
        wp_enqueue_style('vazirmatn-font', 'https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css', [], '33.003');
        wp_enqueue_style('ibm-plex-arabic-font', 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;700&display=swap', [], '1.0.0');

        // External Libraries
        wp_enqueue_style('easymde-css', 'https://unpkg.com/easymde/dist/easymde.min.css', [], '2.18.0');
        wp_enqueue_script('easymde-js', 'https://unpkg.com/easymde/dist/easymde.min.js', [], '2.18.0', true);
        wp_enqueue_script('moment-js', 'https://cdn.jsdelivr.net/npm/moment@2.29.4/moment.min.js', [], '2.29.4', true);
        wp_enqueue_script('jalali-moment', 'https://cdn.jsdelivr.net/npm/jalali-moment@3.3.11/dist/jalali-moment.browser.js', ['moment-js'], '3.3.11', true);

        // Tailwind (if needed for isolated use)
        wp_enqueue_script('tailwind-cdn', 'https://cdn.tailwindcss.com', [], '3.3.0');

        // Plugin Assets
        wp_enqueue_style('medical-edu-css', MED_EDU_URL . 'assets/app.css', [], '1.0.1');
        wp_enqueue_script('medical-edu-js', MED_EDU_URL . 'assets/app.js', ['jquery', 'easymde-js', 'moment-js'], '1.0.1', true);

        // Pass data to JS
        wp_localize_script('medical-edu-js', 'medEduData', [
            'apiUrl' => esc_url_raw(rest_url('medical-edu/v1')),
            'nonce' => wp_create_nonce('wp_rest'),
            'siteUrl' => get_site_url(),
            'isAdmin' => is_admin(),
            'pluginUrl' => MED_EDU_URL,
        ]);
    }
}

MedicalEdu::get_instance();
