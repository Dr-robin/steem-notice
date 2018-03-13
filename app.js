let steemURL = 'https://steemit.com';
let settings;
let successCount = 0;

Notification.requestPermission((status) => {
	if (Notification.permission !== status) {
		Notification.permission = status;
	}
	if(Notification.permission === 'denied') {
		$('#message').text('알림 설정이 꺼져 있어요ㅠㅠㅠ');
	}
});

if(localStorage.getItem('username')) {
	watch(localStorage.getItem('username'));
	$('#message').text(localStorage.getItem('username') + ' 계정의 스팀잇 알림이 시작되었어요!');
}
else {
	$('#message').text('계정명을 쓰고 저장 버튼을 눌러주세요!');
}

try {
	settings = JSON.parse(localStorage.getItem('settings'));
	if(!settings) {
		throw 1;
	}
}
catch(e) {
	settings = {comment: true, mention: true, follow: true, vote: false, time: 5};
}

$('#comment').attr('checked', settings.comment).change(changeSettings);
$('#mention').attr('checked', settings.mention).change(changeSettings);
$('#follow').attr('checked', settings.follow).change(changeSettings);
$('#vote').attr('checked', settings.vote).change(changeSettings);
$('#alert-time').val(settings.time).change(function() {
	let t = $(this);
	settings.time = Number(t.val());
	localStorage.setItem('settings', JSON.stringify(settings));
});

function changeSettings() {
	let t = $(this);
	settings[t.attr('id')] = !settings[t.attr('id')];
	localStorage.setItem('settings', JSON.stringify(settings));
}

$('#form').submit(() => {
	let username = $('#username').val();
	if(username) {
		if(!localStorage.getItem('username')) {
			watch(username);
			$('#message').text('계정명을 저장했어요, 알림 시작할게요!');
		}
		else {
			$('#message').text('계정명을 저장했어요, 새로고침해주세요!');
		}
		localStorage.setItem('username', username);
	}
	return false;
});

function watch(username) {
	steem.api.streamOperations((err, res) => {
		if(!err) {
			if(res[0] === 'comment') {
				if(settings.comment && res[1].parent_author === username) {
					process('comment', res[1].author, res[1]);
				}
				else if(settings.mention && res[1].json_metadata) {
					let metadata = JSON.parse(res[1].json_metadata);
					if(metadata.users && metadata.users.includes(username)) {
						process('mention', res[1].author, res[1]);
					}
				}
			}
			else if(settings.vote && res[0] === 'vote' && res[1].author === username && res[1].weight > 0) {
				process('vote', res[1].voter, res[1]);
			}
			else if(settings.follow && res[0] === 'custom_json' && res[1].id === 'follow') {
				let json = JSON.parse(res[1].json);
				if(json[1].following === username) {
					process('follow', json[1].follower, res[1]);
				}
			}
			successCount++;
		}
		else {
			console.error(err);
			if(successCount > 1) {
				successCount = 0;
				watch(username);
			}
		}
	});
}

function makeCommentURL(data) {
	if(data.json_metadata) {
		data.json_metadata = JSON.parse(data.json_metadata);
	}
	else {
		data.json_metadata = {};
	}
	let mainTag = data.json_metadata.tags ? data.json_metadata.tags[0] + '/@' : '@';
	return steemURL + '/' + mainTag + data.parent_author + '/' + data.parent_permlink + '#@'
		+ data.author + '/' + data.permlink;
}

function makeArticleURL(data) {
	return steemURL + '/@' + data.author + '/' + data.permlink;
}

function makeProfileURL(user) {
	return steemURL + '/@' + user;
}

function process(type, user, data) {
	switch(type) {
		case 'comment':
			noti(user + '님이 댓글을 달았어요.', {body: data.body}, makeCommentURL(data));
			break;
		case 'mention':
			noti(user + '님이 멘션했어요.', {body: data.body},
				data.parent_author ? makeCommentURL(data) : makeArticleURL(data));
			break;
		case 'vote':
			noti(user + '님이 업보팅 했어요.', {}, makeArticleURL(data));
			break;
		case 'follow':
			noti(user + '님이 팔로우했어요.', {}, makeProfileURL(user));
	}
}

function noti(msg, options, link) {
	if(Notification && Notification.permission === "granted") {
		let n = new Notification(msg, options);
		let timeOut;
		n.onshow = () => {
			if(settings.time) {
				timeOut = setTimeout(n.close, settings.time * 1000);
			}
		};
		n.onclick = () => {
			window.open(link, '_blank');
			n.close();
			clearTimeout(timeOut);
		};
	}
	$('#alert-area').append('<a href="' + link + '" target="_blank">' + new Date().toLocaleString() +
		' ' + msg + '</a>');
}