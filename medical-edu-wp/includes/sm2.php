<?php

class MED_EDU_SM2 {
	public function calculate( $ease, $interval, $repetitions, $quality ) {
		if ( $quality < 3 ) {
			$repetitions = 0;
			$interval = 1;
		} else {
			if ( $repetitions == 0 ) {
				$interval = 1;
			} elseif ( $repetitions == 1 ) {
				$interval = 4; // Simplified: 6 in original SM-2
			} else {
				$interval = round( $interval * $ease );
			}
			$repetitions++;
		}

		$ease = $ease + ( 0.1 - ( 5 - $quality ) * ( 0.08 + ( 5 - $quality ) * 0.02 ) );
		if ( $ease < 1.3 ) $ease = 1.3;

		return array(
			'ease'        => $ease,
			'interval'    => $interval,
			'repetitions' => $repetitions
		);
	}
}
