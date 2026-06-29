<?php

class MED_EDU_Tasks_Controller extends WP_REST_Controller {
	protected $namespace = 'medical-edu/v1';
	protected $rest_base = 'tasks';

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
	}

	public function get_items( $request ) {
		global $wpdb;
		$user_id = get_current_user_id();
		$month = $request->get_param( 'month' ); // YYYY-MM
		$date = $request->get_param( 'date' );   // YYYY-MM-DD
		$table = $wpdb->prefix . 'med_edu_tasks';

		$query = "SELECT * FROM $table WHERE user_id = %d";
		$params = array( $user_id );

		if ( $month ) {
			$query .= " AND task_date LIKE %s";
			$params[] = $month . '%';
		} elseif ( $date ) {
			$query .= " AND task_date = %s";
			$params[] = $date;
		}

		$tasks = $wpdb->get_results( $wpdb->prepare( $query, $params ) );

		return rest_ensure_response( array( 'tasks' => $tasks ) );
	}

	public function create_item( $request ) {
		global $wpdb;
		$user_id = get_current_user_id();
		$params = $request->get_json_params();
		$table = $wpdb->prefix . 'med_edu_tasks';

		$wpdb->insert( $table, array(
			'user_id'     => $user_id,
			'title'       => $params['title'],
			'description' => $params['description'] ?? '',
			'task_date'   => $params['task_date'],
			'status'      => 'pending',
		) );

		return rest_ensure_response( array( 'success' => true ) );
	}

	public function update_item( $request ) {
		global $wpdb;
		$user_id = get_current_user_id();
		$id = $request['id'];
		$params = $request->get_json_params();
		$table = $wpdb->prefix . 'med_edu_tasks';

		$wpdb->update( $table, array(
			'status' => $params['status'],
		), array( 'id' => $id, 'user_id' => $user_id ) );

		return rest_ensure_response( array( 'success' => true ) );
	}

	public function delete_item( $request ) {
		global $wpdb;
		$user_id = get_current_user_id();
		$id = $request['id'];
		$table = $wpdb->prefix . 'med_edu_tasks';

		$wpdb->delete( $table, array( 'id' => $id, 'user_id' => $user_id ) );

		return rest_ensure_response( array( 'success' => true ) );
	}
}
