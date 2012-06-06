var modals = {
	err_connect: undefined,
	change_conf: undefined,
	newDownload_modal: undefined

};
var clear_dialogs = function() {
	modals.err_connect = $('#error_connect').modal('hide');
	modals.change_conf = $('#change_conf').modal('hide');
	modals.newDownload_modal = $('#newDownload_modal').modal('hide');
};
var server_conf = {
	host: 'localhost',
	port: 6800
};
var custom_aria2_connect = function() {
	modals.err_connect.modal('hide');
	modals.change_conf.modal('show');
};
var update_server_conf = function() {
	server_conf.host = $('#input_host').val();
	server_conf.port = $('#input_port').val();
	clear_dialogs();
	update_ui();
};

function param_encode(param) {
	if(param) {
		param = base64.btoa(JSON.stringify(param));
	}
	return param;
}
var aria_syscall = function(conf, multicall) {
	$.ajax({
		url: 'http://' + server_conf.host + ':' + server_conf.port + '/jsonrpc',
		timeout: 1000,
		data: {
			jsonrpc: 2.0,
			id: 'webui',
			method: multicall? conf.func:'aria2.' + conf.func,
			params: param_encode(conf.params)
		},
		success: conf.sucess,
		error: conf.error,
		dataType: 'jsonp',
		jsonp: 'jsoncallback'
	});

}
var update_ui = function() {
	updateDownloads();
};

$(function() {
	clear_dialogs();
	update_ui();
	$('#newDownload').click(function() {
		$('#newDownload_url').val("");
		$('.download_urls').html("");
		modals.newDownload_modal.modal('show');
	});
	$('#multiple_uris').click(function() {
		var url = $('#newDownload_url').val();
		var html = '<li>';
		html += '<span class="uris">';
		html += url;
		html += '</span>';
		html += '             ';
		html += '<a href="#"><i class="icon-trash"></i></a></li>';
		$(html).appendTo('.download_urls');
		$('#newDownload_url').val("");
		$('.download_urls a').click(function() {
			$(this).parents('li').remove();
		});
	});
	$('#addNewDownload').click(newDownload);
});

function addDownload(uris) {
	console.log("adding download:");
	console.log(uris);
	aria_syscall({
		func: 'addUri',
		params: uris,
		sucess: function() {
			clear_dialogs();
			update_ui();
		}
	});
}

function newDownload() {
	var li = $('.download_urls li');
	var urls = [];
	for(var i = 0; i < li.length; i++) {
		urls.push($(li[i]).text().trim());

	}
	var inp_url = $('#newDownload_url').val().trim();
	if(inp_url.length > 0) urls.push(inp_url);
	addDownload([urls]);
}

var d_files = {
	active: [],
	waiting: [],
	stopped: []
};
function changeLength(len, pref) {
	len = parseInt(len);
	if(len <= 1000) return len  + " " + pref;
	else if(len <= 1000000) return Math.round(len/1000 * 10)/10 + " k" + pref;
	else if(len <= 1000000000) return Math.round(len/1000000 *10)/10 + " m" + pref;
	else if(len <= 1000000000000) return Math.round(len/1000000000 *10)/10 + " g" + pref;
}
function changeTime(time) {
	time = parseInt(time);
	if(time < 60) return time + " s";
	else if(time < 60*60) return Math.round(time/60 *100)/100 + " min";
	else if(time < 60*60*24) return Math.round(time/(60*60) *100)/100 + " hours";
	else return Math.round(time/(60*60*24) *100)/100 + " days!!";

}
function updateActiveDownloads(data) {
	var down_template = $('#download_active_template').text();
	$('#active_downloads').html("");
	if(!data || (data && data.length === 0)) {
		$('#active_downloads').append('no active downloads yet!!!!');
	}
	for(var i = 0; i < data.length; i++) {
		var percentage =(data[i].completedLength / data[i].totalLength)*100;
		percentage = Math.round(percentage*100)/100;
		if(!percentage) percentage = 0;
		var name;
		if(data[i].files[0].uris.length) {
			name = data[i].files[0].uris[0].uri.replace(/^.*[\\\/]/, '');
		}
		else {
			name = data[i].files[0].path.replace(/^.*[\\\/\]]/, '');
		}
		ctx = {
			name: name,
			status: data[i].status,
			percentage:percentage,
			gid: data[i].gid,
			size: changeLength(data[i].totalLength, "b"),
			down: changeLength(data[i].downloadSpeed, "b/s"),
			remaining: changeLength(data[i].totalLength - data[i].completedLength, "b"),
			eta: changeTime((data[i].totalLength-data[i].completedLength)/data[i].downloadSpeed)
		};
		var item = Mustache.render(down_template, ctx);
		$('#active_downloads').append(item);
	}
	$('.download_active_item .download_pause').click(function() {
		var gid = $(this).parents('.download_active_item').attr('data-gid');
		aria_syscall({
			func: 'pause',
			params: [gid],
			sucess: function() {
				update_ui();
			},
			error: function(err) {
				console.log("error pausing active download!!!");
				console.log(err);
			}
		});
	});
	$('.download_active_item .download_remove').click(function() {
		var gid = $(this).parents('.download_active_item').attr('data-gid');
		aria_syscall({
			func: 'remove',
			params: [gid],
			sucess: function() {
				update_ui();
			},
			error: function(err) {
				console.log("error removing active download!!!");
				console.log(err);
			}
		});
	});
}
function updateWaitingDownloads(data) {
	var down_template = $('#download_waiting_template').text();
	$('#waiting_downloads').html("");
	if(!data || (data && data.length === 0)) {
		$('#waiting_downloads').append('no waiting downloads yet!!!!');
	}
	for(var i = 0; i < data.length; i++) {
		var percentage =(data[i].completedLength / data[i].totalLength)*100;
		percentage = Math.round(percentage*100)/100;
		if(!percentage) percentage = 0;
		var name;
		if(data[i].files[0].uris.length) {
			name = data[i].files[0].uris[0].uri.replace(/^.*[\\\/]/, '');
		}
		else {
			name = data[i].files[0].path.replace(/^.*[\\\/\]]/, '');
		}
		ctx = {
			name: name,
			status: data[i].status,
			percentage:percentage,
			gid: data[i].gid,
			size: changeLength(data[i].totalLength, "b"),
			down: changeLength(data[i].downloadSpeed, "b/s"),
			remaining: changeLength(data[i].totalLength - data[i].completedLength, "b"),
			eta: changeTime((data[i].totalLength-data[i].completedLength)/data[i].downloadSpeed)
		};
		var item = Mustache.render(down_template, ctx);
		$('#waiting_downloads').append(item);
	}
	$('.download_waiting_item .download_play').click(function() {
		var gid = $(this).parents('.download_waiting_item').attr('data-gid');
		aria_syscall({
			func: 'unpause',
			params: [gid],
			sucess: function(data) {
				update_ui();
			},
			error: function(err) {
				console.log("error playing waiting download!!!");
				console.log(err);
			}
		});
	});
	$('.download_waiting_item .download_remove').click(function() {
		var gid = $(this).parents('.download_waiting_item').attr('data-gid');
		aria_syscall({
			func: 'remove',
			params: [gid],
			sucess: function() {
				update_ui();
			},
			error: function(err) {
				console.log("error removing waiting download!!!");
				console.log(err);
			}
		});
	});
}

