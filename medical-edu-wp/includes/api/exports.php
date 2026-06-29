<?php

class MED_EDU_Exports_Controller extends WP_REST_Controller {
	protected $namespace = 'medical-edu/v1';
	protected $rest_base = 'export';

	public function register_routes() {
		register_rest_route( $this->namespace, '/' . $this->rest_base . '/flashcards.csv', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( $this, 'export_flashcards' ),
			'permission_callback' => 'med_edu_rest_permission_check',
		) );

		register_rest_route( $this->namespace, '/' . $this->rest_base . '/backup.json', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( $this, 'export_backup' ),
			'permission_callback' => 'med_edu_rest_permission_check',
		) );
	}

	public function export_flashcards( $request ) {
		global $wpdb;
		$user_id = get_current_user_id();
		$table = $wpdb->prefix . 'med_edu_flashcards';

		$flashcards = $wpdb->get_results( $wpdb->prepare( "SELECT front, back, hint, tags FROM $table WHERE user_id = %d", $user_id ), ARRAY_A );

		header( 'Content-Type: text/csv; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename=flashcards.csv' );

		$output = fopen( 'php://output', 'w' );
		fputcsv( $output, array( 'front', 'back', 'hint', 'tags' ) );
		foreach ( $flashcards as $row ) {
			fputcsv( $output, $row );
		}
		fclose( $output );
		exit;
	}

	public function export_backup( $request ) {
		global $wpdb;
		$user_id = get_current_user_id();

		$backup = array(
			'projects'   => $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}med_edu_projects WHERE user_id = %d", $user_id ) ),
			'flashcards' => $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}med_edu_flashcards WHERE user_id = %d", $user_id ) ),
			'tasks'      => $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}med_edu_tasks WHERE user_id = %d", $user_id ) ),
			'settings'   => $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}med_edu_settings WHERE user_id = %d", $user_id ) ),
		);

		header( 'Content-Type: application/json' );
		header( 'Content-Disposition: attachment; filename=backup.json' );
		echo json_encode( $backup );
		exit;
	}
}
