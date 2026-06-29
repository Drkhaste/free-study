<?php

require_once MED_EDU_PATH . 'includes/api/projects.php';
require_once MED_EDU_PATH . 'includes/api/topics.php';
require_once MED_EDU_PATH . 'includes/api/flashcards.php';
require_once MED_EDU_PATH . 'includes/api/review.php';
require_once MED_EDU_PATH . 'includes/api/ai.php';
require_once MED_EDU_PATH . 'includes/api/tasks.php';
require_once MED_EDU_PATH . 'includes/api/settings.php';
require_once MED_EDU_PATH . 'includes/api/telegram.php';
require_once MED_EDU_PATH . 'includes/api/exports.php';

add_action( 'rest_api_init', function () {
	$projects_controller = new MED_EDU_Projects_Controller();
	$projects_controller->register_routes();

	$topics_controller = new MED_EDU_Topics_Controller();
	$topics_controller->register_routes();

	$flashcards_controller = new MED_EDU_Flashcards_Controller();
	$flashcards_controller->register_routes();

	$review_controller = new MED_EDU_Review_Controller();
	$review_controller->register_routes();

	$ai_controller = new MED_EDU_AI_Controller();
	$ai_controller->register_routes();

	$tasks_controller = new MED_EDU_Tasks_Controller();
	$tasks_controller->register_routes();

	$settings_controller = new MED_EDU_Settings_Controller();
	$settings_controller->register_routes();

	$telegram_controller = new MED_EDU_Telegram_Controller();
	$telegram_controller->register_routes();

	$exports_controller = new MED_EDU_Exports_Controller();
	$exports_controller->register_routes();
} );

function med_edu_rest_permission_check() {
	return current_user_can( 'manage_options' );
}