function updateStoppedDownloads(data) {
	var down_template = $('#download_stopped_template').text();
	$('#stopped_downloads').html("");
	if(!data || (data && data.length === 0)) {
		$('#stopped_downloads').append('no stopped downloads yet!!!!');
	}
	for(var i = 0; i < data.length; i++) {
		var percentage =(data[i].completedLength / data[i].totalLength)*100;
		percentage = Math.round(percentage*100)/100;
		if(!percentage) percentage = 0;
		var name;
		if(data[i].files[0].uris.length) {
			name = data[i].files[0].uris[0].uri.replace(/^.*[\\\/]/, '');
		}
		else {
			name = data[i].files[0].path.replace(/^.*[\\\/\]]/, '');
		}
		ctx = {
			name: name,
			status: data[i].status,
			percentage:percentage,
			gid: data[i].gid,
			size: changeLength(data[i].totalLength, "b"),
			down: changeLength(data[i].downloadSpeed, "b/s"),
			remaining: changeLength(data[i].totalLength - data[i].completedLength, "b"),
			eta: changeTime((data[i].totalLength-data[i].completedLength)/data[i].downloadSpeed)
		};
		var item = Mustache.render(down_template, ctx);
		$('#stopped_downloads').append(item);
	}
	$('.download_stopped_item .download_remove').click(function() {
		var gid = $(this).parents('.download_stopped_item').attr('data-gid');
		aria_syscall({
			func: 'removeDownloadResult',
			params: [gid],
			sucess: function() {
				update_ui();
			},
			error: function(err) {
				console.log("error removing stopped download!!!");
				console.log(err);
			}
		});
	});
	$('.download_stopped_item .download_restart').click(function() {
		var gid = $(this).parents('.download_stopped_item').attr('data-gid');
		var files;
		var uris = [];
		for(var i = 0; i < d_files.stopped.length; i++) {
			if(d_files.stopped[i].gid === gid) {
				files = d_files.stopped[i].files;
				break;
			}
		}
		for(var i = 0; i < files.length; i++) {
			var tmp_uris = [];
			for(var j = 0; j < files[i].uris.length; j++) {
				tmp_uris.push(files[i].uris[j].uri);
			}
			uris.push(tmp_uris);
		}
		addDownload(uris);
		aria_syscall({
			func: 'removeDownloadResult',
			params: [gid],
			sucess: function() {
				update_ui();
			},
			error: function(err) {
				console.log("error removing stopped download!!!");
				console.log(err);
			}
		});
	});
}


function mergeDownloads(data) {
	d_files.active = data[0][0];
	d_files.waiting = data[1][0];
	d_files.stopped = data[2][0];
}

function updateDownloads() {
	aria_syscall({
		func: 'system.multicall',
		params:[[{
			methodName: 'aria2.tellActive'
		}, {
			methodName: 'aria2.tellWaiting',
			params: [0,100]
		}, {
			methodName: 'aria2.tellStopped',
			params: [0, 100]
		}]],
		sucess: function(data) {
			mergeDownloads(data.result);
			updateActiveDownloads(d_files.active);
			updateWaitingDownloads(d_files.waiting);
			updateStoppedDownloads(d_files.stopped);
		},
		error: function() {
			modals.err_connect.modal('show');
		}
	}, true);
}

setInterval(update_ui, 1000);
