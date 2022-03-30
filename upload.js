var max_resize_width = 1000;
var max_resize_height = 1000;

function loadSettings() {
	if ("max_resize_width" in localStorage) {
		max_resize_width = localStorage.getItem("max_resize_width");
		max_resize_height = localStorage.getItem("max_resize_height");
	} else {
		localStorage.setItem("max_resize_width", max_resize_width);
		localStorage.setItem("max_resize_height", max_resize_height);
	}
	document.getElementById("max_resize_width").value = max_resize_width;
	document.getElementById("max_resize_height").value = max_resize_height;
}

function saveSettings() {
	max_resize_width = document.getElementById("max_resize_width").value;
	max_resize_height = document.getElementById("max_resize_height").value;
	localStorage.setItem("max_resize_width", max_resize_width);
	localStorage.setItem("max_resize_height", max_resize_height);
}

function settingsPanel() {
	document.getElementById("settings_panel").classList.toggle("hide");
}

function imageLinks(url, thumb) {
	var image_link_options = document.getElementById("image_link_options");
	image_link_options.style.display = "inline-block";
	var html_full_link = `<a href="${url}">${url}</a>`;
	var html_thumbnail_link = `<a href="${url}"><img src="${url}" alt="${url}"></a>`;
	var bbcode_full_link = `[url=${url}][img]${url}[/img][/url]`;
	var bbcode_thumbnail_link = `[url=${url}][img]${url}[/img][/url]`;
	image_link_options.innerHTML = `<p><a href="${url}" target="_blank"><img src="${htmlToText(thumb)}"> ↗</a></p>`;
	image_link_options.innerHTML += `<p><b>HTML full link</b><br>${htmlToText(html_full_link)}</p>`;
	image_link_options.innerHTML += `<p><b>HTML thumbnail link</b><br>${htmlToText(html_thumbnail_link)}</p>`;
	image_link_options.innerHTML += `<p><b>BBCode full link</b><br>${htmlToText(bbcode_full_link)}</p>`;
	image_link_options.innerHTML += `<p><b>BBCode thumbnail link</b><br>${htmlToText(bbcode_thumbnail_link)}</p>`;

}

function htmlToText(html) {
	var temp = document.createElement('div');
	temp.innerHTML = html;
	return temp.textContent;
}

function previewImages(e) {
	var preview_images = document.getElementById("preview_images");
	if (e.target.files) {
		var total_files = e.target.files.length;
		if (total_files > 0) {
			document.getElementById("select_button").style.display = "none";
			document.getElementById("upload_button").style.display = "inline";
		}
		for (i = 0; i < total_files; i++) {
			var reader = new FileReader();
			reader.onload = function(event) {
				let html = document.querySelector("body").innerHTML;
				let doc = new DOMParser().parseFromString(html, "text/html");
				let images = doc.querySelectorAll("img");
				let image = images[images.length-1];
				image.setAttribute("src", event.target.result);
				preview_images.appendChild(image);
			}
			reader.readAsDataURL(e.target.files[i]);
		}
	}
}

function getResizedBlob(result,image_type) {
	var image = document.createElement("img");
	image.src = result;
	var canvas = document.createElement("canvas");
	var ctx = canvas.getContext("2d");
	ctx.drawImage(image, 0, 0);
	var width = image.width;
	var height = image.height;
	if (width > height) {
		if (width > max_resize_width) {
			height *= max_resize_width / width;
			width = max_resize_width;
		}
	} else {
		if (height > max_resize_height) {
			width *= max_resize_height / height;
			height = max_resize_height;
		}
	}
	canvas.width = width;
	canvas.height = height;
	ctx.drawImage(image, 0, 0, width, height);
	var dataurl = canvas.toDataURL(image_type);
	var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
		bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
	while(n--){
		u8arr[n] = bstr.charCodeAt(n);
	}
	return new Blob([u8arr], {type:mime});
}


var upload_counter = 0;
var total_files;
function multipleImageUpload() {
	document.getElementById("preview_images").style.display = "none";
	document.getElementById("upload_button").style.display = "none";
	var upload_progress = document.getElementById("upload_progress");
	upload_progress.style.display = "inline-block";
	var files_to_upload = document.getElementById('selected_files').files;
	total_files = files_to_upload.length;
	var progress_part = 100 / total_files;

	Array.from(files_to_upload).forEach(file => { // to get non-async behavior for file reader in loop
		var reader = new FileReader();
		reader.onload = async function(e) {
			const form = new FormData();
			form.append("file_name", file.name);
			form.append("image_type", file.type);
			form.append("selected", getResizedBlob(e.target.result, file.type));
			// https://api.imgbb.com/1/upload?expiration=15552000&key=yourkey
			try {
				const response = await fetch('upload.php',{
					method:'POST',
					body:form
				});
				const result = await response.json();
				upload_counter++;
				document.getElementById("uploaded_images").innerHTML += `<img src="${result.data.thumb.url}" onclick="imageLinks('${result.data.url}', '${result.data.thumb.url}');return false;" class="uploaded_image">`;
				upload_progress.value = progress_part * upload_counter;
			} catch(e) {
				console.log(e);
			}
		}
		reader.readAsDataURL(file);
	});


	upload_timer = setInterval(function() {
		if (upload_counter == total_files) {
			// console.log("last message after all the uploads");
			document.getElementById("upload_progress").style.display = "none";
			document.getElementById("selected_files").value = "";
			clearInterval(upload_timer);
		}
	}, 2000);
}
