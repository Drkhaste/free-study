<?php

class MED_EDU_AI_Controller extends WP_REST_Controller {
	protected $namespace = 'medical-edu/v1';
	protected $rest_base = 'ai';

	public function register_routes() {
		register_rest_route( $this->namespace, '/' . $this->rest_base . '/generate-topic', array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => array( $this, 'generate_topic' ),
			'permission_callback' => 'med_edu_rest_permission_check',
		) );

		register_rest_route( $this->namespace, '/' . $this->rest_base . '/improve', array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => array( $this, 'improve_content' ),
			'permission_callback' => 'med_edu_rest_permission_check',
		) );

		register_rest_route( $this->namespace, '/' . $this->rest_base . '/logs', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( $this, 'get_logs' ),
			'permission_callback' => 'med_edu_rest_permission_check',
		) );
	}

	public function generate_topic( $request ) {
		$user_id = get_current_user_id();
		$params = $request->get_json_params();
		$title = $params['title'];
		$topic_id = $params['topic_id'] ?? null;

		$api_key = med_edu_get_setting( $user_id, 'gemini_api_key' );
		if ( ! $api_key ) return new WP_Error( 'no_api_key', 'Gemini API Key is not set in settings.' );

		$prompt_template = med_edu_get_setting( $user_id, 'prompt_generate_topic' ) ?: "Generate a medical topic about {{title}} in Persian Markdown.";
		$system_prompt = med_edu_get_setting( $user_id, 'system_prompt' ) ?: "You are a medical professor.";

		$prompt = str_replace( '{{title}}', $title, $prompt_template );
		$prompt = str_replace( '{{project_context}}', '', $prompt );

		$response = $this->call_gemini( $api_key, $prompt, $system_prompt );

		if ( is_wp_error( $response ) ) {
			$this->log_ai( $user_id, $topic_id, $prompt, '', 'error', $response->get_error_message() );
			return $response;
		}

		$content_md = $response['text'];
		$this->log_ai( $user_id, $topic_id, $prompt, substr( $content_md, 0, 500 ), 'success' );

		if ( $topic_id ) {
			wp_update_post( array(
				'ID'           => $topic_id,
				'post_content' => $content_md,
			) );
		}

		return rest_ensure_response( array( 'content_md' => $content_md ) );
	}

	public function improve_content( $request ) {
		$user_id = get_current_user_id();
		$params = $request->get_json_params();
		$content = $params['content'];

		$api_key = med_edu_get_setting( $user_id, 'gemini_api_key' );
		if ( ! $api_key ) return new WP_Error( 'no_api_key', 'Gemini API Key is not set.' );

		$prompt_template = med_edu_get_setting( $user_id, 'prompt_improve' ) ?: "Improve this medical text: {{content}}";
		$prompt = str_replace( '{{content}}', $content, $prompt_template );

		$response = $this->call_gemini( $api_key, $prompt );

		if ( is_wp_error( $response ) ) return $response;

		return rest_ensure_response( array( 'content_md' => $response['text'] ) );
	}

	private function call_gemini( $api_key, $prompt, $system_instruction = '' ) {
		$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . $api_key;

		$body = array(
			'contents' => array(
				array(
					'parts' => array(
						array( 'text' => $prompt )
					)
				)
			)
		);

		if ( $system_instruction ) {
			$body['system_instruction'] = array(
				'parts' => array(
					array( 'text' => $system_instruction )
				)
			);
		}

		$response = wp_remote_post( $url, array(
			'headers' => array( 'Content-Type' => 'application/json' ),
			'body'    => json_encode( $body ),
			'timeout' => 60,
		) );

		if ( is_wp_error( $response ) ) return $response;

		$data = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( isset( $data['error'] ) ) {
			return new WP_Error( 'api_error', $data['error']['message'] ?? 'Unknown AI error' );
		}

		$text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
		return array( 'text' => $text );
	}

	private function log_ai( $user_id, $topic_id, $prompt, $response, $status, $error = '' ) {
		global $wpdb;
		$wpdb->insert( $wpdb->prefix . 'med_edu_ai_logs', array(
			'user_id'          => $user_id,
			'topic_id'         => $topic_id,
			'prompt'           => $prompt,
			'response_excerpt' => $response,
			'status'           => $status,
			'error_message'    => $error,
		) );
	}

	public function get_logs( $request ) {
		global $wpdb;
		$user_id = get_current_user_id();
		$limit = $request->get_param( 'limit' ) ?: 10;
		$logs = $wpdb->get_results( $wpdb->prepare(
			"SELECT * FROM {$wpdb->prefix}med_edu_ai_logs WHERE user_id = %d ORDER BY id DESC LIMIT %d",
			$user_id, $limit
		) );
		return rest_ensure_response( array( 'logs' => $logs ) );
	}
}
