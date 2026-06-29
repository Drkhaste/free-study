<?php

class MED_EDU_Telegram_Controller extends WP_REST_Controller {
	protected $namespace = 'medical-edu/v1';
	protected $rest_base = 'settings/telegram';

	public function register_routes() {
		register_rest_route( $this->namespace, '/test-telegram', array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => array( $this, 'test_telegram' ),
			'permission_callback' => 'med_edu_rest_permission_check',
		) );
	}

	public function test_telegram( $request ) {
		$user_id = get_current_user_id();
		$token = med_edu_get_setting( $user_id, 'telegram_bot_token' );
		$chat_id = med_edu_get_setting( $user_id, 'telegram_channel_id' );

		if ( ! $token || ! $chat_id ) {
			return new WP_Error( 'missing_config', 'Telegram token or channel ID missing' );
		}

		$url = "https://api.telegram.org/bot$token/sendMessage";
		$response = wp_remote_post( $url, array(
			'body' => array(
				'chat_id' => $chat_id,
				'text'    => "🧪 این یک پیام تست از پنل آکادمی پزشکی است.",
			)
		) );

		if ( is_wp_error( $response ) ) return $response;

		$data = json_decode( wp_remote_retrieve_body( $response ), true );
		return rest_ensure_response( array( 'ok' => $data['ok'] ?? false ) );
	}
}
