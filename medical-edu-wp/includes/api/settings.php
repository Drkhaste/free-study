<?php

class MED_EDU_Settings_Controller extends WP_REST_Controller {
	protected $namespace = 'medical-edu/v1';
	protected $rest_base = 'settings';

	public function register_routes() {
		register_rest_route( $this->namespace, '/' . $this->rest_base, array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_items' ),
				'permission_callback' => 'med_edu_rest_permission_check',
			),
			array(
				'methods'             => WP_REST_Server::EDITABLE,
				'callback'            => array( $this, 'update_item' ),
				'permission_callback' => 'med_edu_rest_permission_check',
			),
		) );
	}

	public function get_items( $request ) {
		$user_id = get_current_user_id();
		$settings = array(
			'site_title'            => med_edu_get_setting( $user_id, 'site_title' ),
			'site_description'      => med_edu_get_setting( $user_id, 'site_description' ),
			'gemini_api_key'        => med_edu_get_setting( $user_id, 'gemini_api_key' ),
			'telegram_bot_token'    => med_edu_get_setting( $user_id, 'telegram_bot_token' ),
			'telegram_channel_id'   => med_edu_get_setting( $user_id, 'telegram_channel_id' ),
			'telegram_daily_hour'   => med_edu_get_setting( $user_id, 'telegram_daily_hour' ),
			'system_prompt'         => med_edu_get_setting( $user_id, 'system_prompt' ),
			'prompt_generate_topic' => med_edu_get_setting( $user_id, 'prompt_generate_topic' ),
			'prompt_improve'        => med_edu_get_setting( $user_id, 'prompt_improve' ),
			'prompt_summarize'      => med_edu_get_setting( $user_id, 'prompt_summarize' ),
		);

		return rest_ensure_response( array( 'settings' => $settings ) );
	}

	public function update_item( $request ) {
		$user_id = get_current_user_id();
		$params = $request->get_json_params();

		foreach ( $params as $key => $value ) {
			med_edu_set_setting( $user_id, $key, $value );
		}

		return rest_ensure_response( array( 'success' => true ) );
	}
}

function med_edu_get_setting( $user_id, $key ) {
	global $wpdb;
	$table = $wpdb->prefix . 'med_edu_settings';
	return $wpdb->get_var( $wpdb->prepare( "SELECT value FROM $table WHERE user_id = %d AND `key` = %s", $user_id, $key ) );
}

function med_edu_set_setting( $user_id, $key, $value ) {
	global $wpdb;
	$table = $wpdb->prefix . 'med_edu_settings';
	$wpdb->replace( $table, array(
		'user_id' => $user_id,
		'key'     => $key,
		'value'   => $value,
	) );
}
