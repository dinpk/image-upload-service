<?php 

// ERROR HANDLING

error_reporting(E_ALL);
function errorCatcher($error_level, $error_message, $error_file, $error_line, $error_context) {
	$error_details = "
		<b>Level: </b>$error_level<br>
		<b>Message: </b>$error_message<br>
		<b>File: </b> $error_file<br>
		<b>Line: </b>$error_line<br>
		<b>URL: </b>" . $_SERVER['REQUEST_URI'] . "<br>";
		// print $error_details;
}
set_error_handler("errorCatcher");


// IMAGE RESIZER FOR THUMBNAIL

function resizeImage($file, $extension, $required_width, $required_height, $crop=false) {
    list($image_width, $image_height) = getimagesize($file);
    $ratio = round($image_width / $image_height, 2);
    if ($crop) {
        if ($image_width > $image_height) {
            $image_width = ceil($image_width-($image_width*abs($ratio-$required_width/$required_height)));
        } else {
            $image_height = ceil($image_height-($image_height*abs($ratio-$required_width/$required_height)));
        }
        $new_width = $required_width;
        $new_height = $required_height;
	} else {
        if ($required_width/$required_height > $ratio) {
            $new_width = $required_height*$ratio;
            $new_height = $required_height;
        } else {
            $new_height = $required_width/$ratio;
            $new_width = $required_width;
        }
    }
	if ($extension == "jpg" || $extension == "jpeg") {
		$source_image = imagecreatefromjpeg($file);
	} else if ($extension == "png") {
		$source_image = imagecreatefrompng($file);
	} else if ($extension == "gif") {
		$source_image = imagecreatefromgif($file);
	} else {
		$source_image = imagecreatefrompng($file);
	}
    $target_image = imagecreatetruecolor($new_width, $new_height);
    imagecopyresampled($target_image, $source_image, 0, 0, 0, 0, $new_width, $new_height, $image_width, $image_height);
    return $target_image;
}


// HANDLE UPLOAD

if ($_SERVER['REQUEST_METHOD'] == 'POST') {

	// var_dump($_FILES);

	$json = '';

	$referral = $_SERVER['HTTP_REFERER'];	
	if (!(strpos($referral, "localhost") >= 0)) {
		$json = '{"error": "Domain not allowed."}';
	}

	$server = "http://" . $_SERVER['HTTP_HOST'].dirname($_SERVER['PHP_SELF']) . "/";
	$images_folder = "uploads/";
	$allowed_extentions = array("jpg", "jpeg", "png", "gif");
	$allowed_size = 5000000; // 5mb (in bytes)

	$file_size = isset($_FILES["selected"]["size"]) ? $_FILES["selected"]["size"] : 0;
	$upload_error = $_FILES["selected"]["error"];
	$temp_path = isset($_FILES["selected"]["tmp_name"]) ? $_FILES["selected"]["tmp_name"] : '';
	if (isset($_POST["file_name"])) {
		$file_name = $_POST["file_name"];
	} else if (isset($_FILES["selected"]["name"])) {
		$file_name =  $_FILES["selected"]["name"];
	}
	$image_type = isset($_POST["image_type"]) ? $_POST["image_type"] : '';
	$file_name_parts = explode(".", strtolower($file_name));
	$extension = end($file_name_parts);

	if ($upload_error > 0) {
		$json = '{"error": "Faild to upload, please try later."}';
	} else {
		if ($file_size > $allowed_size) {
			$json = '{"error": "Please upload an image file under 5mb."}';
		}
		if (!(in_array($extension, $allowed_extentions))) {
			$json = '{"error": "Please upload an image file (jpg, jpeg, png, gif)."}';
		}
	}

	// Move the renamed file to actual folder
	$time_random = date("YmdHis") . rand();
	$new_file_name = hash('crc32', $time_random, false);
	$permanent_upload_path = $images_folder . $new_file_name . "." . $extension;
	$file_moved = move_uploaded_file($temp_path, $permanent_upload_path);

	if ($file_moved) {
		// thumbnail
		$permanent_upload_path_thumb = $images_folder . $new_file_name . "_thumb" . "." . $extension;
		$thumb_image = resizeImage($permanent_upload_path, $extension, 200, 200, false);
		if ($extension == "jpg" || $extension == "jpeg") {
			imagejpeg($thumb_image, $permanent_upload_path_thumb);
		} else if ($extension == "png") {
			imagepng($thumb_image, $permanent_upload_path_thumb);
		} else if ($extension == "gif") {
			imagegif($thumb_image, $permanent_upload_path_thumb);
		}
	}
	
	// Prepare JSON
	if ($file_moved == false) {
		$json = '{"error": "Could not complete the upload, please try later."}';
	} else {
		$json_image_url = $server . $permanent_upload_path;
		$json_image_url_thumb = $server . $permanent_upload_path_thumb;
		$json = '
		{
			"data": {
				"url": "' . $json_image_url . '",
				"referral": "' . $referral . '",
				"mime_type": "' . $image_type . '",
				"file_name": "' . $new_file_name . '",
				"extension": "' . $extension . '",
				"thumb": {
					"url": "' . $json_image_url_thumb .'"
				}
			}
		}';
	}

	// Output 
	header("Content-Type: application/json; charset=utf-8");
	print $json;
}

?>
