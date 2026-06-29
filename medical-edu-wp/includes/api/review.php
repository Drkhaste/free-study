<?php

require_once MED_EDU_PATH . 'includes/sm2.php';

class MED_EDU_Review_Controller extends WP_REST_Controller {
	protected $namespace = 'medical-edu/v1';
	protected $rest_base = 'review';

	public function register_routes() {
		register_rest_route( $this->namespace, '/' . $this->rest_base . '/queue', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( $this, 'get_queue' ),
			'permission_callback' => 'med_edu_rest_permission_check',
		) );

		register_rest_route( $this->namespace, '/' . $this->rest_base . '/(?P<session_id>[\d]+)/answer', array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => array( $this, 'submit_answer' ),
			'permission_callback' => 'med_edu_rest_permission_check',
		) );

		register_rest_route( $this->namespace, '/' . $this->rest_base . '/quick-answer', array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => array( $this, 'quick_answer' ),
			'permission_callback' => 'med_edu_rest_permission_check',
		) );

		register_rest_route( $this->namespace, '/' . $this->rest_base . '/(?P<session_id>[\d]+)/end', array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => array( $this, 'end_session' ),
			'permission_callback' => 'med_edu_rest_permission_check',
		) );
	}

	public function get_queue( $request ) {
		global $wpdb;
		$user_id = get_current_user_id();
		$limit = $request->get_param( 'limit' ) ?: 50;
		$table_fc = $wpdb->prefix . 'med_edu_flashcards';
		$table_sess = $wpdb->prefix . 'med_edu_review_sessions';
		$now = current_time( 'mysql' );

		$queue = $wpdb->get_results( $wpdb->prepare(
			"SELECT * FROM $table_fc WHERE user_id = %d AND next_review_at <= %s ORDER BY next_review_at ASC LIMIT %d",
			$user_id, $now, $limit
		) );

		// Create session
		$wpdb->insert( $table_sess, array(
			'user_id'    => $user_id,
			'started_at' => $now,
		) );
		$session_id = $wpdb->insert_id;

		return rest_ensure_response( array(
			'queue'      => $queue,
			'session_id' => $session_id,
		) );
	}

	public function submit_answer( $request ) {
		global $wpdb;
		$user_id = get_current_user_id();
		$session_id = $request['session_id'];
		$params = $request->get_json_params();
		$card_id = $params['card_id'];
		$button = $params['button']; // again, hard, good, easy

		$table_fc = $wpdb->prefix . 'med_edu_flashcards';
		$card = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table_fc WHERE id = %d AND user_id = %d", $card_id, $user_id ) );

		if ( ! $card ) return new WP_Error( 'not_found', 'Card not found' );

		$quality = $this->button_to_quality( $button );
		$sm2 = new MED_EDU_SM2();
		$result = $sm2->calculate( (float)$card->ease, (int)$card->interval, (int)$card->repetitions, $quality );

		$next_review = date( 'Y-m-d H:i:s', strtotime( "+{$result['interval']} days" ) );

		$wpdb->update( $table_fc, array(
			'ease'             => $result['ease'],
			'interval'         => $result['interval'],
			'repetitions'      => $result['repetitions'],
			'next_review_at'   => $next_review,
			'last_reviewed_at' => current_time( 'mysql' ),
			'total_reviews'    => $card->total_reviews + 1,
			'correct_reviews'  => $card->correct_reviews + ( $quality >= 3 ? 1 : 0 ),
		), array( 'id' => $card_id ) );

		// Update session stats
		$table_sess = $wpdb->prefix . 'med_edu_review_sessions';
		$wpdb->query( $wpdb->prepare(
			"UPDATE $table_sess SET cards_reviewed = cards_reviewed + 1, cards_correct = cards_correct + %d WHERE id = %d",
			( $quality >= 3 ? 1 : 0 ), $session_id
		) );

		return rest_ensure_response( array( 'success' => true, 'interval_days' => $result['interval'] ) );
	}

	public function quick_answer( $request ) {
		global $wpdb;
		$user_id = get_current_user_id();
		$params = $request->get_json_params();
		$card_id = $params['card_id'];
		$level = $params['level']; // again, good, easy

		$table_fc = $wpdb->prefix . 'med_edu_flashcards';
		$card = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table_fc WHERE id = %d AND user_id = %d", $card_id, $user_id ) );

		if ( ! $card ) return new WP_Error( 'not_found', 'Card not found' );

		$interval = 0;
		if ( $level === 'easy' ) $interval = 3;
		elseif ( $level === 'good' ) $interval = 1;

		$next_review = date( 'Y-m-d H:i:s', strtotime( "+$interval days" ) );

		$wpdb->update( $table_fc, array(
			'next_review_at'   => $next_review,
			'last_reviewed_at' => current_time( 'mysql' ),
			'total_reviews'    => $card->total_reviews + 1,
			'correct_reviews'  => $card->correct_reviews + ( $level !== 'again' ? 1 : 0 ),
		), array( 'id' => $card_id ) );

		return rest_ensure_response( array( 'success' => true ) );
	}

	public function end_session( $request ) {
		global $wpdb;
		$session_id = $request['session_id'];
		$table_sess = $wpdb->prefix . 'med_edu_review_sessions';

		$session = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table_sess WHERE id = %d", $session_id ) );
		if ( ! $session ) return new WP_Error( 'not_found', 'Session not found' );

		$now = current_time( 'mysql' );
		$duration = strtotime( $now ) - strtotime( $session->started_at );

		$wpdb->update( $table_sess, array(
			'ended_at'     => $now,
			'duration_sec' => $duration,
		), array( 'id' => $session_id ) );

		return rest_ensure_response( array( 'success' => true ) );
	}

	private function button_to_quality( $button ) {
		switch ( $button ) {
			case 'again': return 1;
			case 'hard':  return 3;
			case 'good':  return 4;
			case 'easy':  return 5;
			default:      return 3;
		}
	}
}
