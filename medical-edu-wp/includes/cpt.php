<?php

function med_edu_register_cpt() {
	$labels = array(
		'name'               => _x( 'Topics', 'post type general name', 'medical-edu' ),
		'singular_name'      => _x( 'Topic', 'post type singular name', 'medical-edu' ),
		'menu_name'          => _x( 'Topics', 'admin menu', 'medical-edu' ),
		'name_admin_bar'     => _x( 'Topic', 'add new on admin bar', 'medical-edu' ),
		'add_new'            => _x( 'Add New', 'topic', 'medical-edu' ),
		'add_new_item'       => __( 'Add New Topic', 'medical-edu' ),
		'new_item'           => __( 'New Topic', 'medical-edu' ),
		'edit_item'          => __( 'Edit Topic', 'medical-edu' ),
		'view_item'          => __( 'View Topic', 'medical-edu' ),
		'all_items'          => __( 'All Topics', 'medical-edu' ),
		'search_items'       => __( 'Search Topics', 'medical-edu' ),
		'parent_item_colon'  => __( 'Parent Topics:', 'medical-edu' ),
		'not_found'          => __( 'No topics found.', 'medical-edu' ),
		'not_found_in_trash' => __( 'No topics found in Trash.', 'medical-edu' )
	);

	$args = array(
		'labels'             => $labels,
		'public'             => true,
		'publicly_queryable' => true,
		'show_ui'            => true,
		'show_in_menu'       => true,
		'query_var'          => true,
		'rewrite'            => array( 'slug' => 'topic' ),
		'capability_type'    => 'post',
		'has_archive'        => true,
		'hierarchical'       => false,
		'menu_position'      => null,
		'show_in_rest'       => true,
		'supports'           => array( 'title', 'editor', 'author', 'thumbnail', 'excerpt', 'custom-fields' )
	);

	register_post_type( 'medical_topic', $args );
}

add_action( 'init', 'med_edu_register_cpt' );
