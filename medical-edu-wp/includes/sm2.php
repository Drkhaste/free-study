<?php
if (!defined('ABSPATH')) exit;

class MedEduSM2 {
    public static function calculate($input, $quality) {
        if ($quality < 0 || $quality > 5) $quality = 3;

        $ease = $input['ease'];
        $interval = $input['interval'];
        $repetitions = $input['repetitions'];

        if ($quality < 3) {
            $repetitions = 0;
            $interval = 1;
        } else {
            $repetitions += 1;
            if ($repetitions === 1) {
                $interval = 1;
            } else if ($repetitions === 2) {
                $interval = 6;
            } else {
                $interval = round($interval * $ease);
            }
        }

        $ease = $ease + (0.1 - (5 - $quality) * (0.08 + (5 - $quality) * 0.02));
        if ($ease < 1.3) $ease = 1.3;

        $next_review_at = date('Y-m-d H:i:s', time() + $interval * 86400);

        return [
            'ease' => $ease,
            'interval' => $interval,
            'repetitions' => $repetitions,
            'next_review_at' => $next_review_at
        ];
    }

    public static function get_quality_by_button($button) {
        $map = [
            'again' => 1,
            'hard' => 3,
            'good' => 4,
            'easy' => 5,
        ];
        return $map[$button] ?? 3;
    }
}
