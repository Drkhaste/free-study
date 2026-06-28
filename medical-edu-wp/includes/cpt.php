<?php
if (!defined('ABSPATH')) exit;

class MedEduCPT {
    public static function register() {
        // Topic CPT
        register_post_type('medical_topic', [
            'labels' => [
                'name' => 'مباحث',
                'singular_name' => 'مبحث',
                'add_new' => 'افزودن مبحث',
                'add_new_item' => 'افزودن مبحث جدید',
                'edit_item' => 'ویرایش مبحث',
            ],
            'public' => true,
            'has_archive' => true,
            'show_in_rest' => true,
            'supports' => ['title', 'editor', 'excerpt', 'custom-fields', 'author'],
            'menu_icon' => 'dashicons-book-alt',
            'rewrite' => ['slug' => 'topics'],
        ]);

        // Project CPT
        register_post_type('medical_project', [
            'labels' => [
                'name' => 'پروژه‌ها',
                'singular_name' => 'پروژه',
                'add_new' => 'افزودن پروژه',
                'add_new_item' => 'افزودن پروژه جدید',
            ],
            'public' => false,
            'show_ui' => true,
            'show_in_rest' => true,
            'supports' => ['title', 'author'],
            'menu_icon' => 'dashicons-category',
        ]);
    }
}
add_action('init', ['MedEduCPT', 'register']);
