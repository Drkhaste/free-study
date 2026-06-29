<?php

class MED_EDU_Flashcards_Controller extends WP_REST_Controller {
	protected $namespace = 'medical-edu/v1';
	protected $rest_base = 'flashcards';

	public function register_routes() {
		register_rest_route( $this->namespace, '/' . $this->rest_base, array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_items' ),
				'permission_callback' => 'med_edu_rest_permission_check',
			),
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'create_item' ),
				'permission_callback' => 'med_edu_rest_permission_check',
			),
		) );

		register_rest_route( $this->namespace, '/' . $this->rest_base . '/(?P<id>[\d]+)', array(
			array(
				'methods'             => WP_REST_Server::EDITABLE,
				'callback'            => array( $this, 'update_item' ),
				'permission_callback' => 'med_edu_rest_permission_check',
			),
			array(
				'methods'             => WP_REST_Server::DELETABLE,
				'callback'            => array( $this, 'delete_item' ),
				'permission_callback' => 'med_edu_rest_permission_check',
			),
		) );

		register_rest_route( $this->namespace, '/' . $this->rest_base . '/stats/overview', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( $this, 'get_stats' ),
			'permission_callback' => 'med_edu_rest_permission_check',
		) );

		register_rest_route( $this->namespace, '/' . $this->rest_base . '/import-csv', array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => array( $this, 'import_csv' ),
			'permission_callback' => 'med_edu_rest_permission_check',
		) );

		register_rest_route( $this->namespace, '/' . $this->rest_base . '/(?P<id>[\d]+)/reset', array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => array( $this, 'reset_card' ),
			'permission_callback' => 'med_edu_rest_permission_check',
		) );
	}

	public function get_items( $request ) {
		global $wpdb;
		$user_id = get_current_user_id();
		$topic_id = $request->get_param( 'topic_id' );
		$q = $request->get_param( 'q' );
		$table = $wpdb->prefix . 'med_edu_flashcards';

		$query = "SELECT f.*, p.post_title as topic_title FROM $table f
				  LEFT JOIN {$wpdb->posts} p ON f.topic_id = p.ID
				  WHERE f.user_id = %d";
		$params = array( $user_id );

		if ( $topic_id ) {
			$query .= " AND f.topic_id = %d";
			$params[] = $topic_id;
		}

		if ( $q ) {
			$query .= " AND (f.front LIKE %s OR f.back LIKE %s)";
			$params[] = '%' . $wpdb->esc_like( $q ) . '%';
			$params[] = '%' . $wpdb->esc_like( $q ) . '%';
		}

		$query .= " ORDER BY f.id DESC";

		$flashcards = $wpdb->get_results( $wpdb->prepare( $query, $params ) );

		return rest_ensure_response( array( 'flashcards' => $flashcards ) );
	}

	public function create_item( $request ) {
		global $wpdb;
		$user_id = get_current_user_id();
		$params = $request->get_json_params();
		$table = $wpdb->prefix . 'med_edu_flashcards';

		$wpdb->insert( $table, array(
			'user_id'        => $user_id,
			'project_id'     => $params['project_id'] ?? null,
			'topic_id'       => $params['topic_id'] ?? null,
			'front'          => $params['front'],
			'back'           => $params['back'],
			'hint'           => $params['hint'] ?? '',
			'tags'           => $params['tags'] ?? '',
			'next_review_at' => current_time( 'mysql' ),
		) );

		return rest_ensure_response( array( 'success' => true, 'id' => $wpdb->insert_id ) );
	}

	public function update_item( $request ) {
		global $wpdb;
		$user_id = get_current_user_id();
		$id = $request['id'];
		$params = $request->get_json_params();
		$table = $wpdb->prefix . 'med_edu_flashcards';

		$wpdb->update( $table, array(
			'front' => $params['front'],
			'back'  => $params['back'],
			'hint'  => $params['hint'] ?? '',
			'tags'  => $params['tags'] ?? '',
		), array( 'id' => $id, 'user_id' => $user_id ) );

		return rest_ensure_response( array( 'success' => true ) );
	}

	public function delete_item( $request ) {
		global $wpdb;
		$user_id = get_current_user_id();
		$id = $request['id'];
		$table = $wpdb->prefix . 'med_edu_flashcards';

		$wpdb->delete( $table, array( 'id' => $id, 'user_id' => $user_id ) );

		return rest_ensure_response( array( 'success' => true ) );
	}

	public function get_stats( $request ) {
		global $wpdb;
		$user_id = get_current_user_id();
		$table = $wpdb->prefix . 'med_edu_flashcards';
		$now = current_time( 'mysql' );

		$total = $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM $table WHERE user_id = %d", $user_id ) );
		$due = $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM $table WHERE user_id = %d AND next_review_at <= %s", $user_id, $now ) );
		$learned = $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM $table WHERE user_id = %d AND repetitions >= 3", $user_id ) );
		$reviewed = $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM $table WHERE user_id = %d AND total_reviews > 0", $user_id ) );

		return rest_ensure_response( array(
			'total'    => (int) $total,
			'due'      => (int) $due,
			'learned'  => (int) $learned,
			'reviewed' => (int) $reviewed,
		) );
	}

	public function import_csv( $request ) {
		global $wpdb;
		$user_id = get_current_user_id();
		$params = $request->get_json_params();
		$csv_text = $params['csv_text'];
		$topic_id = $params['topic_id'];
		$project_id = $params['project_id'];
		$table = $wpdb->prefix . 'med_edu_flashcards';

		$lines = explode( "\n", $csv_text );
		$imported = 0;

		foreach ( $lines as $line ) {
			$data = str_getcsv( $line );
			if ( count( $data ) < 2 ) continue;

			// Simple check to skip header
			if ( strtolower($data[0]) === 'front' && strtolower($data[1]) === 'back' ) continue;

			$wpdb->insert( $table, array(
				'user_id'        => $user_id,
				'project_id'     => $project_id,
				'topic_id'       => $topic_id,
				'front'          => $data[0],
				'back'           => $data[1],
				'hint'           => $data[2] ?? '',
				'tags'           => $data[3] ?? '',
				'next_review_at' => current_time( 'mysql' ),
			) );
			$imported++;
		}

		return rest_ensure_response( array( 'imported' => $imported ) );
	}

	public function reset_card( $request ) {
		global $wpdb;
		$user_id = get_current_user_id();
		$id = $request['id'];
		$table = $wpdb->prefix . 'med_edu_flashcards';

		$wpdb->update( $table, array(
			'ease'            => 2.5,
			'interval'        => 0,
			'repetitions'     => 0,
			'next_review_at'  => current_time( 'mysql' ),
			'last_reviewed_at' => null,
		), array( 'id' => $id, 'user_id' => $user_id ) );

		return rest_ensure_response( array( 'success' => true ) );
	}
}
