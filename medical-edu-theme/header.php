<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php
    wp_head();
    // Force plugin assets for this theme
    if (class_exists('MedicalEdu')) {
        MedicalEdu::get_instance()->enqueue_assets();
    }
    ?>
    <style>
        body, html { overflow-x: hidden; width: 100%; height: 100%; margin: 0; padding: 0; }
        #app { min-height: 100vh; }
    </style>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
