<?php
/**
 * Plugin Name: Medical Education Platform
 * Description: A full-featured medical education platform with flashcards (SM-2), AI content generation, and Telegram integration.
 * Version: 1.0.0
 * Author: Jules
 * Text Domain: medical-edu
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Define constants
define( 'MED_EDU_VERSION', '1.0.0' );
define( 'MED_EDU_PATH', plugin_dir_path( __FILE__ ) );
define( 'MED_EDU_URL', plugin_dir_url( __FILE__ ) );

// Include files
require_once MED_EDU_PATH . 'includes/db.php';
require_once MED_EDU_PATH . 'includes/cpt.php';
require_once MED_EDU_PATH . 'includes/api.php';
require_once MED_EDU_PATH . 'includes/admin.php';
require_once MED_EDU_PATH . 'includes/frontend.php';
require_once MED_EDU_PATH . 'includes/cron.php';

// Activation hook
register_activation_hook( __FILE__, 'med_edu_activate' );

function med_edu_activate() {
	med_edu_create_tables();
	med_edu_register_cpt();
	med_edu_create_dashboard_page();
	flush_rewrite_rules();
}
